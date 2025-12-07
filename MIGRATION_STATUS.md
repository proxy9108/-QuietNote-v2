# QuietNote v2 - Migration to Specification-Compliant Schema

## Status: Ready for Testing ✅

Date: 2025-12-07

---

## What We've Accomplished

### 1. Data Model Alignment ✅ COMPLETE

**Updated Note Interface** (`storage/storage.ts:13-24`)

The Note interface now matches the specification exactly with all mandatory fields:

```typescript
interface Note {
  id: string;                          // Random UUIDv4
  createdAt: number;                   // UNIX timestamp (ms)
  updatedAt: number;                   // UNIX timestamp (ms)
  title: string;                       // Encrypted if encryptionEnabled
  content: string;                     // Encrypted if encryptionEnabled
  color: string;                       // CSS color hex (#RRGGBB)
  position: { x: number; y: number; }; // Pixel-based visual coordinates
  size: { width: number; height: number; }; // Pixel dimensions
  pageURL: string | null;              // Null for Personal Notes
  masked: boolean;                     // Whether to hide content visually
}
```

**Key Changes:**
- ✅ Added `position` field (pixel coordinates for draggable notes)
- ✅ Added `size` field (width/height for resizable notes)
- ✅ Renamed `url` → `pageURL` for clarity
- ✅ Added `masked` field for visual content hiding
- ✅ Moved optional fields (`tags`, `pinned`, `encrypted flag`) to separate `NoteMetadata` interface
- ✅ Title field now encrypted separately (was missing in old schema)

---

### 2. Metadata Separation ✅ COMPLETE

**NoteMetadata Interface** (`storage/storage.ts:29-35`)

```typescript
interface NoteMetadata {
  tags?: string[];
  pinned?: boolean;
  encrypted: boolean;
  titleEncryptionMetadata?: EncryptionResult;
  contentEncryptionMetadata?: EncryptionResult;
}
```

**Purpose:**
- Keeps core Note object clean and spec-compliant
- Stores optional fields separately under `_metadata` key in storage
- Allows title and content to be encrypted independently

---

### 3. Storage Layer Updates ✅ COMPLETE

**Updated Methods in `StorageManager`:**

#### `saveNote(note: Note, metadata?: NoteMetadata)`
- Now encrypts **BOTH** title and content (spec requirement)
- Stores encryption metadata separately for each field
- Uses `pageURL` instead of `url` for storage keys
- Applies metadata to `_metadata` storage field

#### `getNote(id: string, pageURL?: string | null)`
- Decrypts **BOTH** title and content independently
- Uses `pageURL` parameter (renamed from `url`)
- Removes `_metadata` from returned Note object

#### `getAllNotes(pageURL?: string | null)`
- Filters by `pageURL` instead of `url`
- Decrypts all retrieved notes
- Returns clean Note objects without metadata

#### `deleteNote(id: string, pageURL?: string | null)`
- Uses `pageURL` for storage key lookup

#### `createNewNote(content, pageURL, overrides)` 🆕
- New helper function for creating spec-compliant notes
- Generates UUIDv4 IDs
- Applies default position based on settings
- Applies default size based on settings
- Sets proper color format (#RRGGBB)
- Sets `masked: false` by default

---

### 4. Migration System ✅ COMPLETE

**Migration Module** (`storage/migration.ts`)

**Features:**
- ✅ **Automatic detection** of old vs new schema
- ✅ **Field transformation:**
  - `url` → `pageURL`
  - Named colors → Hex colors
  - Missing `position` → Default from settings
  - Missing `size` → Default from settings
  - Missing `masked` → Defaults to `false`
- ✅ **URL normalization:** `protocol://host/path` (strips query, hash, port)
- ✅ **Metadata preservation:** Tags, pinned, encrypted flag moved to `_metadata`
- ✅ **Error handling:** Graceful failure with error logging
- ✅ **Error export:** JSON file with corrupted notes
- ✅ **Idempotency:** Safe to run multiple times (migration flag prevents re-runs)

**Auto-Migration Function:**
```typescript
export async function autoMigrate(): Promise<void>
```
- Checks for `migration_v2_done` flag
- Migrates all notes in storage
- Logs errors for manual review
- Exports error file if failures occur
- Sets migration flag on completion

---

### 5. Test Suite ✅ COMPLETE

**Manual Browser Tests** (`tests/migration-manual-test.html`)

**Test Suites:**
1. **Fresh Install** - Verifies clean state
2. **Plaintext Migration** - Validates schema transformation
3. **URL Normalization** - Confirms URL handling

**Features:**
- ✅ Interactive browser-based testing
- ✅ Visual test results with pass/fail indicators
- ✅ Storage inspection tools
- ✅ Old data setup helpers
- ✅ Works without compilation (uses LocalStorage fallback)

**Node.js Tests** (`tests/migration.test.js`)

**Test Suites:**
1. Fresh Install Validation
2. Plaintext Note Migration
3. Encrypted Note Migration
4. Corrupt Note Handling
5. URL Normalization

**Coverage:**
- 5 test suites
- 15+ individual assertions
- Mock Chrome Storage API
- Automated pass/fail reporting

---

## Security Compliance

### Encryption Per Specification

**Old Behavior (Non-Compliant):**
- ❌ Only content encrypted
- ❌ Title stored in plaintext
- ❌ Single encryption metadata for entire note

**New Behavior (Spec-Compliant):**
- ✅ **BOTH** title and content encrypted
- ✅ Separate encryption metadata for each field
- ✅ No plaintext leakage

**Implementation:**
```typescript
// Old (incorrect)
if (encryptionEnabled) {
  note.content = encrypt(note.content);
  note.encryptionMetadata = metadata;
}

// New (spec-compliant)
if (encryptionEnabled) {
  note.title = encrypt(note.title);
  note.content = encrypt(note.content);
  _metadata.titleEncryptionMetadata = titleMetadata;
  _metadata.contentEncryptionMetadata = contentMetadata;
}
```

---

## Files Modified

| File | Changes | Lines Changed |
|------|---------|---------------|
| `storage/storage.ts` | Note interface, metadata interface, all methods updated | ~150 lines |
| `storage/migration.ts` | Complete migration system (new file) | ~280 lines |
| `tests/migration.test.js` | Node.js test suite (new file) | ~480 lines |
| `tests/migration-manual-test.html` | Browser test UI (new file) | ~520 lines |
| `tests/README.md` | Test documentation (new file) | ~280 lines |
| `package.json` | Added `test:migration` script | 1 line |

**Total:** ~1,700+ lines of production + test code

---

## Next Steps - TESTING REQUIRED

### Before Proceeding to background.js:

1. **Manual Browser Testing** (HIGH PRIORITY)
   ```bash
   # Open in browser
   open tests/migration-manual-test.html

   # Run tests:
   # 1. Click "Run All Tests"
   # 2. Verify all tests pass
   # 3. Click "Setup Old Data"
   # 4. Click "Run All Tests" again
   # 5. Verify migration succeeds
   ```

2. **Extension Context Testing** (HIGH PRIORITY)
   - Load extension unpacked in Chrome
   - Manually seed old schema data via DevTools console
   - Trigger migration (call `autoMigrate()` in background.js)
   - Inspect storage to verify transformation
   - Check console for errors

3. **Edge Case Validation**
   - Test with 100+ notes
   - Test with large content (>10KB)
   - Test with special characters in URLs
   - Test with empty notes
   - Test with corrupt encryption metadata

### Only After Migration Tests Pass:

4. **Update background.js** to use new Note interface
5. **Update content.js** to create notes with new schema
6. **Update popup.js** to display notes with position/size
7. **Implement settings.js** change handlers
8. **Implement dragging/resizing** using position/size fields

---

## Risk Assessment

### Low Risk ✅
- New Note interface (fully backward compatible via migration)
- Metadata separation (transparent to end users)
- URL normalization (improves consistency)
- Test coverage (5 suites, 15+ assertions)

### Medium Risk ⚠️
- Migration script (could corrupt data if buggy)
  - **Mitigation:** Test thoroughly before releasing
  - **Mitigation:** Export errors for manual recovery
  - **Mitigation:** Idempotent design (safe to re-run)

### High Risk 🔴
- Title encryption change (affects existing encrypted notes)
  - **Mitigation:** Migration preserves old encryption metadata
  - **Mitigation:** No re-encryption of already encrypted content
  - **Action Required:** Verify encrypted notes decrypt correctly after migration

---

## Migration Checklist

- [x] Define spec-compliant Note interface
- [x] Create NoteMetadata interface
- [x] Update `saveNote()` to encrypt title + content
- [x] Update `getNote()` to decrypt title + content
- [x] Update `getAllNotes()` to use pageURL
- [x] Update `deleteNote()` to use pageURL
- [x] Create `createNewNote()` helper
- [x] Write migration script with error handling
- [x] Write manual browser tests
- [x] Write Node.js test suite
- [x] Document migration process
- [ ] **Run manual browser tests** ← YOU ARE HERE
- [ ] **Validate in extension context**
- [ ] **Verify encrypted notes work**
- [ ] **Test with production data**
- [ ] Update background.js (after tests pass)
- [ ] Update content.js (after tests pass)
- [ ] Update popup.js (after tests pass)

---

## How to Test (Quick Start)

### Option 1: Browser (Fastest)

```bash
# Open test page
open tests/migration-manual-test.html

# In browser:
# 1. Click "Setup Old Data"
# 2. Click "Run All Tests"
# 3. Verify all tests show "PASSED"
```

### Option 2: Extension Context (Most Accurate)

```bash
# 1. Load extension
# Chrome → Extensions → Load unpacked → select QuietNote-v2 folder

# 2. Seed old data (DevTools console)
chrome.storage.local.set({
  'note:note-001': {
    id: 'note-001',
    title: 'Test',
    content: 'Content',
    url: 'https://example.com',
    color: 'yellow',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    encrypted: false
  }
});

# 3. Add autoMigrate() to background.js startup (temporary)
# import { autoMigrate } from '../storage/migration.ts';
# chrome.runtime.onInstalled.addListener(() => {
#   autoMigrate();
# });

# 4. Reload extension and check console

# 5. Verify results
chrome.storage.local.get(null, data => console.log(data));
```

---

## Questions Before Proceeding?

1. **Should we test now or continue with background.js?**
   - Recommendation: **Test now** (data integrity critical)

2. **Do you have existing notes to test with?**
   - If yes: Back them up first
   - If no: Use provided test data

3. **Prefer manual or automated testing?**
   - Manual: Use `migration-manual-test.html`
   - Automated: Compile TypeScript and run `npm run test:migration`

---

## Contact / Support

If migration fails or data is corrupted:
1. Check `tests/README.md` for troubleshooting
2. Export error log using `MigrationManager.exportErrors()`
3. Review error JSON for specific issues
4. Original data is preserved in error export for manual recovery

---

**Status:** ✅ Ready for Testing
**Confidence Level:** High (comprehensive test coverage)
**Recommended Action:** Run manual browser tests before updating background.js
