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
  
  // Method 1: Find user links with href="/user/username/" pattern
  const userLinks = document.querySelectorAll('a[href^="/user/"]');
  userLinks.forEach(link => {
    const href = link.getAttribute('href');
    const match = href.match(/^\/user\/([^\/]+)\//);
    
    if (match && match[1] && !seenUsernames.has(match[1])) {
      const username = match[1];
      seenUsernames.add(username);
      
      let subreddit = findSubredditContext(link);
      data.push({
        username: username,
        site: subreddit
      });
    }
  });
  
  // Method 2: Find usernames in text content (pattern: </span></span>USERNAME</a>)
  // Look for links that contain avatar spans followed by username text
  const avatarLinks = document.querySelectorAll('a[href^="/user/"] span[avatar] ~ span, a[href^="/user/"] [avatar=""]');
  avatarLinks.forEach(avatarSpan => {
    const link = avatarSpan.closest('a[href^="/user/"]');
    if (link) {
      // Get the text content of the link, which should be the username
      const linkText = link.textContent.trim();
      
      // Extract username from href as backup
      const href = link.getAttribute('href');
      const hrefMatch = href.match(/^\/user\/([^\/]+)\//);
      const username = hrefMatch && hrefMatch[1] ? hrefMatch[1] : linkText;
      
      if (username && !seenUsernames.has(username) && username.length > 2) {
        seenUsernames.add(username);
        
        let subreddit = findSubredditContext(link);
        data.push({
          username: username,
          site: subreddit
        });
      }
    }
  });
  
  // Method 3: Fallback - search all links and extract usernames from text content
  const allLinks = document.querySelectorAll('a');
  allLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('/user/')) {
      const textContent = link.textContent.trim();
      // Only consider if text looks like a username (alphanumeric, underscores, hyphens)
      if (textContent && /^[a-zA-Z0-9_-]{3,}$/.test(textContent) && !seenUsernames.has(textContent)) {
        seenUsernames.add(textContent);
        
        let subreddit = findSubredditContext(link);
        data.push({
          username: textContent,
          site: subreddit
        });
      }
    }
  });
  
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