.PHONY: clean dist chrome firefox all

VERSION := $(shell grep '"version"' manifest.json | sed -E 's/.*"version": "([^"]+)".*/\1/')
EXTENSION_NAME := bgg-price-checker
DIST_DIR := dist
CHROME_DIST := $(DIST_DIR)/$(EXTENSION_NAME)-chrome-v$(VERSION).zip
FIREFOX_DIST := $(DIST_DIR)/$(EXTENSION_NAME)-firefox-v$(VERSION).zip

COMMON_FILES := \
	constants.js \
	content.js \
	background.js \
	popup.html \
	popup.js \
	popup.css \
	bgg-pricing-icon.png \
	browser-polyfill.min.js

all: chrome firefox

chrome: $(DIST_DIR)
	@echo "Creating Chrome distribution package: $(CHROME_DIST)"
	@zip -r $(CHROME_DIST) $(COMMON_FILES) manifest.json
	@echo "Chrome distribution package created: $(CHROME_DIST)"

firefox: $(DIST_DIR)
	@echo "Creating Firefox distribution package: $(FIREFOX_DIST)"
	@mkdir -p temp-firefox
	@cp $(COMMON_FILES) temp-firefox/
	@cp manifest-firefox.json temp-firefox/manifest.json
	@cd temp-firefox && zip -r ../$(FIREFOX_DIST) *
	@rm -rf temp-firefox
	@echo "Firefox distribution package created: $(FIREFOX_DIST)"

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

dist: all

clean:
	@echo "Cleaning dist directory..."
	@rm -rf $(DIST_DIR)
	@echo "Clean complete"

help:
	@echo "Available commands:"
	@echo "  make all     - Build both Chrome and Firefox packages"
	@echo "  make chrome  - Create Chrome distribution zip file"
	@echo "  make firefox - Create Firefox distribution zip file"
	@echo "  make dist    - Same as 'make all'"
	@echo "  make clean   - Remove all zip files"
	@echo "  make help    - Show this help message"