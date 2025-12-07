# Contributing to QuietNote

Thank you for your interest in contributing to QuietNote! We appreciate all contributions, from security findings to feature implementations.

## Code of Conduct

- Be respectful and inclusive
- Assume good intentions
- Constructive feedback only
- No harassment or discrimination

---

## Security First

### Reporting Security Vulnerabilities

**Do NOT open a public GitHub issue for security vulnerabilities!**

Instead:
1. Email: proxy9108@github.com with subject `[SECURITY] QuietNote v2`
2. Include: Description, affected version, proof-of-concept
3. Allow 48 hours for response
4. We'll coordinate disclosure and credit you

### Security Review Areas
- Cryptography implementation
- Key derivation logic
- Encryption/decryption flow
- PIN validation
- Message passing security
- Storage encryption

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Chrome or Firefox browser
- Git

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/QuietNote-v2.git
cd QuietNote-v2

# Install dependencies
npm install

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select QuietNote-v2 folder

# Load in Firefox
# 1. Open about:debugging
# 2. Click "This Firefox"
# 3. Click "Load Temporary Add-on"
# 4. Select manifest-firefox.json
```

### Project Structure

```
QuietNote-v2/
├── crypto/        # Encryption logic (AES-GCM, PBKDF2)
├── storage/       # Data storage layer
├── background/    # Service worker (Manifest v3)
├── ui/            # User interface components
├── content/       # Content script injection
├── styles/        # CSS styling
├── tests/         # Unit tests
└── docs/          # Documentation
```

---

## Types of Contributions

### 🐛 Bug Reports
**Before submitting:**
- [ ] Search existing issues
- [ ] Verify on latest version
- [ ] Test in another browser

**Include in report:**
- Browser and version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos

### 💡 Feature Requests
**Before submitting:**
- [ ] Check existing issues/discussions
- [ ] Ensure aligns with QuietNote philosophy
- [ ] Consider security implications

**Describe:**
- Use case
- Expected behavior
- How it benefits users
- Any alternatives considered

### 🔒 Security Improvements
We welcome security-focused contributions:
- Cipher upgrades
- Key derivation improvements
- Threat detection
- Input validation enhancements
- Message sanitization

### 🎨 UI/UX Improvements
- Design refinements
- Accessibility enhancements
- Mobile responsiveness
- Dark/light theme support
- Animation smoothness

### 📖 Documentation
- README improvements
- Code examples
- Security explanations
- API documentation
- User guides

### 🧪 Tests
- Unit tests for crypto
- Storage tests
- UI component tests
- Integration tests
- Edge case coverage

---

## Development Workflow

### 1. Fork & Clone
```bash
# Fork on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/QuietNote-v2.git
cd QuietNote-v2
```

### 2. Create Feature Branch
```bash
git checkout -b feature/amazing-feature

# Branch naming conventions:
# - feature/description (new features)
# - fix/issue-number (bug fixes)
# - docs/description (documentation)
# - security/description (security improvements)
# - test/description (testing)
```

### 3. Make Changes
```bash
# Edit files
# Test locally
# Run tests
npm test

# Check code quality
npm run lint

# Format code
npm run format
```

### 4. Commit Changes

**Commit message format:**
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `security:` Security improvement
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `style:` Code style (formatting)

**Examples:**
```
feat(settings): add master password support
fix(crypto): constant-time PIN comparison
security(storage): prevent plaintext leakage
docs(README): update installation steps
test(crypto): add AES-GCM tests
```

### 5. Push & Create PR
```bash
# Push to your fork
git push origin feature/amazing-feature

# Create Pull Request on GitHub
```

---

## Pull Request Guidelines

### Before Submitting
- [ ] All tests pass
- [ ] Code follows style guide
- [ ] No security issues
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No debug code/console.logs

### PR Description Template
```markdown
## Description
Brief description of changes

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Security improvement
- [ ] Documentation

## Testing
How to test:
1. ...
2. ...
3. ...

## Checklist
- [ ] Tested locally
- [ ] All tests pass
- [ ] Code follows guidelines
- [ ] No console.logs
- [ ] Documented changes
- [ ] No sensitive data in commits
```

### Review Process
1. Automated checks (linting, tests)
2. Manual code review
3. Security review (if applicable)
4. Merge when approved

---

## Code Style Guide

### JavaScript/TypeScript
```javascript
// ✅ Good
const encryptData = async (plaintext, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return await crypto.subtle.encrypt({...}, key, plaintext);
};

// ❌ Bad
var encryptData = (plaintext, key) => {
  return crypto.subtle.encrypt({...}, key, plaintext);
};
```

### CSS
```css
/* ✅ Good - BEM naming */
.settings-section {
  margin-bottom: 32px;
}
.settings-section__title {
  font-weight: 600;
}
.settings-section--active {
  border-left: 4px solid var(--primary);
}

/* ❌ Bad - Too generic */
.section {
  margin-bottom: 32px;
}
```

### HTML
```html
<!-- ✅ Good - Semantic -->
<button id="unlockBtn" class="btn btn-primary" aria-label="Unlock notes">
  🔓 Unlock
</button>

<!-- ❌ Bad - Div with no semantics -->
<div onclick="unlock()" class="btn-primary">Unlock</div>
```

---

## Security Checklist

When contributing security-related code:
- [ ] No hardcoded secrets
- [ ] Input validation on all user input
- [ ] Constant-time comparisons for secrets
- [ ] WebCrypto API only (no external libs)
- [ ] No debug output with sensitive data
- [ ] Error handling without leaking info
- [ ] Message validation with strict allowlist
- [ ] No eval() or dynamic code execution
- [ ] Cross-origin security verified
- [ ] Rate limiting implemented

---

## Testing Requirements

### Unit Tests
```javascript
// tests/crypto.test.js
test('PBKDF2 derivation produces unique keys', () => {
  // Test implementation
});

test('AES-GCM decryption fails with wrong PIN', () => {
  // Test implementation
});
```

### Test Coverage Goals
- Crypto module: 95%+ coverage
- Storage module: 90%+ coverage
- UI components: 80%+ coverage

### Manual Testing
```
[ ] Create note on multiple websites
[ ] Encrypt/decrypt with PIN
[ ] Auto-lock after timeout
[ ] Change all security settings
[ ] Export/import notes
[ ] Test keyboard shortcuts
[ ] Dark mode toggle
[ ] Theme switching
[ ] Mobile responsiveness
[ ] Incognito mode
```

---

## Documentation Requirements

### For New Features
- [ ] README section
- [ ] Code comments
- [ ] JSDoc comments
- [ ] Example usage
- [ ] Security implications

### Example:
```javascript
/**
 * Encrypts plaintext using AES-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {CryptoKey} key - Encryption key from PBKDF2
 * @param {Uint8Array} salt - Random salt for IV
 * @returns {Promise<EncryptionResult>} Ciphertext, IV, Salt
 * @security Uses authenticated encryption (GCM)
 */
async function encrypt(plaintext, key, salt) { }
```

---

## Release Process

### Version Numbering
- Major: Breaking changes (2.0.0)
- Minor: New features (2.1.0)
- Patch: Bug fixes (2.0.1)

### Release Checklist
- [ ] Update version in manifest.json
- [ ] Update version in package.json
- [ ] Update CHANGELOG
- [ ] Run full test suite
- [ ] Security audit
- [ ] Create GitHub release
- [ ] Update documentation
- [ ] Announce on community channels

---

## Recognition

We recognize contributors in:
- CONTRIBUTORS.md file
- GitHub releases
- Project documentation
- Annual thank you post

---

## Questions?

- Open a GitHub discussion
- Email: proxy9108@github.com
- Check existing documentation

---

## License

By contributing, you agree your code is licensed under MIT license.

---

**Thank you for contributing to QuietNote!** 🎉

Your work helps make secure notes accessible to everyone.
