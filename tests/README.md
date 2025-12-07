# QuietNote Test Suite

This directory contains tests for the QuietNote v2 extension.

## Migration Tests

### Quick Start - Manual Browser Testing

**Recommended for immediate validation:**

1. Open `migration-manual-test.html` in your browser:
   ```bash
   open tests/migration-manual-test.html
   # or navigate to file:///path/to/tests/migration-manual-test.html
   ```

2. Run the test suite:
   - Click "Run All Tests" to execute all migration tests
   - Use "Setup Old Data" to populate storage with old schema notes
   - Use "View Storage" to inspect current storage state
   - Use "Clear Storage" to reset before testing

3. Expected Results:
   - **Test 1: Fresh Install** - Verifies clean state
   - **Test 2: Plaintext Migration** - Validates schema transformation
   - **Test 3: URL Normalization** - Confirms URL handling

### Node.js Testing (When TypeScript is compiled)

```bash
# Run migration tests
npm run test:migration

# Run all tests
npm test

# Run specific test suites
npm run test:crypto
npm run test:storage
npm run test:pin
```

## Test Coverage

### Current Status

✅ **Migration Tests** (3 test suites, 15+ assertions)
- Fresh install validation
- Old schema → new schema transformation
- URL normalization (query params, hash, port removal)
- Color normalization (named colors → hex)
- Default position/size application
- Metadata preservation (tags, pinned, encrypted flag)
- Corrupt note handling (graceful failure)

⚠️ **Pending Tests**
- Crypto module (AES-256-GCM, PBKDF2)
- Storage module (encrypt/decrypt round-trips)
- PIN validation (rate limiting, lockout)
- Integration tests (full workflows)

## Test Files

| File | Purpose | Status |
|------|---------|--------|
| `migration-manual-test.html` | Browser-based migration testing | ✅ Ready |
| `migration.test.js` | Node.js migration tests | ⚠️ Needs TS compilation |
| `crypto.test.js` | Crypto module tests | ❌ Not created |
| `storage.test.js` | Storage module tests | ❌ Not created |
| `pin-validation.test.js` | PIN validation tests | ❌ Not created |

## Migration Test Scenarios

### Scenario 1: Fresh Install
- **Input:** Empty storage
- **Expected:** No notes, no errors, ready for first use
- **Validates:** Clean slate initialization

### Scenario 2: Old Schema Plaintext Notes
- **Input:** Notes with `url` field, named colors, no position/size
- **Expected:** All notes migrated to new schema with defaults applied
- **Validates:**
  - `url` → `pageURL` transformation
  - Color normalization
  - Default position/size injection
  - `masked` field defaulting to `false`
  - Metadata separation (tags, pinned)

### Scenario 3: Old Schema Encrypted Notes
- **Input:** Notes with `encrypted: true` and `encryptionMetadata`
- **Expected:** Metadata preserved, no double-encryption
- **Validates:**
  - Encryption metadata moved to `_metadata.contentEncryptionMetadata`
  - No re-encryption of already encrypted content
  - Title encryption metadata added separately

### Scenario 4: URL Normalization
- **Input:** URLs with query params, hashes, custom ports
- **Expected:** Normalized to `protocol://host/path` format
- **Test Cases:**
  - `https://example.com/page?q=1#hash` → `https://example.com/page`
  - `http://example.com/page` → `http://example.com/page`
  - `https://example.com:443/page` → `https://example.com/page`
  - `invalid-url` → `invalid-url` (preserved as-is)

### Scenario 5: Corrupt Note Handling
- **Input:** Notes missing required fields (id, createdAt, updatedAt)
- **Expected:** Errors logged, notes skipped, original data preserved
- **Validates:**
  - Graceful failure (no crash)
  - Error export to JSON file
  - Partial migration success

## Manual Testing Checklist

Before marking migration as production-ready, verify:

- [ ] Fresh install works without errors
- [ ] Old plaintext notes migrate correctly
- [ ] Old encrypted notes preserve encryption metadata
- [ ] URLs are normalized consistently
- [ ] Corrupt notes are handled gracefully
- [ ] No data loss during migration
- [ ] Migration is idempotent (running twice doesn't break data)
- [ ] Migration flag prevents duplicate runs
- [ ] Error export works when failures occur

## Running Tests in Extension Context

To test migration in actual extension environment:

1. Load extension in Chrome:
   ```
   chrome://extensions → Load unpacked → select QuietNote-v2 folder
   ```

2. Manually seed old data:
   - Open DevTools → Console
   - Run:
     ```js
     chrome.storage.local.set({
       'note:note-001': {
         id: 'note-001',
         title: 'Test',
         content: 'Content',
         color: 'yellow',
         createdAt: Date.now(),
         updatedAt: Date.now(),
         encrypted: false
       }
     });
     ```

3. Trigger migration:
   - Import migration module in background.js
   - Call `autoMigrate()` on extension load
   - Check console for migration logs

4. Verify results:
   ```js
   chrome.storage.local.get(null, data => console.log(data));
   ```

## Test Data Examples

### Old Schema Note (Plaintext)
```json
{
  "id": "note-001",
  "title": "Meeting Notes",
  "content": "Discuss Q4 roadmap",
  "url": "https://example.com/meetings",
  "color": "yellow",
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000,
  "encrypted": false,
  "tags": ["work", "q4"],
  "pinned": true
}
```

### New Schema Note (After Migration)
```json
{
  "id": "note-001",
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000,
  "title": "Meeting Notes",
  "content": "Discuss Q4 roadmap",
  "color": "#FFF9E6",
  "position": { "x": 1600, "y": 20 },
  "size": { "width": 300, "height": 200 },
  "pageURL": "https://example.com/meetings",
  "masked": false,
  "_metadata": {
    "tags": ["work", "q4"],
    "pinned": true,
    "encrypted": false
  }
}
```

## Next Steps After Migration Validation

1. ✅ Confirm all migration tests pass
2. Update `background.js` to use new Note interface
3. Update `content.js` to create notes with new schema
4. Update `popup.js` to display notes with position/size
5. Implement note dragging/resizing using position/size fields
6. Add visual masking support using `masked` field
7. Create crypto/storage/PIN unit tests

## Troubleshooting

**Tests fail with "cannot read property of undefined"**
- Ensure TypeScript files are compiled before running Node tests
- Use `migration-manual-test.html` for immediate testing without compilation

**Migration doesn't run in extension**
- Check console for errors
- Verify `autoMigrate()` is called in background.js startup
- Ensure migration flag isn't already set

**Data corruption after migration**
- Export error log using `MigrationManager.exportErrors()`
- Check original data preservation in error export
- Review migration logic for specific note type
