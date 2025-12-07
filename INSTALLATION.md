# QuietNote v2 - Quick Installation Guide

## 🚀 Install for Development (Fastest Way)

### Chrome / Chromium / Edge

```bash
# 1. Clone repository
git clone https://github.com/proxy9108/QuietNote-v2.git
cd QuietNote-v2

# 2. Open Chrome Extensions
# Type in address bar: chrome://extensions/

# 3. Enable Developer Mode
# Toggle "Developer mode" in top-right corner

# 4. Load Extension
# Click "Load unpacked"
# Select QuietNote-v2 folder

# 5. Done! ✅
# Extension icon appears in toolbar
```

### Firefox

```bash
# 1. Clone repository
git clone https://github.com/proxy9108/QuietNote-v2.git
cd QuietNote-v2

# 2. Open Firefox Debug Page
# Type in address bar: about:debugging

# 3. Select "This Firefox"
# (Left sidebar)

# 4. Load Extension
# Click "Load Temporary Add-on"
# Select manifest-firefox.json

# 5. Done! ✅
# Extension appears in Firefox
# (Reloads when Firefox restarts)
```

---

## ⚙️ First Time Setup

1. **Click extension icon** in toolbar
2. **Open Settings** (gear icon)
3. **Set PIN**: Go to Security tab
   - Enter 4-8 digits
   - Click "Set PIN"
4. **Choose Security Level**: Select "Full Secure" (recommended)
5. **Save Settings**: Click "💾 Save Settings"
6. **Start creating notes!**

---

## 🔑 Creating Your First Note

### On Any Webpage
- Press **Ctrl+Shift+N** (Windows/Linux) or **Cmd+Shift+N** (Mac)
- Type your note
- Choose color
- Click Create

### In Personal Vault
- Press **Ctrl+Shift+V** (Windows/Linux) or **Cmd+Shift+V** (Mac)
- Go to "New Note" tab
- Create your note

---

## 🔐 Security Quick Setup

### Full Secure Setup (Recommended)
1. Settings → Security tab
2. Security Level: **Full Secure**
3. Encryption: **Enabled** ✓
4. Require PIN: **Checked** ✓
5. Auto-Lock Timer: **5 minutes** (or your preference)
6. Click **Save Settings**

### For Relaxed Security
1. Settings → Security tab
2. Security Level: **Medium Security**
3. PIN: Optional (disable if you want)
4. Encryption: **Enabled** ✓
5. Auto-Lock: **Optional**

### NOT Recommended
⚠️ Avoid "No Security" mode unless testing

---

## 🎨 Customization

### Theme
Settings → Display tab → Theme dropdown

### Note Colors
Settings → Display tab → Default Note Color

### Font & Size
Settings → Display tab → Font Size dropdown

### Keyboard Shortcuts
Settings → Shortcuts tab → Customize all shortcuts

---

## 📚 Full Documentation

- **README.md** - Feature overview & architecture
- **docs/THREAT-MODEL.md** - Security analysis
- **docs/BUILD.md** - Building & deployment
- **CONTRIBUTING.md** - For contributors
- **LICENSE** - MIT License

---

## 🆘 Troubleshooting

### Extension Won't Load?
```bash
# Check manifest.json syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json')))"

# Look for errors in DevTools
# Right-click extension → Options → Console
```

### PIN Forgotten?
⚠️ **Cannot be recovered** (by design for security)
- Clear all notes: Settings → About → Clear All Notes
- Create new PIN: Settings → Security → Set PIN

### Notes Won't Save?
1. Check lock icon (unlocked = encrypted)
2. Check browser storage isn't full
3. Try exporting to see if notes exist

### Extension Missing from Toolbar?
1. Click extension puzzle icon
2. Find "QuietNote"
3. Click pin icon to show in toolbar

---

## 🔄 Update Extension

### From Development Version
```bash
cd QuietNote-v2
git pull origin main
# Reload extension in browser
```

### From Store
Extensions update automatically (Chrome Store)

---

## 📦 Backup Your Notes

### Export
1. Settings tab → About section
2. Click **"📥 Export All Notes"**
3. Save JSON file to safe location

### Restore
1. Settings tab → About section
2. Click **"📤 Import Notes"**
3. Select JSON file
4. Notes imported! ✅

---

## 🔒 Default PIN Setup (for testing)

If you want to test without setting PIN:
1. Security Level: **Medium Security**
2. Require PIN: **Uncheck**
3. Encryption: **Keep enabled** (recommended)

---

## 💬 Need Help?

- **GitHub Issues**: https://github.com/proxy9108/QuietNote-v2/issues
- **Discussions**: https://github.com/proxy9108/QuietNote-v2/discussions
- **Email**: proxy9108@github.com

---

## ✅ You're Ready!

You now have QuietNote running locally with:
- ✅ AES-256 encryption
- ✅ PIN protection
- ✅ Auto-lock functionality
- ✅ Custom settings
- ✅ Full privacy (offline-only)

**Start taking secure notes!** 📝🔐

---

**Version**: 2.0.0
**Last Updated**: December 2024
