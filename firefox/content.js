console.log('[Newsance] Content script loaded on:', window.location.href);

function detectSite() {
  const hostname = window.location.hostname;
  
  if (hostname === 'news.ycombinator.com') {
    console.log('[Newsance] Detected Hacker News');
    return 'hackernews';
  } else if (hostname.includes('reddit.com')) {
    console.log('[Newsance] Detected Reddit');
    return 'reddit';
  }
  
  return null;
}

function extractHackerNewsUsernames() {
  const usernames = [];
  
  // Find all links with class "hnuser" - these are the username links
  const userLinks = document.querySelectorAll('a.hnuser');
  
  userLinks.forEach(link => {
    const username = link.textContent.trim();
    if (username) {
      usernames.push(username);
    }
  });
  
  return usernames;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_USERNAMES') {
    const site = detectSite();
    if (site === 'hackernews') {
      const usernames = extractHackerNewsUsernames();
      sendResponse({ usernames: usernames });
    } else {
      sendResponse({ usernames: [] });
    }
    return true;
  }
});

// Simple site detection on load
const site = detectSite();
if (site) {
  console.log(`[Newsance] Active on ${site}`);
}

// Monitor for URL changes (for single-page apps like Reddit)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (lastUrl !== window.location.href) {
    lastUrl = window.location.href;
    const newSite = detectSite();
    if (newSite) {
      console.log(`[Newsance] URL changed, still active on ${newSite}`);
    }
  }
});

observer.observe(document, { subtree: true, childList: true });