/**
 * QuietNote Migration Tests
 * Validates data migration from old schema to new specification-compliant schema
 */

// Mock Chrome Storage API for testing
const mockStorage = new Map();

global.chrome = {
  storage: {
    local: {
      get: (keys) => {
        return new Promise(resolve => {
          if (typeof keys === 'string') {
            resolve({ [keys]: mockStorage.get(keys) });
          } else if (Array.isArray(keys)) {
            const result = {};
            keys.forEach(key => {
              if (mockStorage.has(key)) {
                result[key] = mockStorage.get(key);
              }
            });
            resolve(result);
          } else {
            // Get all
            const result = {};
            mockStorage.forEach((value, key) => {
              result[key] = value;
            });
            resolve(result);
          }
        });
      },
      set: (items) => {
        return new Promise(resolve => {
          Object.entries(items).forEach(([key, value]) => {
            mockStorage.set(key, value);
          });
          resolve();
        });
      },
      remove: (keys) => {
        return new Promise(resolve => {
          if (Array.isArray(keys)) {
            keys.forEach(key => mockStorage.delete(key));
          } else {
            mockStorage.delete(keys);
          }
          resolve();
        });
      },
      clear: () => {
        return new Promise(resolve => {
          mockStorage.clear();
          resolve();
        });
      }
    }
  }
};

// Import migration module (will need to be compiled from TS first)
// For now, we'll use inline test functions

/**
 * Test Suite 1: Fresh Install
 */
async function testFreshInstall() {
  console.log('\n=== TEST 1: Fresh Install ===');

  try {
    // Clear storage
    await chrome.storage.local.clear();

    // Check initial state
    const data = await chrome.storage.local.get();

    // Verify empty state
    const noteKeys = Object.keys(data).filter(k => k.startsWith('note:'));

    console.log('✓ Storage is empty:', noteKeys.length === 0);
    console.log('✓ No migration flag set:', !data.migration_v2_done);

    return {
      passed: noteKeys.length === 0,
      test: 'Fresh Install'
    };
  } catch (error) {
    console.error('✗ Fresh install test failed:', error);
    return { passed: false, test: 'Fresh Install', error: error.message };
  }
}

/**
 * Test Suite 2: Old Schema Plaintext Notes
 */
async function testPlaintextMigration() {
  console.log('\n=== TEST 2: Plaintext Note Migration ===');

  try {
    // Clear storage
    await chrome.storage.local.clear();

    // Create old schema notes
    const oldNote1 = {
      id: 'note-001',
      title: 'Test Note 1',
      content: 'This is test content',
      url: 'https://example.com/page',
      color: '#FFF9E6',
      createdAt: 1704067200000,
      updatedAt: 1704067200000,
      encrypted: false,
      tags: ['work', 'important'],
      pinned: true
    };

    const oldNote2 = {
      id: 'note-002',
      title: 'Personal Note',
      content: 'Personal content',
      // No url = personal note
      color: 'yellow', // Named color
      createdAt: 1704067200000,
      updatedAt: 1704067200000,
      encrypted: false
    };

    // Store old notes
    await chrome.storage.local.set({
      'note:https://example.com/page:note-001': oldNote1,
      'note:note-002': oldNote2,
      settings: {
        defaultNotePosition: 'top-right',
        defaultNoteSize: 'medium'
      }
    });

    console.log('Old notes stored:', 2);

    // Simulate migration
    const { MigrationManager } = await import('../storage/migration.ts');
    const allStorage = await chrome.storage.local.get();

    const result = await MigrationManager.migrateAllNotes(
      allStorage,
      'top-right',
      'medium'
    );

    console.log(`Migration complete: ${result.migrated.length} migrated, ${result.failed} failed`);

    // Verify migrated notes
    let allPassed = true;

    result.migrated.forEach((item, idx) => {
      const note = item.note;
      const metadata = item.metadata;

      console.log(`\nNote ${idx + 1}:`);

      // Check mandatory fields
      const hasId = !!note.id;
      const hasCreatedAt = typeof note.createdAt === 'number';
      const hasUpdatedAt = typeof note.updatedAt === 'number';
      const hasTitle = typeof note.title === 'string';
      const hasContent = typeof note.content === 'string';
      const hasColor = /^#[0-9A-F]{6}$/.test(note.color);
      const hasPosition = note.position && typeof note.position.x === 'number' && typeof note.position.y === 'number';
      const hasSize = note.size && typeof note.size.width === 'number' && typeof note.size.height === 'number';
      const hasPageURL = note.pageURL === null || typeof note.pageURL === 'string';
      const hasMasked = typeof note.masked === 'boolean';

      console.log('  ✓ Has ID:', hasId);
      console.log('  ✓ Has createdAt:', hasCreatedAt);
      console.log('  ✓ Has updatedAt:', hasUpdatedAt);
      console.log('  ✓ Has title:', hasTitle);
      console.log('  ✓ Has content:', hasContent);
      console.log('  ✓ Color normalized:', hasColor, note.color);
      console.log('  ✓ Has position:', hasPosition, note.position);
      console.log('  ✓ Has size:', hasSize, note.size);
      console.log('  ✓ Has pageURL:', hasPageURL, note.pageURL);
      console.log('  ✓ Has masked:', hasMasked);

      // Check metadata
      console.log('  ✓ Metadata preserved:', metadata.tags, metadata.pinned);

      allPassed = allPassed && hasId && hasCreatedAt && hasUpdatedAt &&
                  hasTitle && hasContent && hasColor && hasPosition &&
                  hasSize && hasPageURL && hasMasked;
    });

    return {
      passed: allPassed && result.failed === 0,
      test: 'Plaintext Migration',
      details: `${result.migrated.length} notes migrated successfully`
    };
  } catch (error) {
    console.error('✗ Plaintext migration test failed:', error);
    return { passed: false, test: 'Plaintext Migration', error: error.message };
  }
}

/**
 * Test Suite 3: Encrypted Notes Migration
 */
async function testEncryptedMigration() {
  console.log('\n=== TEST 3: Encrypted Note Migration ===');

  try {
    // Clear storage
    await chrome.storage.local.clear();

    // Create old schema encrypted note
    const oldEncryptedNote = {
      id: 'note-003',
      title: 'Encrypted Title',
      content: 'aGVsbG8gd29ybGQ=', // Base64 encrypted content (mock)
      url: 'https://secure.example.com',
      color: '#E3F2FD',
      createdAt: 1704067200000,
      updatedAt: 1704067200000,
      encrypted: true,
      encryptionMetadata: {
        ciphertext: 'aGVsbG8gd29ybGQ=',
        iv: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
        salt: 'c2FsdA==',
        tag: ''
      }
    };

    await chrome.storage.local.set({
      'note:https://secure.example.com:note-003': oldEncryptedNote
    });

    console.log('Old encrypted note stored');

    // Simulate migration
    const { MigrationManager } = await import('../storage/migration.ts');
    const allStorage = await chrome.storage.local.get();

    const result = await MigrationManager.migrateAllNotes(
      allStorage,
      'top-right',
      'medium'
    );

    console.log(`Migration complete: ${result.migrated.length} migrated, ${result.failed} failed`);

    // Verify encryption metadata preserved
    const migratedItem = result.migrated[0];
    const metadata = migratedItem.metadata;

    const encryptionPreserved = metadata.encrypted === true;
    const metadataPreserved = !!metadata.contentEncryptionMetadata;

    console.log('  ✓ Encryption flag preserved:', encryptionPreserved);
    console.log('  ✓ Encryption metadata preserved:', metadataPreserved);

    return {
      passed: encryptionPreserved && metadataPreserved && result.failed === 0,
      test: 'Encrypted Migration',
      details: 'Encryption metadata preserved correctly'
    };
  } catch (error) {
    console.error('✗ Encrypted migration test failed:', error);
    return { passed: false, test: 'Encrypted Migration', error: error.message };
  }
}

/**
 * Test Suite 4: Corrupt Note Handling
 */
async function testCorruptNoteHandling() {
  console.log('\n=== TEST 4: Corrupt Note Handling ===');

  try {
    // Clear storage
    await chrome.storage.local.clear();

    // Create corrupt notes (missing required fields)
    const corruptNote1 = {
      // Missing id
      title: 'No ID Note',
      content: 'This note has no ID',
      createdAt: 1704067200000
    };

    const corruptNote2 = {
      id: 'note-004',
      // Missing createdAt and updatedAt
      title: 'No Timestamps',
      content: 'Missing timestamps'
    };

    await chrome.storage.local.set({
      'note:corrupt-1': corruptNote1,
      'note:corrupt-2': corruptNote2
    });

    console.log('Corrupt notes stored:', 2);

    // Simulate migration
    const { MigrationManager } = await import('../storage/migration.ts');
    const allStorage = await chrome.storage.local.get();

    const result = await MigrationManager.migrateAllNotes(
      allStorage,
      'top-right',
      'medium'
    );

    console.log(`Migration complete: ${result.migrated.length} migrated, ${result.failed} failed`);

    // Verify errors were logged
    const errors = MigrationManager.getErrors();

    console.log('  ✓ Errors logged:', errors.length);
    console.log('  ✓ Failed count matches:', result.failed === errors.length);

    errors.forEach((err, idx) => {
      console.log(`  Error ${idx + 1}:`, err.error);
    });

    return {
      passed: result.failed === 2 && errors.length === 2,
      test: 'Corrupt Note Handling',
      details: `${errors.length} corrupt notes handled gracefully`
    };
  } catch (error) {
    console.error('✗ Corrupt note handling test failed:', error);
    return { passed: false, test: 'Corrupt Note Handling', error: error.message };
  }
}

/**
 * Test Suite 5: URL Normalization
 */
async function testURLNormalization() {
  console.log('\n=== TEST 5: URL Normalization ===');

  try {
    // Clear storage
    await chrome.storage.local.clear();

    // Create notes with various URL formats
    const testURLs = [
      'https://example.com/page?query=123#hash',
      'http://example.com/page',
      'https://example.com:443/page',
      'invalid-url'
    ];

    const notes = testURLs.map((url, idx) => ({
      id: `note-${idx}`,
      title: `Note ${idx}`,
      content: `Content ${idx}`,
      url,
      color: '#FFF9E6',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      encrypted: false
    }));

    const storageData = {};
    notes.forEach((note, idx) => {
      storageData[`note:${note.url}:${note.id}`] = note;
    });

    await chrome.storage.local.set(storageData);

    console.log('Notes with various URLs stored:', notes.length);

    // Simulate migration
    const { MigrationManager } = await import('../storage/migration.ts');
    const allStorage = await chrome.storage.local.get();

    const result = await MigrationManager.migrateAllNotes(
      allStorage,
      'top-right',
      'medium'
    );

    console.log(`Migration complete: ${result.migrated.length} migrated, ${result.failed} failed`);

    // Verify URL normalization
    result.migrated.forEach((item, idx) => {
      const note = item.note;
      console.log(`  Note ${idx}: ${testURLs[idx]} → ${note.pageURL}`);
    });

    // Expected: URLs should be normalized to protocol://host/path
    const expectedURLs = [
      'https://example.com/page',
      'http://example.com/page',
      'https://example.com/page',
      'invalid-url' // Should remain as-is if invalid
    ];

    const urlsMatch = result.migrated.every((item, idx) =>
      item.note.pageURL === expectedURLs[idx]
    );

    console.log('  ✓ URLs normalized correctly:', urlsMatch);

    return {
      passed: urlsMatch && result.failed === 0,
      test: 'URL Normalization',
      details: 'All URLs normalized to protocol://host/path format'
    };
  } catch (error) {
    console.error('✗ URL normalization test failed:', error);
    return { passed: false, test: 'URL Normalization', error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('QUIETNOTE MIGRATION TEST SUITE');
  console.log('='.repeat(60));

  const results = [];

  results.push(await testFreshInstall());
  results.push(await testPlaintextMigration());
  results.push(await testEncryptedMigration());
  results.push(await testCorruptNoteHandling());
  results.push(await testURLNormalization());

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));

  let passedCount = 0;
  let failedCount = 0;

  results.forEach(result => {
    const status = result.passed ? '✓ PASSED' : '✗ FAILED';
    console.log(`${status}: ${result.test}`);
    if (result.details) {
      console.log(`  ${result.details}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY: ${passedCount} passed, ${failedCount} failed`);
  console.log('='.repeat(60));

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    allPassed: failedCount === 0
  };
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testFreshInstall,
    testPlaintextMigration,
    testEncryptedMigration,
    testCorruptNoteHandling,
    testURLNormalization
  };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().then(summary => {
    process.exit(summary.allPassed ? 0 : 1);
  });
}
