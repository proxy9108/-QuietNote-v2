# Chrome Web Store Submission Guide

## Required Images

### 1. **Icon** (128x128 PNG)
- Should be your app icon
- For QuietNote: Yellow/green sticky note with lock icon
- Save as: `chrome-icon-128.png`

### 2. **Screenshots** (At least 1, max 5)
- **Size**: 1280x800 or 640x400 PNG/JPG
- **Required**: At least 1 screenshot
- **Recommended**: 3-5 screenshots showing:
  1. Settings page with security options
  2. Creating a note
  3. Note storage/vault
  4. Theme customization
  5. Lock/unlock feature

### 3. **Promotional Image** (440x280 PNG)
- Optional but recommended
- Shows the extension in action
- Used on store listing

### 4. **Marquee Image** (1400x560 PNG)
- Optional
- Featured on store home

### 5. **Tile Icon** (150x150 PNG)
- Optional
- Small square icon

## Creating Screenshots (No Design Skills Needed)

Use free tools:
- **Built-in**: Windows Snipping Tool, macOS Screenshot
- **Free online**: Canva.com, Pixlr, Photopea
- **Simple method**: Take screenshots of your extension running

### Screenshot Ideas for QuietNote

**Screenshot 1: Settings Page**
- Title: "25+ Customizable Security Options"
- Show the Settings tab with all options visible
- Highlight the security level selector

**Screenshot 2: Create Note**
- Title: "Encrypt Notes with AES-256"
- Show the note creation form
- Show color selection
- Show PIN protection option

**Screenshot 3: Vault View**
- Title: "Secure Personal Notes Vault"
- Show multiple notes stored
- Show the vault interface
- Highlight search/organization

**Screenshot 4: Themes**
- Title: "Beautiful Themes (Light, Dark, Solarized)"
- Show the same note in different themes
- Or show theme selector in settings

**Screenshot 5: Security**
- Title: "Military-Grade Encryption"
- Show the lock button
- Show the "Unlocked" state
- Show PIN entry interface

## Placeholder Images (Temporary)

Since creating perfect images takes time, you can:

### Quick Solution - Use Text Screenshots
1. Open QuietNote in Chrome
2. Take screenshots of:
   - Settings page
   - Note creation
   - Vault
3. Crop to 1280x800
4. Upload as-is (simple and honest)

### Professional Solution (Paid)
- Hire designer on Fiverr (~$50)
- Use Canva Pro templates (~$13/month)
- DIY with Figma (free account)

## Privacy Policy (Required)

QuietNote needs a privacy policy. Here's a template:

```
PRIVACY POLICY - QuietNote Browser Extension

1. DATA COLLECTION
QuietNote does NOT collect any data. The extension operates completely offline.

2. LOCAL STORAGE
All notes are stored locally on your device using your browser's storage API.
No data is sent to our servers or any third parties.

3. ENCRYPTION
Notes are encrypted locally using AES-256-GCM encryption.
Only you have access to your notes via your PIN.

4. PERMISSIONS
We request minimal permissions:
- storage: to save your notes locally
- activeTab: to know which page you're on
- scripting: to inject our extension UI
- clipboardRead/Write: for manual copy operations

5. NO TRACKING
- No analytics
- No telemetry
- No ads
- No third-party services

6. OPEN SOURCE
Our code is open source and available at:
https://github.com/proxy9108/-QuietNote-v2

You can audit the code yourself for security.

7. CONTACT
For privacy questions: proxy9108@github.com

Last Updated: December 2024
```

## Icons (Recommended Sizes)

Chrome Web Store needs these icon sizes:
- 128x128 (primary store icon)
- 48x48 (toolbar icon)
- 32x32 (favicon)
- 16x16 (favicon)

## Step-by-Step Submission

1. **Developer Console**: https://chrome.google.com/webstore/devconsole/
2. **Click "New Item"**
3. **Upload your zip**: QuietNote-v2-chrome.zip
4. **Wait for validation** (1-2 minutes)
5. **Fill in all text** (name, description, etc.)
6. **Upload images** (at least 1 screenshot + icon)
7. **Add privacy policy** (paste the text above)
8. **Set pricing**: Free
9. **Select regions**: All regions
10. **Click "Submit for Review"**

## After Submission

- **Review time**: Usually 1-3 days
- **Approval email**: You'll get notified
- **Live listing**: Your extension appears in store
- **Updates**: Use "New Release" to push updates

## If Rejected

If Chrome rejects your extension:
- You'll get an email with reasons
- Fix the issues
- Resubmit (free)
- Usually approved on second try

## Common Rejection Reasons & Fixes

| Reason | Fix |
|--------|-----|
| Deceptive description | Be honest about what it does |
| Malware concerns | Submit screenshot of code working |
| Missing privacy policy | Add the template from above |
| Poor UX | Include screenshots |
| Performance issues | Ensure no console errors |

## Tips for Success

✅ Do this:
- Be honest about features
- Include good screenshots
- Write clear description
- Provide privacy policy
- Test extension before submitting
- Use professional icon/images

❌ Don't do this:
- Claim features you don't have
- Copy other extensions' descriptions
- Use low-quality screenshots
- Include spam keywords
- Promise things you can't deliver
- Submit without testing

## Monitoring & Updates

Once live:
1. **Monitor reviews** in Developer Console
2. **Respond to user feedback**
3. **Push updates** for bugs/improvements
4. **Track analytics** (provided by store)

## Success Checklist

- [ ] Icon created (128x128 PNG)
- [ ] At least 1 screenshot (1280x800)
- [ ] Description written (4,000 chars max)
- [ ] Privacy policy prepared
- [ ] Extension tested in Chrome
- [ ] No console errors
- [ ] ZIP file ready
- [ ] All features documented
- [ ] Category selected (Productivity)
- [ ] Ready to submit!
