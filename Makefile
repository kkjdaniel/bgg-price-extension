.PHONY: clean dist

VERSION := $(shell grep '"version"' manifest.json | sed -E 's/.*"version": "([^"]+)".*/\1/')
EXTENSION_NAME := bgg-price-checker
DIST_FILE := $(EXTENSION_NAME)-v$(VERSION).zip

EXTENSION_FILES := \
	manifest.json \
	content.js \
	popup.html \
	popup.js \
	popup.css \
	bgg-pricing-icon.png \
	bgg-pricing-icon-small.png \
	browser-polyfill.min.js

dist:
	@echo "Creating distribution package: $(DIST_FILE)"
	@zip -r $(DIST_FILE) $(EXTENSION_FILES)
	@echo "Distribution package created: $(DIST_FILE)"

clean:
	@echo "Removing all zip files..."
	@rm -f *.zip
	@echo "Clean complete"

help:
	@echo "Available commands:"
	@echo "  make dist  - Create distribution zip file"
	@echo "  make clean - Remove all zip files"
	@echo "  make help  - Show this help message"