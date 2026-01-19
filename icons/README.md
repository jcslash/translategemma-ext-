# Extension Icons

This directory contains the icons for the TranslateGemma Chrome extension.

## Generating Icons

You can generate PNG icons from the SVG file using one of these methods:

### Method 1: Using ImageMagick (Recommended)
```bash
# Install ImageMagick if not already installed
# Ubuntu/Debian: sudo apt-get install imagemagick
# macOS: brew install imagemagick

convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### Method 2: Using Inkscape
```bash
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png
```

### Method 3: Online Tool
1. Open `icon.svg` in your browser
2. Take a screenshot or use an online SVG to PNG converter
3. Save as `icon16.png`, `icon48.png`, and `icon128.png`

### Method 4: Use the HTML Generator
1. Open `generate_icons.html` in your browser
2. Right-click each canvas and save as PNG
3. Name them `icon16.png`, `icon48.png`, and `icon128.png`

## Temporary Workaround

If you can't generate icons immediately, Chrome will use default icons. The extension will still work perfectly!
