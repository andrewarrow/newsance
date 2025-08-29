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

function extractRedditUsernames() {
  const data = [];
  const seenUsernames = new Set();
  
  console.log('[Newsance Reddit] Starting username extraction...');
  
  // Method 1: Find direct user links with href="/user/username/" pattern
  const userLinks = document.querySelectorAll('a[href^="/user/"]');
  console.log(`[Newsance Reddit] Method 1: Found ${userLinks.length} user links`);
  
  userLinks.forEach((link, index) => {
    const href = link.getAttribute('href');
    const match = href.match(/^\/user\/([^\/]+)\//);
    const textContent = link.textContent.trim();
    
    console.log(`[Newsance Reddit] Method 1 Link ${index}: href="${href}", text="${textContent}"`);
    
    if (match && match[1] && !seenUsernames.has(match[1])) {
      const username = match[1];
      seenUsernames.add(username);
      
      let subreddit = findSubredditContext(link);
      console.log(`[Newsance Reddit] Method 1 Added: ${username} from ${subreddit}`);
      
      data.push({
        username: username,
        site: subreddit
      });
    }
  });
  
  // Method 2: Look for username patterns next to avatars or profile icons
  // Search for elements that look like "username · time ago" pattern
  const timePatterns = document.querySelectorAll('*');
  let usernameTimeElements = [];
  
  timePatterns.forEach(el => {
    const text = el.textContent;
    // Look for patterns like "username · X min. ago" or "username · X hr. ago"
    if (text && (text.includes('min. ago') || text.includes('hr. ago') || text.includes('day ago'))) {
      usernameTimeElements.push(el);
    }
  });
  
  console.log(`[Newsance Reddit] Method 2: Found ${usernameTimeElements.length} time elements`);
  
  usernameTimeElements.forEach((el, index) => {
    const text = el.textContent.trim();
    // Extract username from patterns like "username · 29 min. ago"
    const match = text.match(/^([a-zA-Z0-9_-]{3,})\s*·\s*\d+\s*(min|hr|day)/);
    
    console.log(`[Newsance Reddit] Method 2 Element ${index}: text="${text}"`);
    
    if (match && match[1] && !seenUsernames.has(match[1])) {
      const username = match[1];
      seenUsernames.add(username);
      
      let subreddit = findSubredditContext(el);
      console.log(`[Newsance Reddit] Method 2 Added: ${username} from ${subreddit}`);
      
      data.push({
        username: username,
        site: subreddit
      });
    }
  });
  
  // Method 3: Look for clickable usernames (the ones that appear as links in the UI)
  const allElements = document.querySelectorAll('*');
  console.log(`[Newsance Reddit] Method 3: Scanning ${allElements.length} elements for username patterns`);
  
  let foundUsernameElements = 0;
  
  allElements.forEach(el => {
    // Skip if element has children - we want leaf text nodes
    if (el.children.length > 0) return;
    
    const text = el.textContent.trim();
    
    // Look for elements that contain just a username (3+ chars, alphanumeric/underscore/dash)
    if (text && /^[a-zA-Z0-9_-]{3,}$/.test(text) && !seenUsernames.has(text)) {
      // Check if this looks like it's near an avatar or in a comment context
      const nearAvatar = el.closest('[class*="avatar"], [class*="user"], [class*="author"], [class*="comment"]') ||
                         el.parentElement?.querySelector('img[alt*="avatar"], img[src*="avatar"], [class*="avatar"]');
      
      if (nearAvatar) {
        foundUsernameElements++;
        seenUsernames.add(text);
        
        let subreddit = findSubredditContext(el);
        console.log(`[Newsance Reddit] Method 3 Added: ${text} from ${subreddit}`);
        
        data.push({
          username: text,
          site: subreddit
        });
      }
    }
  });
  
  console.log(`[Newsance Reddit] Method 3: Found ${foundUsernameElements} username elements`);
  console.log(`[Newsance Reddit] Extraction complete. Found ${data.length} unique usernames:`, data.map(d => d.username));
  return data;
}

function findSubredditContext(element) {
  // Look for parent elements that might contain subreddit info
  let parent = element.closest('[data-testid*="search"], .search-result, article, .comment, [class*="search"], [class*="comment"], [class*="post"]');
  if (parent) {
    const subredditLink = parent.querySelector('a[href^="/r/"]');
    if (subredditLink) {
      const subredditMatch = subredditLink.getAttribute('href').match(/^\/r\/([^\/]+)/);
      if (subredditMatch && subredditMatch[1]) {
        return 'r/' + subredditMatch[1];
      }
    }
  }
  return 'N/A';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_USERNAMES') {
    const site = detectSite();
    if (site === 'hackernews') {
      const data = extractHackerNewsUsernames();
      sendResponse({ usernames: data });
    } else if (site === 'reddit') {
      const data = extractRedditUsernames();
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