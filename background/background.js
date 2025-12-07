/**
 * QuietNote Background Service Worker
 * Handles encryption, storage, auto-lock, and message passing
 * Manifest V3 compatible
 */

// Import crypto utilities (simplified version without TS)
const CRYPTO_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  iterations: 310000,
  saltLength: 32,
  ivLength: 12,
  hash: 'SHA-256',
};

const DEFAULT_SETTINGS = {
  securityLevel: 'full',
  requirePIN: true,
  autoLockTimer: 300000,
  encryptionEnabled: true,
  maskNoteText: false,
  rateLimitPINAttempts: true,
  theme: 'light',
  defaultNoteColor: '#FFF9E6',
  noteFontSize: 'medium',
  noteTransparency: 95,
  enableAnimations: true,
  enablePageNotes: true,
  enablePersonalNotes: true,
  enableAutoSave: true,
  enableAutoHide: false,
  enableDragSnap: true,
  defaultNotePosition: 'top-right',
  defaultNoteSize: 'medium',
  shortcuts: {
    newPageNote: 'Ctrl+Shift+N',
    openVault: 'Ctrl+Shift+V',
    lockNow: 'Ctrl+Shift+L',
    toggleSidebar: 'Ctrl+Shift+S',
  },
};

// State
let encryptionKey = null;
let encryptionSalt = null;
let autoLockTimer = null;
let lockState = { locked: true, lastUnlock: 0 };

/**
 * Initialize service worker
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[QuietNote] Service Worker installed');

  // Initialize default storage
  chrome.storage.local.get(['settings'], result => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });

  // Set default lock state
  chrome.storage.local.get(['lockState'], result => {
    if (!result.lockState) {
      chrome.storage.local.set({
        lockState: { locked: true, lastUnlock: 0 },
      });
    }
  });
});

/**
 * Listen for messages from content scripts and popup
 * Strict allowlist of allowed message types
 */
const ALLOWED_MESSAGES = [
  'GET_SETTINGS',
  'UPDATE_SETTINGS',
  'UNLOCK',
  'LOCK',
  'GET_LOCK_STATE',
  'CREATE_NOTE',
  'GET_NOTE',
  'UPDATE_NOTE',
  'DELETE_NOTE',
  'GET_ALL_NOTES',
  'SET_PIN',
  'VERIFY_PIN',
  'ENCRYPT_DATA',
  'DECRYPT_DATA',
  'EXPORT_NOTES',
  'IMPORT_NOTES',
  'CLEAR_NOTES',
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[QuietNote] Message received:', request.type);

  // Validate message type
  if (!ALLOWED_MESSAGES.includes(request.type)) {
    console.warn('[QuietNote] Blocked unauthorized message:', request.type);
    sendResponse({ success: false, error: 'Unauthorized message type' });
    return true;
  }

  // Route message to handler
  handleMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async response
});

/**
 * Handle different message types
 */
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'GET_SETTINGS':
        handleGetSettings(sendResponse);
        break;

      case 'UPDATE_SETTINGS':
        handleUpdateSettings(request, sendResponse);
        break;

      case 'UNLOCK':
        await handleUnlock(request, sendResponse);
        break;

      case 'LOCK':
        handleLock(sendResponse);
        break;

      case 'GET_LOCK_STATE':
        handleGetLockState(sendResponse);
        break;

      case 'CREATE_NOTE':
        await handleCreateNote(request, sendResponse);
        break;

      case 'GET_NOTE':
        await handleGetNote(request, sendResponse);
        break;

      case 'GET_ALL_NOTES':
        await handleGetAllNotes(request, sendResponse);
        break;

      case 'DELETE_NOTE':
        await handleDeleteNote(request, sendResponse);
        break;

      case 'SET_PIN':
        await handleSetPIN(request, sendResponse);
        break;

      case 'VERIFY_PIN':
        await handleVerifyPIN(request, sendResponse);
        break;

      case 'ENCRYPT_DATA':
        await handleEncryptData(request, sendResponse);
        break;

      case 'DECRYPT_DATA':
        await handleDecryptData(request, sendResponse);
        break;

      case 'EXPORT_NOTES':
        await handleExportNotes(sendResponse);
        break;

      case 'IMPORT_NOTES':
        await handleImportNotes(request, sendResponse);
        break;

      case 'CLEAR_NOTES':
        await handleClearNotes(sendResponse);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[QuietNote] Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Message Handlers
 */

function handleGetSettings(sendResponse) {
  chrome.storage.local.get(['settings'], result => {
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };
    sendResponse({ success: true, settings });
  });
}

function handleUpdateSettings(request, sendResponse) {
  chrome.storage.local.get(['settings'], result => {
    const current = { ...DEFAULT_SETTINGS, ...result.settings };
    const updated = { ...current, ...request.settings };
    chrome.storage.local.set({ settings: updated }, () => {
      sendResponse({ success: true });
      // Auto-lock if timer changed
      if (request.settings.autoLockTimer !== undefined) {
        scheduleAutoLock(updated.autoLockTimer);
      }
    });
  });
}

async function handleUnlock(request, sendResponse) {
  try {
    const { pin } = request;

    // Verify PIN
    const hash = await hashData(pin);
    chrome.storage.local.get(['settings'], async result => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings };

      if (settings.pinHash && hash !== settings.pinHash) {
        sendResponse({ success: false, error: 'Invalid PIN' });
        return;
      }

      // Derive encryption key
      let salt;
      await new Promise(resolve => {
        chrome.storage.local.get(['encryptionSalt'], result => {
          salt = result.encryptionSalt
            ? base64ToArrayBuffer(result.encryptionSalt)
            : undefined;
          resolve();
        });
      });

      const { key, newSalt } = await derivePINKey(pin, salt);
      encryptionKey = key;
      encryptionSalt = newSalt;

      // Store salt if new
      if (!salt) {
        chrome.storage.local.set({
          encryptionSalt: arrayBufferToBase64(newSalt),
        });
      }

      // Update lock state
      lockState = { locked: false, lastUnlock: Date.now() };
      chrome.storage.local.set({ lockState });

      // Schedule auto-lock
      scheduleAutoLock(settings.autoLockTimer);

      sendResponse({ success: true });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function handleLock(sendResponse) {
  encryptionKey = null;
  lockState = { locked: true, lastUnlock: 0 };
  chrome.storage.local.set({ lockState });

  // Cancel auto-lock timer
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }

  sendResponse({ success: true });
}

function handleGetLockState(sendResponse) {
  chrome.storage.local.get(['lockState'], result => {
    const state = result.lockState || lockState;
    sendResponse({ success: true, ...state });
  });
}

async function handleCreateNote(request, sendResponse) {
  try {
    const { note } = request;
    const noteKey = note.url
      ? `note:${normalizeUrl(note.url)}:${note.id}`
      : `note:${note.id}`;

    let contentToStore = note.content;
    let encryptionMetadata = null;

    // Encrypt if enabled and unlocked
    if (encryptionKey) {
      const encrypted = await encryptAESGCM(note.content, encryptionKey, encryptionSalt);
      contentToStore = encrypted.ciphertext;
      encryptionMetadata = encrypted;
    }

    const storedNote = {
      ...note,
      content: contentToStore,
      encrypted: !!encryptionKey,
      encryptionMetadata,
    };

    chrome.storage.local.set({ [noteKey]: storedNote }, () => {
      sendResponse({ success: true, id: note.id });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetNote(request, sendResponse) {
  try {
    const { id, url } = request;
    const noteKey = url
      ? `note:${normalizeUrl(url)}:${id}`
      : `note:${id}`;

    chrome.storage.local.get([noteKey], async result => {
      const note = result[noteKey];

      if (!note) {
        sendResponse({ success: false, error: 'Note not found' });
        return;
      }

      // Decrypt if needed
      if (note.encrypted && note.encryptionMetadata && encryptionKey) {
        try {
          const decrypted = await decryptAESGCM(
            note.encryptionMetadata,
            encryptionKey
          );
          note.content = decrypted;
        } catch (error) {
          sendResponse({
            success: false,
            error: `Decryption failed: ${error.message}`,
          });
          return;
        }
      }

      sendResponse({ success: true, note });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetAllNotes(request, sendResponse) {
  try {
    const { url } = request;

    chrome.storage.local.get(null, async result => {
      const notes = [];

      for (const [key, value] of Object.entries(result)) {
        if (!key.startsWith('note:')) continue;

        const note = value;

        // Filter by URL if provided
        if (url && note.url !== url) continue;

        // Decrypt if needed
        if (note.encrypted && note.encryptionMetadata && encryptionKey) {
          try {
            const decrypted = await decryptAESGCM(
              note.encryptionMetadata,
              encryptionKey
            );
            note.content = decrypted;
          } catch (error) {
            console.warn(`Failed to decrypt note:`, error);
            continue;
          }
        }

        notes.push(note);
      }

      sendResponse({ success: true, notes });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteNote(request, sendResponse) {
  try {
    const { id, url } = request;
    const noteKey = url
      ? `note:${normalizeUrl(url)}:${id}`
      : `note:${id}`;

    chrome.storage.local.remove([noteKey], () => {
      sendResponse({ success: true });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetPIN(request, sendResponse) {
  try {
    const { pin } = request;
    const hash = await hashData(pin);
    chrome.storage.local.get(['settings'], result => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings };
      settings.pinHash = hash;
      chrome.storage.local.set({ settings }, () => {
        sendResponse({ success: true });
      });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleVerifyPIN(request, sendResponse) {
  try {
    const { pin } = request;
    const hash = await hashData(pin);
    chrome.storage.local.get(['settings'], result => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings };
      const isValid = settings.pinHash && hash === settings.pinHash;
      sendResponse({ success: true, valid: isValid });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleEncryptData(request, sendResponse) {
  try {
    if (!encryptionKey) {
      sendResponse({
        success: false,
        error: 'Encryption not unlocked',
      });
      return;
    }

    const encrypted = await encryptAESGCM(
      request.data,
      encryptionKey,
      encryptionSalt
    );
    sendResponse({ success: true, encrypted });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDecryptData(request, sendResponse) {
  try {
    if (!encryptionKey) {
      sendResponse({
        success: false,
        error: 'Encryption not unlocked',
      });
      return;
    }

    const decrypted = await decryptAESGCM(request.encrypted, encryptionKey);
    sendResponse({ success: true, decrypted });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExportNotes(sendResponse) {
  try {
    chrome.storage.local.get(null, result => {
      const notes = [];
      for (const [key, value] of Object.entries(result)) {
        if (key.startsWith('note:')) {
          notes.push(value);
        }
      }

      const exportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        encrypted: !!encryptionKey,
        notes,
      };

      sendResponse({
        success: true,
        data: JSON.stringify(exportData, null, 2),
      });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleImportNotes(request, sendResponse) {
  try {
    const data = JSON.parse(request.data);
    const notes = data.notes || [];

    const importedNotes = {};
    for (const note of notes) {
      const noteKey = note.url
        ? `note:${normalizeUrl(note.url)}:${note.id}`
        : `note:${note.id}`;
      importedNotes[noteKey] = note;
    }

    chrome.storage.local.set(importedNotes, () => {
      sendResponse({ success: true, count: notes.length });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleClearNotes(sendResponse) {
  try {
    chrome.storage.local.get(null, result => {
      const keysToRemove = [];
      for (const key of Object.keys(result)) {
        if (key.startsWith('note:')) {
          keysToRemove.push(key);
        }
      }

      chrome.storage.local.remove(keysToRemove, () => {
        sendResponse({ success: true, cleared: keysToRemove.length });
      });
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Crypto Functions (WebCrypto API)
 */

async function derivePINKey(pin, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const finalSalt = salt || crypto.getRandomValues(
    new Uint8Array(CRYPTO_CONFIG.saltLength)
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: finalSalt,
      iterations: CRYPTO_CONFIG.iterations,
      hash: CRYPTO_CONFIG.hash,
    },
    baseKey,
    { name: 'AES-GCM', length: CRYPTO_CONFIG.keyLength },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, newSalt: finalSalt };
}

async function encryptAESGCM(plaintext, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.ivLength));
  const data = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
  };
}

async function decryptAESGCM(encrypted, key) {
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  const iv = base64ToArrayBuffer(encrypted.iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

async function hashData(data) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(data)
  );
  return arrayBufferToBase64(buffer);
}

/**
 * Utility Functions
 */

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Auto-lock functionality
 */

function scheduleAutoLock(timerMs) {
  // Clear existing timer
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }

  // Only schedule if timer is set (not 0)
  if (timerMs && timerMs > 0) {
    autoLockTimer = setTimeout(() => {
      console.log('[QuietNote] Auto-locking notes');
      handleLock(() => {});
    }, timerMs);
  }
}

/**
 * Keyboard shortcuts
 */

chrome.commands.onCommand.addListener(command => {
  console.log('[QuietNote] Command executed:', command);

  switch (command) {
    case 'new-page-note':
      chrome.tabs.query({ active: true }, tabs => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'NEW_PAGE_NOTE' });
        }
      });
      break;

    case 'open-vault':
      chrome.action.openPopup();
      break;

    case 'lock-now':
      handleLock(() => {
        chrome.runtime.sendMessage({ type: 'LOCK_UPDATED' }).catch(() => {});
      });
      break;

    case 'toggle-sidebar':
      chrome.tabs.query({ active: true }, tabs => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' });
        }
      });
      break;
  }
});

console.log('[QuietNote] Service Worker loaded');
