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