if (typeof importScripts !== 'undefined') {
  importScripts('constants.js');
}

// Use browser API if available (Firefox), otherwise chrome (Chrome)
const api = (typeof browser !== 'undefined') ? browser : chrome;
const badgeAPI = api.action || api.browserAction;

async function cleanupCache() {
  let items = {};
  try {
    items = await api.storage.local.get(null) || {};
  } catch (e) {
    console.error('Failed to get storage items:', e);
    return;
  }
  
  const cacheEntries = [];
  
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith('prices_') && value && value.timestamp) {
      cacheEntries.push({ key, timestamp: value.timestamp });
    }
  }
  
  const now = Date.now();
  
  const validEntries = cacheEntries.filter(
    entry => now - entry.timestamp < CACHE_DURATION
  );
  
  if (validEntries.length > MAX_CACHE_ITEMS) {
    validEntries.sort((a, b) => b.timestamp - a.timestamp);
    const keysToRemove = validEntries
      .slice(MAX_CACHE_ITEMS)
      .map(entry => entry.key);
    await api.storage.local.remove(keysToRemove);
  }
  
  const expiredKeys = cacheEntries
    .filter(entry => now - entry.timestamp >= CACHE_DURATION)
    .map(entry => entry.key);
  
  if (expiredKeys.length > 0) {
    await api.storage.local.remove(expiredKeys);
  }
}

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge') {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    if (request.gameId && tabId) {
      fetchPriceCount(request.gameId, tabId);
    } else if (tabId) {
      badgeAPI.setBadgeText({ text: '', tabId: tabId });
    }
  } else if (request.action === 'clearBadge') {
    badgeAPI.setBadgeText({ text: '', tabId: request.tabId });
  }
});

async function fetchPriceCount(gameId, tabId) {
  try {
    let settings = {};
    try {
      const result = await api.storage.local.get(['currency', 'destination', 'badgeEnabled']);
      settings = result || {};
    } catch (e) {
      console.error('Storage access error:', e);
    }
    
    if (settings.badgeEnabled === false) {
      badgeAPI.setBadgeText({ text: '', tabId: tabId });
      return;
    }
    
    const currency = settings.currency || 'USD';
    const destination = settings.destination || 'US';
    
    const params = new URLSearchParams({
      eid: gameId,
      currency: currency,
      destination: destination,
      sitename: SITE_NAME,
      sort: 'SMART',
      apikey: 'feda121b-d920-490d-bf71-6980f6489040'
    });
    
    const response = await fetch(`${API_BASE}/info?${params}`);
    if (response.ok) {
      const data = await response.json();
      
      const cacheKey = `prices_${gameId}_${currency}_${destination}`;
      await api.storage.local.set({
        [cacheKey]: {
          data: data,
          timestamp: Date.now()
        }
      });
      
      await cleanupCache();
      
      let inStockCount = 0;
      if (data.items && data.items.length > 0) {
        const gameMatch = data.items.find(item => item.external_id === gameId) || data.items[0];
        if (gameMatch && gameMatch.prices) {
          inStockCount = gameMatch.prices.filter(price => price.stock === 'Y').length;
        }
      }
      
      if (inStockCount > 0) {
        badgeAPI.setBadgeText({ text: inStockCount.toString(), tabId: tabId });
        badgeAPI.setBadgeBackgroundColor({ color: '#FF5100', tabId: tabId });
      } else {
        badgeAPI.setBadgeText({ text: '', tabId: tabId });
      }
    }
  } catch (error) {
    console.error('Failed to fetch price count:', error);
    badgeAPI.setBadgeText({ text: '', tabId: tabId });
  }
}

api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const gameMatch = tab.url.match(BGG_GAME_URL_PATTERN);
    if (!gameMatch) {
      badgeAPI.setBadgeText({ text: '', tabId: tabId });
    }
  }
});