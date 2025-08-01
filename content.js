// Use browser API if available (Firefox), otherwise chrome (Chrome)
const api = (typeof browser !== 'undefined') ? browser : chrome;

function extractGameId() {
  const url = window.location.href;
  const match = url.match(BGG_GAME_URL_PATTERN);
  return match ? match[1] : null;
}

async function initialiseExtension() {
  const gameId = extractGameId();
  
  if (gameId) {
    api.storage.local.set({ currentGameId: gameId });
    
    const settings = await api.storage.local.get(['badgeEnabled']);
    if (settings.badgeEnabled !== false) {
      api.runtime.sendMessage({ action: 'updateBadge', gameId: gameId });
    }
  } else {
    api.runtime.sendMessage({ action: 'updateBadge', gameId: null });
  }
}

initialiseExtension();