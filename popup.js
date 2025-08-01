// Use browser API if available (Firefox), otherwise chrome (Chrome)
const api = (typeof browser !== 'undefined') ? browser : chrome;

function getDefaultSettings() {
  const locale = navigator.language || 'en-US';
  
  const localeMap = {
    'en-US': { currency: 'USD', destination: 'US' },
    'en-GB': { currency: 'GBP', destination: 'GB' },
    'de': { currency: 'EUR', destination: 'DE' },
    'de-DE': { currency: 'EUR', destination: 'DE' },
    'da': { currency: 'DKK', destination: 'DK' },
    'da-DK': { currency: 'DKK', destination: 'DK' },
    'sv': { currency: 'SEK', destination: 'SE' },
    'sv-SE': { currency: 'SEK', destination: 'SE' },
    'fr': { currency: 'EUR', destination: 'DE' },
    'fr-FR': { currency: 'EUR', destination: 'DE' },
    'it': { currency: 'EUR', destination: 'DE' },
    'it-IT': { currency: 'EUR', destination: 'DE' },
    'es': { currency: 'EUR', destination: 'DE' },
    'es-ES': { currency: 'EUR', destination: 'DE' },
    'nl': { currency: 'EUR', destination: 'DE' },
    'nl-NL': { currency: 'EUR', destination: 'DE' }
  };
  
  const settings = localeMap[locale] || localeMap[locale.split('-')[0]] || { currency: 'USD', destination: 'US' };
  return settings;
}

async function getStoredSettings() {
  const result = await api.storage.local.get(['currency', 'destination', 'hasSetDefaults', 'darkMode', 'badgeEnabled']) || {};
  
  if (!result || !result.hasSetDefaults) {
    const defaults = getDefaultSettings();
    await api.storage.local.set({
      currency: defaults.currency,
      destination: defaults.destination,
      hasSetDefaults: true,
      darkMode: false,
      badgeEnabled: true
    });
    return { ...defaults, darkMode: false, badgeEnabled: true };
  }
  
  return {
    currency: result.currency || 'USD',
    destination: result.destination || 'US',
    darkMode: result.darkMode || false,
    badgeEnabled: result.badgeEnabled !== false
  };
}

async function saveSettings(currency, destination) {
  await api.storage.local.set({ currency, destination });
}

async function getCachedPrices(gameId, currency, destination) {
  const cacheKey = `prices_${gameId}_${currency}_${destination}`;
  const result = await api.storage.local.get([cacheKey]);
  const cached = result[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
}

async function cachePrices(gameId, currency, destination, data) {
  const cacheKey = `prices_${gameId}_${currency}_${destination}`;
  await api.storage.local.set({
    [cacheKey]: {
      data: data,
      timestamp: Date.now()
    }
  });
}

async function fetchPrices(gameId, currency, destination) {
  const cached = await getCachedPrices(gameId, currency, destination);
  if (cached) {
    return cached;
  }
  
  const params = new URLSearchParams({
    eid: gameId,
    currency: currency,
    destination: destination,
    sitename: SITE_NAME,
    sort: 'SMART',
    apikey: 'feda121b-d920-490d-bf71-6980f6489040'
  });
  
  try {
    const url = `${API_BASE}/info?${params}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    await cachePrices(gameId, currency, destination, data);
    return data;
  } catch (error) {
    throw error;
  }
}

function formatPrice(price, currency) {
  const symbols = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    DKK: 'kr',
    SEK: 'kr'
  };
  
  const symbol = symbols[currency] || currency;
  const formattedPrice = parseFloat(price).toFixed(2);
  
  if (currency === 'DKK' || currency === 'SEK') {
    return `${formattedPrice} ${symbol}`;
  } else {
    return `${symbol}${formattedPrice}`;
  }
}

async function displayPrices(data) {
  const pricesList = document.getElementById('prices-list');
  pricesList.innerHTML = '';
  
  if (!data.items || data.items.length === 0) {
    pricesList.innerHTML = '<p class="no-prices">No prices found for this game.</p>';
    return;
  }
  
  const [activeTab] = await api.tabs.query({ active: true, currentWindow: true });
  const gameMatch = activeTab.url && activeTab.url.match(/boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)\//);
  const searchedBggId = gameMatch ? gameMatch[1] : null;
  
  const matchingItems = data.items.filter(item => item.external_id === searchedBggId);
  
  let selectedItem = matchingItems.find(item => 
    item.versions && item.versions.lang && item.versions.lang.includes('GB') && item.prices && item.prices.length > 0
  ) || matchingItems.find(item => item.prices && item.prices.length > 0) || matchingItems[0];
  
  if (!selectedItem) {
    selectedItem = data.items[0];
  }
  
  const gameName = selectedItem.name;
  const maxLength = 30;
  const truncatedName = gameName.length > maxLength ? gameName.substring(0, maxLength) + '...' : gameName;
  document.getElementById('game-title').textContent = `Showing prices for "${truncatedName}"`;
  
  const prices = selectedItem.prices || [];
  
  if (prices.length === 0) {
    pricesList.innerHTML = '<p class="no-prices">No prices available for this game.</p>';
    return;
  }
  
  const inStockPrices = prices.filter(price => price.stock === 'Y');
  
  if (inStockPrices.length === 0) {
    pricesList.innerHTML = '<p class="no-prices">No items currently in stock.</p>';
    return;
  }
  
  inStockPrices.forEach(price => {
    const priceEl = document.createElement('div');
    priceEl.className = 'price-item';
    priceEl.addEventListener('click', () => {
      window.open(price.link, '_blank');
    });
    
    const shopInfo = document.createElement('div');
    shopInfo.className = 'shop-info';
    
    if (price.store && price.store.id) {
      const storeLogo = document.createElement('img');
      storeLogo.className = 'store-logo';
      storeLogo.src = `https://d2qg6c07ydxh2f.cloudfront.net/shops/${price.store.id}.png`;
      storeLogo.alt = price.store.name || 'Store logo';
      storeLogo.onerror = function() { this.style.display = 'none'; };
      shopInfo.appendChild(storeLogo);
    }
    
    const stock = document.createElement('span');
    stock.className = `stock ${price.stock === 'Y' ? 'in-stock' : 'out-of-stock'}`;
    stock.textContent = price.stock === 'Y' ? 'In Stock' : 'Out of Stock';
    
    shopInfo.appendChild(stock);
    
    const priceInfo = document.createElement('div');
    priceInfo.className = 'price-info';
    
    const priceAmount = document.createElement('span');
    priceAmount.className = 'price-amount';
    priceAmount.textContent = formatPrice(price.price, data.currency);
    
    const shippingInfo = document.createElement('div');
    shippingInfo.className = 'shipping-info';
    
    const shipping = document.createElement('span');
    shipping.className = 'shipping';
    if (!price.shipping_known) {
      shipping.textContent = 'Shipping unknown';
    } else if (parseFloat(price.shipping) > 0) {
      shipping.textContent = `(${formatPrice(price.product, data.currency)} + ${formatPrice(price.shipping, data.currency)} shipping)`;
    } else {
      shipping.textContent = 'Free shipping';
    }
    shippingInfo.appendChild(shipping);
    
    if (price.country) {
      const countryTag = document.createElement('span');
      countryTag.className = 'country-tag';
      countryTag.textContent = price.country;
      shippingInfo.appendChild(countryTag);
    }
    
    priceInfo.appendChild(priceAmount);
    priceInfo.appendChild(shippingInfo);
    
    priceEl.appendChild(shopInfo);
    priceEl.appendChild(priceInfo);
    
    pricesList.appendChild(priceEl);
  });
}

function showError(message) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('no-game').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('results-header').classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('error-message').textContent = message;
  document.body.classList.remove('showing-results');
}

function showNoGame() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('results-header').classList.add('hidden');
  document.getElementById('no-game').classList.remove('hidden');
  document.body.classList.remove('showing-results');
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('prices-list').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('prices-list').classList.remove('hidden');
}

function showResults() {
  document.getElementById('error').classList.add('hidden');
  document.getElementById('no-game').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('results-header').classList.remove('hidden');
  document.body.classList.add('showing-results');
}

async function loadPrices() {
  try {
    const [activeTab] = await api.tabs.query({ active: true, currentWindow: true });
    const gameMatch = activeTab.url && activeTab.url.match(BGG_GAME_URL_PATTERN);
    
    if (!gameMatch) {
      showNoGame();
      return;
    }
    
    const gameId = gameMatch[1];
    
    if (!gameId) {
      showNoGame();
      return;
    }
    
    await api.storage.local.set({ currentGameId: gameId });
    
    showResults();
    showLoading();
    
    const settings = await getStoredSettings();
    const data = await fetchPrices(gameId, settings.currency, settings.destination);
    
    await displayPrices(data);
    hideLoading();
    
  } catch (error) {
    showError('Failed to load prices. Please try again later.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getStoredSettings();
  document.getElementById('currency').value = settings.currency;
  document.getElementById('destination').value = settings.destination;
  
  if (settings.darkMode) {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
  }
  
  if (!settings.badgeEnabled) {
    document.getElementById('badge-toggle').classList.add('disabled');
  }
  
  document.getElementById('dark-mode-toggle').addEventListener('click', async () => {
    document.documentElement.classList.toggle('dark-mode');
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    await api.storage.local.set({ darkMode: isDarkMode });
  });
  
  document.getElementById('badge-toggle').addEventListener('click', async () => {
    const button = document.getElementById('badge-toggle');
    button.classList.toggle('disabled');
    const isEnabled = !button.classList.contains('disabled');
    await api.storage.local.set({ badgeEnabled: isEnabled });
    
    const [activeTab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!isEnabled) {
      api.runtime.sendMessage({ action: 'clearBadge', tabId: activeTab.id });
    } else {
      const gameMatch = activeTab.url && activeTab.url.match(BGG_GAME_URL_PATTERN);
      if (gameMatch) {
        setTimeout(() => {
          api.runtime.sendMessage({ action: 'updateBadge', gameId: gameMatch[1], tabId: activeTab.id });
        }, 100);
      }
    }
  });
  
  loadPrices();
  
  async function handleSettingsChange() {
    const currency = document.getElementById('currency').value;
    const destination = document.getElementById('destination').value;
    await saveSettings(currency, destination);
    
    const [activeTab] = await api.tabs.query({ active: true, currentWindow: true });
    const gameMatch = activeTab.url && activeTab.url.match(BGG_GAME_URL_PATTERN);
    
    if (gameMatch && gameMatch[1]) {
      showLoading();
      const settings = await getStoredSettings();
      const data = await fetchPrices(gameMatch[1], settings.currency, settings.destination);
      await displayPrices(data);
      hideLoading();
    }
  }
  
  document.getElementById('currency').addEventListener('change', handleSettingsChange);
  document.getElementById('destination').addEventListener('change', handleSettingsChange);
});