/**
 * QuietNote Cryptography Module
 * Implements AES-GCM encryption with PBKDF2 key derivation
 * Uses only WebCrypto API (no external dependencies)
 */

export interface EncryptionResult {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  tag: string; // base64 (part of ciphertext in GCM)
}

export interface DecryptionResult {
  plaintext: string;
  success: boolean;
  error?: string;
}

/**
 * Crypto configuration constants
 */
const CRYPTO_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  iterations: 310000, // OWASP recommended for PBKDF2
  saltLength: 32,
  ivLength: 12,
  tagLength: 128,
  hash: 'SHA-256',
} as const;

/**
 * CryptoManager - Handles all encryption/decryption operations
 */
export class CryptoManager {
  /**
   * Derives a cryptographic key from a PIN using PBKDF2
   */
  static async derivePINKey(pin: string, salt?: Uint8Array): Promise<{
    key: CryptoKey;
    salt: Uint8Array;
  }> {
    // Generate salt if not provided
    const finalSalt = salt || crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.saltLength));

    // Create base key from PIN
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive actual encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: finalSalt,
        iterations: CRYPTO_CONFIG.iterations,
        hash: CRYPTO_CONFIG.hash,
      },
      baseKey,
      { name: 'AES-GCM', length: CRYPTO_CONFIG.keyLength },
      false, // not extractable
      ['encrypt', 'decrypt']
    );

    return { key, salt: finalSalt };
  }

  /**
   * Encrypts plaintext with AES-GCM
   */
  static async encrypt(
    plaintext: string,
    key: CryptoKey,
    salt: Uint8Array
  ): Promise<EncryptionResult> {
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.ivLength));
    const data = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
      tag: '', // GCM tag is embedded in ciphertext
    };
  }

  /**
   * Decrypts AES-GCM ciphertext
   */
  static async decrypt(
    encrypted: EncryptionResult,
    key: CryptoKey
  ): Promise<DecryptionResult> {
    try {
      const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext);
      const iv = this.base64ToArrayBuffer(encrypted.iv);

      const plaintext = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertext
      );

      return {
        plaintext: new TextDecoder().decode(plaintext),
        success: true,
      };
    } catch (error) {
      return {
        plaintext: '',
        success: false,
        error: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Complete encrypt workflow: derive key from PIN and encrypt data
   */
  static async encryptWithPIN(plaintext: string, pin: string): Promise<EncryptionResult> {
    const { key, salt } = await this.derivePINKey(pin);
    return this.encrypt(plaintext, key, salt);
  }

  /**
   * Complete decrypt workflow: derive key from PIN and decrypt data
   */
  static async decryptWithPIN(encrypted: EncryptionResult, pin: string): Promise<DecryptionResult> {
    try {
      const salt = this.base64ToArrayBuffer(encrypted.salt) as Uint8Array;
      const { key } = await this.derivePINKey(pin, salt);
      return this.decrypt(encrypted, key);
    } catch (error) {
      return {
        plaintext: '',
        success: false,
        error: `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate a random secure password for master key
   */
  static generateSecurePassword(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomBytes)
      .map(byte => chars[byte % chars.length])
      .join('');
  }

  /**
   * Hash data with SHA-256 (for PIN attempts tracking, not encryption)
   */
  static async hashData(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return this.arrayBufferToBase64(buffer);
  }

  /**
   * Verify a PIN against a stored hash
   */
  static async verifyPIN(pin: string, storedHash: string): Promise<boolean> {
    const hash = await this.hashData(pin);
    return hash === storedHash;
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * PIN validation utilities
 */
export class PINValidator {
  static readonly MIN_LENGTH = 4;
  static readonly MAX_LENGTH = 8;
  static readonly MAX_ATTEMPTS = 5;
  static readonly LOCKOUT_DURATION = 900000; // 15 minutes

  /**
   * Validate PIN format
   */
  static isValidPIN(pin: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pin || typeof pin !== 'string') {
      errors.push('PIN must be a string');
    }
    if (pin.length < this.MIN_LENGTH) {
      errors.push(`PIN must be at least ${this.MIN_LENGTH} digits`);
    }
    if (pin.length > this.MAX_LENGTH) {
      errors.push(`PIN must be at most ${this.MAX_LENGTH} digits`);
    }
    if (!/^\d+$/.test(pin)) {
      errors.push('PIN must contain only digits');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if account is locked due to too many failed attempts
   */
  static isLockedOut(lastAttempt: number, attemptCount: number): boolean {
    if (attemptCount < this.MAX_ATTEMPTS) {
      return false;
    }
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    return timeSinceLastAttempt < this.LOCKOUT_DURATION;
  }

  /**
   * Get lockout remaining time in seconds
   */
  static getLockoutRemainingTime(lastAttempt: number): number {
    const now = Date.now();
    const elapsed = now - lastAttempt;
    const remaining = this.LOCKOUT_DURATION - elapsed;
    return Math.ceil(remaining / 1000);
  }
}

/**
 * Clipboard sanitization for security
 */
export class ClipboardManager {
  /**
   * Copy text to clipboard and auto-clear after timeout
   */
  static async copyToClipboard(text: string, clearAfterMs: number = 60000): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);

      // Auto-clear clipboard
      setTimeout(() => {
        navigator.clipboard.writeText('');
      }, clearAfterMs);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw new Error('Clipboard access denied');
    }
  }

  /**
   * Read from clipboard
   */
  static async readFromClipboard(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
      throw new Error('Clipboard access denied');
    }
  }
}
