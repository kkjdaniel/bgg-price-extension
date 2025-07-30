# BGG Price Checker

A browser extension that displays board game prices from BoardGamePrices.co.uk while browsing BoardGameGeek.

## Features

- Automatically detects when you're viewing a board game on BoardGameGeek
- Shows real-time pricing data from multiple retailers
- Displays total price including shipping costs
- Shows stock availability
- Auto-detects your region to set appropriate currency and destination
- Caches results for 1 hour to improve performance
- Supports multiple currencies (USD, GBP, EUR, DKK, SEK)

## Installation

### For Development

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the `bgg-pricing-extension` folder
6. The extension icon will appear in your toolbar

### Usage

1. Navigate to any BoardGameGeek game page (e.g., https://boardgamegeek.com/boardgame/13/catan)
2. Click the extension icon in your toolbar
3. View pricing information from various retailers
4. Click on any price to visit the retailer's page
5. Use the dropdown menus to change currency and shipping destination

## Technical Details

- **API**: Uses BoardGamePrices.co.uk plugin API
- **Caching**: Stores pricing data for 1 hour per game/currency/destination combination
- **Region Detection**: Automatically sets currency based on browser locale
- **BGG ID Extraction**: Parses game ID from BoardGameGeek URLs

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Key Files

- `content.js` - Runs on BGG pages to extract game IDs
- `popup.js` - Main logic for fetching and displaying prices
- `popup.css` - Styling for the extension popup

## Contributing

Feel free to submit issues or pull requests to improve the extension.
