/**
 * QuietNote Data Migration Module
 * Migrates notes from old schema to new specification-compliant schema
 */

import { Note, NoteMetadata } from './storage';

/**
 * Old Note Schema (pre-spec alignment)
 */
interface OldNote {
  id: string;
  title: string;
  content: string;
  url?: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  encrypted: boolean;
  tags?: string[];
  pinned?: boolean;
  encryptionMetadata?: any;
  // Fields that might exist if partially migrated
  position?: { x: number; y: number; };
  size?: { width: number; height: number; };
  pageURL?: string | null;
}

/**
 * Migration error log entry
 */
interface MigrationError {
  noteId: string;
  error: string;
  originalData: any;
  timestamp: number;
}

/**
 * Default position and size values based on settings
 * Using fixed values since window dimensions may not be available in background context
 */
const DEFAULT_POSITIONS = {
  'top-right': { x: 1600, y: 20 },
  'top-left': { x: 20, y: 20 },
  'bottom-right': { x: 1600, y: 860 },
  'bottom-left': { x: 20, y: 860 },
};

const DEFAULT_SIZES = {
  'small': { width: 200, height: 150 },
  'medium': { width: 300, height: 200 },
  'large': { width: 400, height: 300 },
};

/**
 * Migration Manager
 */
export class MigrationManager {
  private static errors: MigrationError[] = [];

  /**
   * Migrate a single old note to new schema
   */
  static migrateNote(
    oldNote: OldNote,
    defaultPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right',
    defaultSize: 'small' | 'medium' | 'large' = 'medium'
  ): { note: Note; metadata: NoteMetadata } | null {
    try {
      // Validate required fields
      if (!oldNote.id || !oldNote.createdAt || !oldNote.updatedAt) {
        throw new Error('Missing required fields: id, createdAt, or updatedAt');
      }

      // Create new Note object with all mandatory fields
      const newNote: Note = {
        id: oldNote.id,
        createdAt: oldNote.createdAt,
        updatedAt: oldNote.updatedAt,
        title: oldNote.title || '',
        content: oldNote.content || '',
        color: this.normalizeColor(oldNote.color),
        position: DEFAULT_POSITIONS[defaultPosition],
        size: DEFAULT_SIZES[defaultSize],
        pageURL: oldNote.url ? this.normalizeUrl(oldNote.url) : null,
        masked: false, // Default to not masked
      };

      // Create metadata object for optional fields
      const metadata: NoteMetadata = {
        tags: oldNote.tags,
        pinned: oldNote.pinned,
        encrypted: oldNote.encrypted || false,
        contentEncryptionMetadata: oldNote.encryptionMetadata, // Map old field to new
      };

      return { note: newNote, metadata };
    } catch (error) {
      this.logError(oldNote.id, error instanceof Error ? error.message : String(error), oldNote);
      return null;
    }
  }

  /**
   * Normalize URL to consistent format
   */
  private static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url; // Return as-is if invalid
    }
  }

  /**
   * Normalize color to #RRGGBB format
   */
  private static normalizeColor(color: string): string {
    if (!color) return '#FFF9E6'; // Default yellow

    // Already in hex format
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color.toUpperCase();
    }

    // Convert short hex (#RGB) to full (#RRGGBB)
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
      const r = color[1];
      const g = color[2];
      const b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }

    // Named colors to hex mapping (common ones)
    const colorMap: Record<string, string> = {
      'yellow': '#FFF9E6',
      'blue': '#E3F2FD',
      'green': '#E8F5E9',
      'pink': '#FCE4EC',
      'purple': '#F3E5F5',
      'orange': '#FFF3E0',
    };

    return colorMap[color.toLowerCase()] || '#FFF9E6';
  }

  /**
   * Log migration error
   */
  private static logError(noteId: string, error: string, originalData: any): void {
    this.errors.push({
      noteId,
      error,
      originalData,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all migration errors
   */
  static getErrors(): MigrationError[] {
    return [...this.errors];
  }

  /**
   * Export errors to JSON file
   */
  static async exportErrors(): Promise<void> {
    if (this.errors.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quietnote_migration_errors_${timestamp}.json`;
    const content = JSON.stringify(this.errors, null, 2);

    // Create download link
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Clear errors
   */
  static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Batch migrate all notes from storage
   */
  static async migrateAllNotes(
    storage: any,
    defaultPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right',
    defaultSize: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<{
    migrated: Array<{ note: Note; metadata: NoteMetadata; oldKey: string; newKey: string }>;
    failed: number;
  }> {
    this.clearErrors();
    const migrated: Array<{ note: Note; metadata: NoteMetadata; oldKey: string; newKey: string }> = [];

    for (const [key, value] of Object.entries(storage)) {
      if (!key.startsWith('note:')) continue;

      const oldNote = value as OldNote;

      // Check if already migrated (has position/size and pageURL property)
      if (
        oldNote.position &&
        oldNote.size &&
        oldNote.hasOwnProperty('pageURL')
      ) {
        console.log(`⏭️ Skipping already migrated: ${oldNote.id}`);
        continue;
      }

      const result = this.migrateNote(oldNote, defaultPosition, defaultSize);

      if (result) {
        // Build new storage key
        const newKey = result.note.pageURL
          ? `note:${result.note.pageURL}:${result.note.id}`
          : `note:${result.note.id}`;

        migrated.push({
          ...result,
          oldKey: key,
          newKey: newKey,
        });
      }
    }

    return {
      migrated,
      failed: this.errors.length,
    };
  }

  /**
   * Check if migration is needed
   */
  static needsMigration(note: any): boolean {
    // Check if note has old schema (missing position, size, or has url instead of pageURL)
    return (
      !note.position ||
      !note.size ||
      note.url !== undefined ||
      note.pageURL === undefined
    );
  }

  /**
   * Detect schema version
   */
  static detectSchemaVersion(note: any): 'v1' | 'v2' {
    if (this.needsMigration(note)) {
      return 'v1'; // Old schema
    }
    return 'v2'; // New schema
  }
}

/**
 * Auto-run migration on module load if needed
 * This function should be called from background.js on extension startup
 */
export async function autoMigrate(): Promise<void> {
  try {
    // Type assertion for chrome API
    const chromeAPI = (globalThis as any).chrome;
    if (!chromeAPI?.storage?.local) {
      console.error('Chrome storage API not available');
      return;
    }

    // Check if migration flag is set
    const migrationDone = await chromeAPI.storage.local.get('migration_v2_done');

    if (migrationDone['migration_v2_done']) {
      console.log('✅ Migration already completed');
      return;
    }

    console.log('🚀 Starting automatic migration to v2 schema...');

    // Get all storage
    const allStorage = await chromeAPI.storage.local.get(null);

    // Get settings for defaults
    const settings = allStorage.settings || {};
    const defaultPosition = settings.defaultNotePosition || 'top-right';
    const defaultSize = settings.defaultNoteSize || 'medium';

    // Migrate all notes
    const result = await MigrationManager.migrateAllNotes(
      allStorage,
      defaultPosition,
      defaultSize
    );

    console.log(`📊 Migration stats: ${result.migrated.length} migrated, ${result.failed} failed`);

    // Save migrated notes back to storage and delete old keys
    const updates: Record<string, any> = {};
    const toDelete: string[] = [];

    for (const { note, metadata, oldKey, newKey } of result.migrated) {
      // Store note with metadata embedded
      updates[newKey] = {
        ...note,
        _metadata: metadata, // Store metadata separately with _ prefix
      };

      // Mark old key for deletion if different
      if (oldKey !== newKey) {
        toDelete.push(oldKey);
        console.log(`🔄 Migrating: ${oldKey} → ${newKey}`);
      }
    }

    // Save all migrated notes at once
    if (Object.keys(updates).length > 0) {
      console.log('💾 Saving migrated notes...');
      await chromeAPI.storage.local.set(updates);
    }

    // Delete old note keys with different format
    if (toDelete.length > 0) {
      console.log(`🗑️ Removing ${toDelete.length} old note keys...`);
      await chromeAPI.storage.local.remove(toDelete);
    }

    // Mark migration as done
    await chromeAPI.storage.local.set({ migration_v2_done: true });

    // Export errors if any
    if (result.failed > 0) {
      await MigrationManager.exportErrors();
      console.error(`⚠️ Migration completed with ${result.failed} errors. Check exported file.`);
    }

    console.log('✅ Migration completed successfully');
    console.log(`   Migrated: ${result.migrated.length} notes`);
    console.log(`   Failed: ${result.failed} notes`);
    console.log(`   Deleted old keys: ${toDelete.length}`);
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
    throw error;
  }
}
