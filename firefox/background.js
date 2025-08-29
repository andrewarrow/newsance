console.log('[Newsance] Background script loaded');

// Rate limiting queue for user data requests
const userDataQueue = [];
const userDataCache = new Map();
const REQUEST_DELAY = 2000; // 2 seconds between requests
let isProcessingQueue = false;

// Listen for messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_USER_DATA') {
    fetchUserData(message.usernames);
    sendResponse({ status: 'started' });
    return true;
  }
});

async function fetchUserData(usernames) {
  for (const username of usernames) {
    // Check cache first
    if (userDataCache.has(username)) {
      // Send cached data immediately
      broadcastUserData(username, userDataCache.get(username));
      continue;
    }
    
    // Add to queue for processing
    userDataQueue.push(username);
  }
  
  // Start processing queue if not already running
  if (!isProcessingQueue) {
    processUserDataQueue();
  }
}

async function processUserDataQueue() {
  if (userDataQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  const username = userDataQueue.shift();
  
  try {
    const userInfo = await fetchSingleUserData(username);
    userDataCache.set(username, userInfo);
    
    // Broadcast update to all listeners (popup)
    broadcastUserData(username, userInfo);
    
  } catch (error) {
    console.error(`Failed to fetch data for ${username}:`, error);
    const errorInfo = { username, karma: 'Error', created: 'Error' };
    userDataCache.set(username, errorInfo);
    
    broadcastUserData(username, errorInfo);
  }
  
  // Wait before processing next request
  setTimeout(processUserDataQueue, REQUEST_DELAY);
}

function broadcastUserData(username, userInfo) {
  // Send message to all extension contexts (popup, content scripts, etc.)
  chrome.runtime.sendMessage({
    type: 'USER_DATA_UPDATE',
    username,
    userInfo
  }).catch(() => {
    // Ignore errors if popup is closed
  });
}

async function fetchSingleUserData(username) {
  const response = await fetch(`https://news.ycombinator.com/user?id=${username}`);
  const html = await response.text();
  
  // Parse the HTML to extract karma and created date
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let karma = 'N/A';
  let created = 'N/A';
  
  // Find karma and created date from the table structure
  const rows = doc.querySelectorAll('tbody tr');
  
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const label = cells[0].textContent.trim();
      if (label === 'karma:') {
        karma = cells[1].textContent.trim();
      } else if (label === 'created:') {
        const link = cells[1].querySelector('a');
        if (link) {
          created = link.textContent.trim();
        }
      }
    }
  }
  
  return { username, karma, created };
}