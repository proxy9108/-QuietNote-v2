# QuietNote v2 - Build & Installation Guide

Complete instructions for building, testing, and deploying QuietNote v2.

---

## Table of Contents
1. [Development Setup](#development-setup)
2. [Loading in Browsers](#loading-in-browsers)
3. [Testing](#testing)
4. [Building for Release](#building-for-release)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: For version control
- **Browser**: Chrome 120+, Firefox 120+, or Edge 120+

### Installation

```bash
# Clone repository
git clone https://github.com/proxy9108/QuietNote-v2.git
cd QuietNote-v2

# Install dependencies
npm install

# (No external dependencies needed for core extension)
```

### Directory Structure
```
QuietNote-v2/
├── background/          # Service worker (Manifest v3)
├── content/            # Content scripts
├── crypto/             # Encryption logic
├── storage/            # Data persistence
├── styles/             # CSS files
├── ui/                 # User interface
├── tests/              # Unit tests
├── docs/               # Documentation
├── assets/             # Icons & images
├── manifest.json       # Chrome/Edge manifest
├── manifest-firefox.json # Firefox manifest
├── package.json        # NPM configuration
└── README.md           # Main documentation
```

---

## Loading in Browsers

### Chrome / Chromium / Edge

#### Method 1: Load Unpacked (Development)
```bash
# 1. Open browser DevTools:
# Chrome/Edge: chrome://extensions/ or edge://extensions/

# 2. Enable "Developer mode" (toggle in top-right)

# 3. Click "Load unpacked"

# 4. Select the QuietNote-v2 folder

# 5. Extension appears in toolbar
```

#### Method 2: Using Command Line
```bash
# Chrome
/path/to/chrome --load-extension=/path/to/QuietNote-v2

# Edge
/path/to/msedge --load-extension=/path/to/QuietNote-v2
```

#### Installation Verification
1. Check `chrome://extensions/` shows "QuietNote"
2. Click extension icon in toolbar
3. Settings page opens successfully
4. Create test note with encryption

---

### Firefox

#### Method 1: Temporary Installation
```bash
# 1. Open Firefox about:debugging

# 2. Click "This Firefox" (left sidebar)

# 3. Click "Load Temporary Add-on"

# 4. Select manifest-firefox.json

# 5. Extension loads for current session only
```

#### Method 2: Signed Installation (requires Mozilla account)
```bash
# For submitting to Mozilla Add-ons store
# Follow: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Getting_started_with_web-ext

web-ext sign --api-key=$AMO_JWT_ISSUER --api-secret=$AMO_JWT_SECRET
```

#### Installation Verification
1. Check `about:extensions` shows "QuietNote"
2. Click "Manage Extension" button
3. Verify permissions
4. Test functionality

---

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
# Crypto tests
npm run test:crypto

# Storage tests
npm run test:storage

# PIN validation tests
npm run test:pin

# Watch mode
npm run test:watch
```

### Manual Testing Checklist

#### Security Features
- [ ] PIN setup works (4-8 digits)
- [ ] PIN validation on unlock
- [ ] Auto-lock after timeout
- [ ] Lock button works (Ctrl+Shift+L)
- [ ] Notes encrypted when locked
- [ ] Cannot decrypt with wrong PIN
- [ ] Rate limiting after failed attempts

#### Note Management
- [ ] Create page note (Ctrl+Shift+N)
- [ ] Create personal note (Ctrl+Shift+V)
- [ ] Edit existing notes
- [ ] Delete notes with confirmation
- [ ] Auto-save working
- [ ] Notes persist after reload
- [ ] URL-based notes separate per domain

#### Settings
- [ ] All 5 tabs load correctly
- [ ] Security level toggles work
- [ ] Encryption toggle works
- [ ] Theme changes apply
- [ ] Color selection works
- [ ] Font size changes apply
- [ ] Transparency slider works
- [ ] Keyboard shortcuts customizable
- [ ] Settings persist after reload

#### UI/UX
- [ ] Dark mode works
- [ ] Light mode works
- [ ] Solarized mode works
- [ ] Responsive on different screen sizes
- [ ] No console errors
- [ ] Smooth animations (when enabled)
- [ ] All buttons clickable
- [ ] Tab navigation works

#### Export/Import
- [ ] Export creates valid JSON
- [ ] Import reads JSON correctly
- [ ] Notes restored after import
- [ ] Encrypted status preserved

#### Cross-Browser
- [ ] Works on Chrome 120+
- [ ] Works on Firefox 120+
- [ ] Works on Edge 120+

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Security audit
npm run security:audit
```

---

## Building for Release

### Chrome/Edge Package

```bash
# Build for Chrome
npm run build:chrome

# Output: QuietNote-v2-chrome.zip

# Contents:
# - All source files
# - manifest.json (Manifest v3)
# - Optimized for Chrome Web Store
```

### Firefox Package

```bash
# Build for Firefox
npm run build:firefox

# Output: QuietNote-v2-firefox.zip

# Contents:
# - All source files
# - manifest-firefox.json (Manifest v2)
# - Optimized for Mozilla Add-ons
```

### Manual Package Creation

#### Chrome Package
```bash
zip -r QuietNote-v2-chrome.zip . \
  -x "docs/*" \
  "tests/*" \
  ".git/*" \
  ".gitignore" \
  "manifest-firefox.json" \
  "*.md" \
  "node_modules/*"

# Verify:
unzip -l QuietNote-v2-chrome.zip | head -20
```

#### Firefox Package
```bash
# Copy manifest-firefox to manifest.json
cp manifest-firefox.json manifest.json

zip -r QuietNote-v2-firefox.zip . \
  -x "docs/*" \
  "tests/*" \
  ".git/*" \
  ".gitignore" \
  "manifest-firefox.json" \
  "*.md" \
  "node_modules/*"

# Restore original manifest
git checkout manifest.json
```

---

## Deployment

### Chrome Web Store Submission

```bash
# 1. Create/update Chrome Web Store account
#    https://chrome.google.com/webstore/devconsole/

# 2. Prepare assets:
#    - Screenshot (1280x800 or 640x400)
#    - Icon (128x128 PNG)
#    - Description (132 chars)
#    - Detailed description (4000 chars)

# 3. Upload QuietNote-v2-chrome.zip

# 4. Complete review process (1-3 days)

# 5. Published!
```

### Firefox Add-ons Submission

```bash
# 1. Create Mozilla Developer account
#    https://addons.mozilla.org/developers/

# 2. Prepare assets:
#    - Screenshots (1280x800)
#    - Icon (64x64, 128x128)
#    - Description (required, optional)
#    - Privacy policy

# 3. Zip with web-ext:
web-ext build

# 4. Submit QuietNote-v2.zip

# 5. Complete review (usually 2-7 days)

# 6. Published!
```

### Edge Add-ons Store

```bash
# Similar to Chrome Store submission
# https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview

# Use same Chrome package as Edge uses Chromium
```

---

## Distribution Methods

### Method 1: Official Store (Recommended)
- Easiest for users
- Automatic updates
- Store visibility
- Requires approval process

### Method 2: GitHub Releases
- Full control
- No approval process
- Manual updates for users
- Good for beta versions

### Method 3: Direct Distribution
- Self-hosting
- For specific audiences
- No store restrictions
- More work for users

---

## Version Management

### Updating Version

```bash
# 1. Update manifest.json
"version": "2.1.0"

# 2. Update package.json
"version": "2.1.0"

# 3. Update README.md
**Version 2.1.0** | Last Updated: [DATE]

# 4. Create CHANGELOG entry
## [2.1.0] - 2024-12-XX

# 5. Commit
git commit -m "release: version 2.1.0"

# 6. Create tag
git tag -a v2.1.0 -m "QuietNote v2.1.0"
git push origin v2.1.0

# 7. Build and upload
npm run build:chrome
npm run build:firefox
```

---

## Troubleshooting

### Extension Not Loading

**Error: "Could not load the extension from..."**

```bash
# Check manifest.json syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json')))"

# Verify required files exist:
ls background/background.js
ls ui/settings.html
ls ui/settings.js

# Clear browser cache and reload
```

**Solution**:
1. Fix JSON syntax in manifest.json
2. Ensure all required files are present
3. Reload extension in browser

---

### Service Worker Error

**Error: "Service worker failed to start"**

```bash
# Check background.js for syntax errors
node --check background/background.js

# Look for console errors:
# DevTools → Application → Service Workers
```

**Solution**:
1. Fix JavaScript syntax
2. Check for missing permissions in manifest.json
3. Verify crypto API availability

---

### Storage Errors

**Error: "Storage is not available"**

**Cause**: Chrome storage API not available
**Solution**:
1. Check if permission is in manifest.json
2. Verify running as extension (not page)
3. Check DevTools console for specific error

---

### Encryption Failing

**Error: "WebCrypto not available"**

**Cause**: Old browser or insecure context
**Solution**:
1. Verify Chrome 120+ / Firefox 120+
2. Ensure HTTPS or localhost
3. Check if running in incognito (some versions block WebCrypto)

---

### ZIP File Issues

**Error: "Archive appears to be corrupted"**

```bash
# Test ZIP integrity
unzip -t QuietNote-v2-chrome.zip

# Recreate ZIP
rm QuietNote-v2-chrome.zip
npm run build:chrome
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint
      - run: npm run security:audit
```

---

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: proxy9108@github.com
- **Docs**: See README.md and docs/ folder

---

**Last Updated**: December 2024
**Version**: 2.0.0
