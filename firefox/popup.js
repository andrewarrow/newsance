document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    const siteDisplay = document.getElementById('siteDisplay');
    
    if (url.includes('news.ycombinator.com')) {
      siteDisplay.textContent = 'Hacker News';
    } else if (url.includes('reddit.com')) {
      siteDisplay.textContent = 'Reddit';
    } else {
      siteDisplay.textContent = 'n/a';
    }
  });
});