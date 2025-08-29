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
        } else {
          usernamesContainer.innerHTML = '<div class="no-data">No usernames found</div>';
        }
      });
    } else if (url.includes('reddit.com')) {
      siteDisplay.textContent = 'Reddit';
      usernamesContainer.innerHTML = '<div class="no-data">Reddit support coming soon</div>';
    } else {
      siteDisplay.textContent = 'n/a';
      usernamesContainer.innerHTML = '<div class="no-data">Visit Hacker News to see usernames</div>';
    }
  });
});

function displayUsernames(usernames) {
  const usernamesContainer = document.getElementById('usernames-container');
  
  let tableHtml = '<table class="usernames-table">';
  tableHtml += '<thead><tr><th>Username</th></tr></thead><tbody>';
  
  usernames.forEach(username => {
    tableHtml += `<tr><td>${username}</td></tr>`;
  });
  
  tableHtml += '</tbody></table>';
  usernamesContainer.innerHTML = tableHtml;
}