const API_BASE = 'https://boardgameprices.co.uk/api';
const SITE_NAME = 'bgg-price-checker-extension';
const CACHE_DURATION = 60 * 60 * 1000;

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
  const result = await chrome.storage.local.get(['currency', 'destination', 'hasSetDefaults']);
  
  if (!result.hasSetDefaults) {
    const defaults = getDefaultSettings();
    await chrome.storage.local.set({
      currency: defaults.currency,
      destination: defaults.destination,
      hasSetDefaults: true
    });
    return defaults;
  }
  
  return {
    currency: result.currency || 'USD',
    destination: result.destination || 'US'
  };
}

async function saveSettings(currency, destination) {
  await chrome.storage.local.set({ currency, destination });
}

async function getCachedPrices(gameId, currency, destination) {
  const cacheKey = `prices_${gameId}_${currency}_${destination}`;
  const result = await chrome.storage.local.get([cacheKey]);
  const cached = result[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
}

async function cachePrices(gameId, currency, destination, data) {
  const cacheKey = `prices_${gameId}_${currency}_${destination}`;
  await chrome.storage.local.set({
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
    sort: 'SMART'
  });
  
  try {
    console.log('Fetching prices for BGG ID:', gameId);
    const url = `${API_BASE}/info?${params}`;
    console.log('API URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    await cachePrices(gameId, currency, destination, data);
    return data;
  } catch (error) {
    console.error('Error fetching prices:', error);
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
  
  const result = await chrome.storage.local.get(['currentGameId']);
  const searchedBggId = result.currentGameId;
  
  const matchingItems = data.items.filter(item => item.external_id === searchedBggId);
  
  let selectedItem = matchingItems.find(item => 
    item.versions && item.versions.lang && item.versions.lang.includes('GB') && item.prices && item.prices.length > 0
  ) || matchingItems.find(item => item.prices && item.prices.length > 0) || matchingItems[0];
  
  if (!selectedItem) {
    selectedItem = data.items[0];
  }
  
  console.log('BGG ID searched:', searchedBggId);
  console.log('Selected item:', selectedItem);
  console.log('All items:', data.items.map(item => ({ 
    name: item.name, 
    id: item.id, 
    external_id: item.external_id, 
    lang: item.versions?.lang, 
    priceCount: item.prices?.length || 0 
  })));
  
  document.getElementById('game-title').textContent = selectedItem.name;
  
  const prices = selectedItem.prices || [];
  
  if (prices.length === 0) {
    pricesList.innerHTML = '<p class="no-prices">No prices available for this game.</p>';
    return;
  }
  
  prices.forEach(price => {
    const priceEl = document.createElement('div');
    priceEl.className = 'price-item';
    
    const shopInfo = document.createElement('div');
    shopInfo.className = 'shop-info';
    
    const shopName = document.createElement('a');
    shopName.href = price.link;
    shopName.target = '_blank';
    shopName.className = 'shop-name';
    shopName.textContent = `Shop in ${price.country}`;
    
    const stock = document.createElement('span');
    stock.className = `stock ${price.stock === 'Y' ? 'in-stock' : 'out-of-stock'}`;
    stock.textContent = price.stock === 'Y' ? 'In Stock' : 'Out of Stock';
    
    shopInfo.appendChild(shopName);
    shopInfo.appendChild(stock);
    
    const priceInfo = document.createElement('div');
    priceInfo.className = 'price-info';
    
    const priceAmount = document.createElement('span');
    priceAmount.className = 'price-amount';
    priceAmount.textContent = formatPrice(price.price, data.currency);
    
    const shipping = document.createElement('span');
    shipping.className = 'shipping';
    if (!price.shipping_known) {
      shipping.textContent = 'Shipping unknown';
    } else if (parseFloat(price.shipping) > 0) {
      shipping.textContent = `(${formatPrice(price.product, data.currency)} + ${formatPrice(price.shipping, data.currency)} shipping)`;
    } else {
      shipping.textContent = 'Free shipping';
    }
    
    priceInfo.appendChild(priceAmount);
    priceInfo.appendChild(shipping);
    
    priceEl.appendChild(shopInfo);
    priceEl.appendChild(priceInfo);
    
    pricesList.appendChild(priceEl);
  });
}

function showError(message) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('no-game').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('error-message').textContent = message;
}

function showNoGame() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('no-game').classList.remove('hidden');
}

function showLoading() {
  document.getElementById('no-game').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('loading').classList.remove('hidden');
}

function showResults() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('no-game').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');
}

async function loadPrices() {
  showLoading();
  
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isGamePage = activeTab.url && activeTab.url.match(/boardgamegeek\.com\/boardgame\/\d+\//);
    
    if (!isGamePage) {
      showNoGame();
      return;
    }
    
    const result = await chrome.storage.local.get(['currentGameId']);
    const gameId = result.currentGameId;
    
    if (!gameId) {
      showNoGame();
      return;
    }
    
    const settings = await getStoredSettings();
    const data = await fetchPrices(gameId, settings.currency, settings.destination);
    
    await displayPrices(data);
    showResults();
    
  } catch (error) {
    showError('Failed to load prices. Please try again later.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getStoredSettings();
  document.getElementById('currency').value = settings.currency;
  document.getElementById('destination').value = settings.destination;
  
  loadPrices();
  
  document.getElementById('currency').addEventListener('change', async (e) => {
    const destination = document.getElementById('destination').value;
    await saveSettings(e.target.value, destination);
    loadPrices();
  });
  
  document.getElementById('destination').addEventListener('change', async (e) => {
    const currency = document.getElementById('currency').value;
    await saveSettings(currency, e.target.value);
    loadPrices();
  });
});