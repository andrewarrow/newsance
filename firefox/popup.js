let userDataMap = new Map(); // Store user data as it comes in

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    const siteDisplay = document.getElementById('siteDisplay');
    const usernamesContainer = document.getElementById('usernames-container');
    
    if (url.includes('news.ycombinator.com')) {
      siteDisplay.textContent = 'Hacker News';
      
      // Send message to content script to get usernames
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_USERNAMES' }, (response) => {
        if (response && response.usernames && response.usernames.length > 0) {
          displayUsernames(response.usernames);
          // Start fetching user data in background
          fetchUserData(response.usernames);
        } else {
          usernamesContainer.innerHTML = '<div class="no-data">No usernames found</div>';
        }
      });
    } else if (url.includes('reddit.com')) {
      siteDisplay.textContent = 'Reddit';
      
      // Send message to content script to get usernames
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_USERNAMES' }, (response) => {
        if (response && response.usernames && response.usernames.length > 0) {
          displayUsernames(response.usernames);
          // For Reddit, we show subreddit instead of karma/created for now
          displayRedditTable();
        } else {
          usernamesContainer.innerHTML = '<div class="no-data">No usernames found on this Reddit page</div>';
        }
      });
    } else {
      siteDisplay.textContent = 'n/a';
      usernamesContainer.innerHTML = '<div class="no-data">Visit Hacker News or Reddit to see usernames</div>';
    }
  });
});

function fetchUserData(data) {
  const usernames = data.map(item => typeof item === 'string' ? item : item.username);
  
  // Initialize user data map with basic info
  data.forEach(item => {
    const username = typeof item === 'string' ? item : item.username;
    const site = typeof item === 'string' ? 'N/A' : item.site;
    userDataMap.set(username, {
      username,
      site,
      karma: 'Loading...',
      created: 'Loading...'
    });
  });
  
  // Listen for updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'USER_DATA_UPDATE') {
      const userData = userDataMap.get(message.username);
      if (userData) {
        userData.karma = message.userInfo.karma;
        userData.created = message.userInfo.created;
        updateTable();
      }
    } else if (message.type === 'NEW_USERNAMES_DETECTED') {
      // Handle new usernames detected from infinite scroll
      console.log(`[Newsance Popup] Received ${message.usernames.length} new usernames:`, message.usernames.map(u => u.username));
      addNewUsernames(message.usernames);
    }
  });
  
  // Request user data from background script
  chrome.runtime.sendMessage({
    type: 'FETCH_USER_DATA',
    usernames: usernames
  });
  
  // Update table with loading state
  updateTable();
}

function displayUsernames(data) {
  data.forEach(item => {
    const username = typeof item === 'string' ? item : item.username;
    const site = typeof item === 'string' ? 'N/A' : item.site;
    userDataMap.set(username, {
      username,
      site,
      karma: 'N/A',
      created: 'N/A'
    });
  });
  
  updateTable();
}

function updateTable() {
  const usernamesContainer = document.getElementById('usernames-container');
  
  let tableHtml = '<table class="usernames-table">';
  tableHtml += '<thead><tr><th>Username</th><th>Site</th><th>Karma</th><th>Created</th></tr></thead><tbody>';
  
  userDataMap.forEach(userData => {
    tableHtml += `<tr>
      <td>${userData.username}</td>
      <td>${userData.site}</td>
      <td>${userData.karma}</td>
      <td>${userData.created}</td>
    </tr>`;
  });
  
  tableHtml += '</tbody></table>';
  usernamesContainer.innerHTML = tableHtml;
}

function displayRedditTable() {
  const usernamesContainer = document.getElementById('usernames-container');
  
  let tableHtml = '<table class="usernames-table">';
  tableHtml += '<thead><tr><th>Username</th><th>Subreddit</th></tr></thead><tbody>';
  
  userDataMap.forEach(userData => {
    tableHtml += `<tr>
      <td>${userData.username}</td>
      <td>${userData.site}</td>
    </tr>`;
  });
  
  tableHtml += '</tbody></table>';
  usernamesContainer.innerHTML = tableHtml;
}

function addNewUsernames(newUsernamesData) {
  // Get current tab URL to determine site type
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    let isHackerNews = url && url.includes('news.ycombinator.com');
    
    newUsernamesData.forEach(item => {
      const username = typeof item === 'string' ? item : item.username;
      const site = typeof item === 'string' ? 'N/A' : item.site;
      
      // Skip if we already have this username
      if (userDataMap.has(username)) {
        return;
      }
      
      // Add to our data map
      if (isHackerNews) {
        // For Hacker News, initialize with loading state for karma/created
        userDataMap.set(username, {
          username,
          site,
          karma: 'Loading...',
          created: 'Loading...'
        });
        
        // Request user data for new username
        chrome.runtime.sendMessage({
          type: 'FETCH_USER_DATA',
          usernames: [username]
        });
      } else {
        // For Reddit, just show username and subreddit
        userDataMap.set(username, {
          username,
          site
        });
      }
    });
    
    // Update the table to show new usernames
    if (isHackerNews) {
      updateTable();
    } else {
      displayRedditTable();
    }
    
    console.log(`[Newsance Popup] Added ${newUsernamesData.length} new usernames. Total: ${userDataMap.size}`);
  });
}