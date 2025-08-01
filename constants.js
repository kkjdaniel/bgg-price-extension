const API_BASE = 'https://boardgameprices.co.uk/api';
const SITE_NAME = 'bgg-price-checker-extension';
const CACHE_DURATION = 60 * 60 * 1000;
const MAX_CACHE_ITEMS = 20;
const BGG_GAME_URL_PATTERN = /boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)\//;