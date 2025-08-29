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
  const data = [];
  
  // Find all submission rows
  const submissions = document.querySelectorAll('tr.athing');
  
  submissions.forEach(submission => {
    // Find the next sibling tr that contains the subtext with username
    const subtextRow = submission.nextElementSibling;
    if (!subtextRow) return;
    
    const userLink = subtextRow.querySelector('a.hnuser');
    if (!userLink) return;
    
    const username = userLink.textContent.trim();
    
    // Find the site information in the current submission row
    const titleLine = submission.querySelector('.titleline');
    let site = '';
    
    if (titleLine) {
      const siteStr = titleLine.querySelector('.sitestr');
      if (siteStr) {
        site = siteStr.textContent.trim();
      }
    }
    
    if (username) {
      data.push({
        username: username,
        site: site || 'N/A'
      });
    }
  });
  
  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_USERNAMES') {
    const site = detectSite();
    if (site === 'hackernews') {
      const data = extractHackerNewsUsernames();
      sendResponse({ usernames: data });
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