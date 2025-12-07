/**
 * QuietNote Encrypted Storage Module
 * Provides secure storage with encryption support
 * Automatically encrypts data based on security settings
 */

import { CryptoManager, EncryptionResult } from '../crypto/crypto';

export interface Note {
  id: string;
  title: string;
  content: string;
  url?: string; // for page-specific notes
  color: string;
  createdAt: number;
  updatedAt: number;
  encrypted: boolean;
  tags?: string[];
  pinned?: boolean;
}

export interface EncryptedNote extends Note {
  content: string; // encrypted content (base64)
  encryptionMetadata?: EncryptionResult;
}

export interface StorageSettings {
  securityLevel: 'full' | 'medium' | 'none'; // Full Secure, Medium, No Security
  requirePIN: boolean;
  autoLockTimer: number; // 0, 30000, 60000, 120000, 300000, 600000 (ms)
  pinHash?: string; // SHA-256 hash of PIN
  encryptionEnabled: boolean;
  maskNoteText: boolean;
  rateLimitPINAttempts: boolean;
  theme: 'light' | 'dark' | 'solarized';
  defaultNoteColor: string;
  noteFontSize: 'small' | 'medium' | 'large';
  noteTransparency: number; // 0-100
  enableAnimations: boolean;
  enablePageNotes: boolean;
  enablePersonalNotes: boolean;
  enableAutoSave: boolean;
  enableAutoHide: boolean;
  enableDragSnap: boolean;
  defaultNotePosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  defaultNoteSize: 'small' | 'medium' | 'large';
  shortcuts: {
    newPageNote: string;
    openVault: string;
    lockNow: string;
    toggleSidebar: string;
  };
}

export const DEFAULT_SETTINGS: StorageSettings = {
  securityLevel: 'full',
  requirePIN: true,
  autoLockTimer: 300000, // 5 minutes
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

/**
 * StorageManager - Handles all persistent storage with encryption
 */
export class StorageManager {
  private static encryptionKey: CryptoKey | null = null;
  private static encryptionSalt: Uint8Array | null = null;
  private static currentPIN: string | null = null;

  /**
   * Initialize storage and encryption
   */
  static async init(pin?: string): Promise<void> {
    const settings = await this.getSettings();

    if (settings.encryptionEnabled && pin) {
      await this.unlockEncryption(pin);
    }
  }

  /**
   * Unlock encryption with PIN
   */
  static async unlockEncryption(pin: string): Promise<boolean> {
    try {
      // Verify PIN if set
      const settings = await this.getSettings();
      if (settings.pinHash) {
        const isValid = await CryptoManager.verifyPIN(pin, settings.pinHash);
        if (!isValid) {
          throw new Error('Invalid PIN');
        }
      }

      // Derive encryption key
      const stored = await this.getRawStorage('encryptionSalt');
      let salt = stored ? this.base64ToArrayBuffer(stored as string) : undefined;

      const { key, salt: newSalt } = await CryptoManager.derivePINKey(pin, salt);
      this.encryptionKey = key;
      this.encryptionSalt = newSalt;
      this.currentPIN = pin;

      // Store salt if new
      if (!stored) {
        await this.setRawStorage('encryptionSalt', this.arrayBufferToBase64(newSalt));
      }

      return true;
    } catch (error) {
      console.error('Encryption unlock failed:', error);
      return false;
    }
  }

  /**
   * Lock encryption (clear key from memory)
   */
  static lockEncryption(): void {
    this.encryptionKey = null;
    this.currentPIN = null;
  }

  /**
   * Check if encryption is unlocked
   */
  static isEncryptionUnlocked(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Save a note (encrypted if enabled)
   */
  static async saveNote(note: Note): Promise<void> {
    const settings = await this.getSettings();
    let contentToStore = note.content;
    let encryptionMetadata: EncryptionResult | undefined;

    // Encrypt if enabled
    if (settings.encryptionEnabled && this.encryptionKey && this.encryptionSalt) {
      const encrypted = await CryptoManager.encrypt(
        note.content,
        this.encryptionKey,
        this.encryptionSalt
      );
      contentToStore = encrypted.ciphertext;
      encryptionMetadata = encrypted;
    }

    const storageNote: EncryptedNote = {
      ...note,
      content: contentToStore,
      encrypted: settings.encryptionEnabled,
      encryptionMetadata,
    };

    // Determine storage key
    const key = note.url ? `note:${this.normalizeUrl(note.url)}:${note.id}` : `note:${note.id}`;
    await this.setRawStorage(key, storageNote);
  }

  /**
   * Get a note (decrypted if needed)
   */
  static async getNote(id: string, url?: string): Promise<Note | null> {
    const key = url ? `note:${this.normalizeUrl(url)}:${id}` : `note:${id}`;
    const stored = await this.getRawStorage(key);

    if (!stored) return null;

    const note = stored as EncryptedNote;

    // Decrypt if needed
    if (note.encrypted && note.encryptionMetadata && this.encryptionKey) {
      const decrypted = await CryptoManager.decrypt(note.encryptionMetadata, this.encryptionKey);
      if (decrypted.success) {
        note.content = decrypted.plaintext;
      } else {
        console.error('Failed to decrypt note:', decrypted.error);
        return null;
      }
    }

    return note;
  }

  /**
   * Get all notes (with optional URL filter)
   */
  static async getAllNotes(url?: string): Promise<Note[]> {
    const storage = await this.getAllRawStorage();
    const notes: Note[] = [];

    for (const [key, value] of Object.entries(storage)) {
      if (!key.startsWith('note:')) continue;

      const note = value as EncryptedNote;

      // Filter by URL if provided
      if (url && note.url !== url) continue;

      // Decrypt if needed
      if (note.encrypted && note.encryptionMetadata && this.encryptionKey) {
        const decrypted = await CryptoManager.decrypt(note.encryptionMetadata, this.encryptionKey);
        if (decrypted.success) {
          note.content = decrypted.plaintext;
        } else {
          continue; // Skip notes that fail to decrypt
        }
      }

      notes.push(note);
    }

    return notes;
  }

  /**
   * Delete a note
   */
  static async deleteNote(id: string, url?: string): Promise<void> {
    const key = url ? `note:${this.normalizeUrl(url)}:${id}` : `note:${id}`;
    await this.removeRawStorage(key);
  }

  /**
   * Get settings
   */
  static async getSettings(): Promise<StorageSettings> {
    const stored = await this.getRawStorage('settings');
    return { ...DEFAULT_SETTINGS, ...(stored as Partial<StorageSettings>) };
  }

  /**
   * Update settings
   */
  static async updateSettings(updates: Partial<StorageSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.setRawStorage('settings', { ...current, ...updates });
  }

  /**
   * Set PIN
   */
  static async setPIN(pin: string): Promise<void> {
    const hash = await CryptoManager.hashData(pin);
    await this.updateSettings({ pinHash: hash });
    this.currentPIN = pin;
  }

  /**
   * Export all notes as JSON (with encryption keys if enabled)
   */
  static async exportNotes(): Promise<string> {
    const notes = await this.getAllNotes();
    const settings = await this.getSettings();
    const salt = await this.getRawStorage('encryptionSalt');

    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      encryptionEnabled: settings.encryptionEnabled,
      encryptionSalt: salt,
      notes,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import notes from JSON
   */
  static async importNotes(jsonData: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const data = JSON.parse(jsonData);
      const notes = data.notes as Note[];

      let importedCount = 0;
      for (const note of notes) {
        try {
          await this.saveNote(note);
          importedCount++;
        } catch (error) {
          console.error(`Failed to import note ${note.id}:`, error);
        }
      }

      return { success: true, count: importedCount };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Clear all notes
   */
  static async clearAllNotes(): Promise<void> {
    const notes = await this.getAllNotes();
    for (const note of notes) {
      await this.deleteNote(note.id, note.url);
    }
  }

  /**
   * Get or create lock state
   */
  static async getLockState(): Promise<{ locked: boolean; lastUnlock: number }> {
    const stored = await this.getRawStorage('lockState');
    return (
      (stored as { locked: boolean; lastUnlock: number }) || {
        locked: true,
        lastUnlock: 0,
      }
    );
  }

  /**
   * Update lock state
   */
  static async setLockState(locked: boolean): Promise<void> {
    await this.setRawStorage('lockState', {
      locked,
      lastUnlock: locked ? 0 : Date.now(),
    });
  }

  // ===== Raw Storage Operations (using Chrome/Firefox Storage API) =====

  private static async getRawStorage(key: string): Promise<unknown> {
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([key], result => {
          resolve(result[key]);
        });
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(key);
        resolve(stored ? JSON.parse(stored) : null);
      }
    });
  }

  private static async setRawStorage(key: string, value: unknown): Promise<void> {
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      } else {
        // Fallback to localStorage
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  }

  private static async removeRawStorage(key: string): Promise<void> {
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove([key], () => resolve());
      } else {
        // Fallback to localStorage
        localStorage.removeItem(key);
        resolve();
      }
    });
  }

  private static async getAllRawStorage(): Promise<Record<string, unknown>> {
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(null, items => {
          resolve(items);
        });
      } else {
        // Fallback to localStorage
        const items: Record<string, unknown> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const stored = localStorage.getItem(key);
            items[key] = stored ? JSON.parse(stored) : null;
          }
        }
        resolve(items);
      }
    });
  }

  // ===== Utility Methods =====

  private static normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      return url;
    }
  }

  private static arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
