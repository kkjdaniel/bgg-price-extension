// Firefox compatibility
if (typeof browser !== 'undefined' && typeof chrome === 'undefined') {
  window.chrome = browser;
}

let currentGameId = null;

function extractGameId() {
  const url = window.location.href;
  const match = url.match(/\/boardgame(?:expansion)?\/(\d+)\//);
  return match ? match[1] : null;
}

function updateGameId() {
  const gameId = extractGameId();
  if (gameId !== currentGameId) {
    currentGameId = gameId;
    chrome.storage.local.set({ currentGameId: gameId });
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith('prices_'));
      chrome.storage.local.remove(keysToRemove);
    });
  }
}

updateGameId();

const observer = new MutationObserver(() => {
  updateGameId();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

window.addEventListener('popstate', updateGameId);

const pushState = history.pushState;
history.pushState = function() {
  pushState.apply(history, arguments);
  updateGameId();
};