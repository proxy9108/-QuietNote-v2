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
 */
const DEFAULT_POSITIONS = {
  'top-right': { x: window.innerWidth - 320, y: 20 },
  'top-left': { x: 20, y: 20 },
  'bottom-right': { x: window.innerWidth - 320, y: window.innerHeight - 220 },
  'bottom-left': { x: 20, y: window.innerHeight - 220 },
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
        encryptionMetadata: oldNote.encryptionMetadata,
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
    migrated: Array<{ note: Note; metadata: NoteMetadata }>;
    failed: number;
  }> {
    this.clearErrors();
    const migrated: Array<{ note: Note; metadata: NoteMetadata }> = [];

    for (const [key, value] of Object.entries(storage)) {
      if (!key.startsWith('note:')) continue;

      const oldNote = value as OldNote;
      const result = this.migrateNote(oldNote, defaultPosition, defaultSize);

      if (result) {
        migrated.push(result);
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
    // Check if migration flag is set
    const migrationDone = await chrome.storage.local.get('migration_v2_done');

    if (migrationDone['migration_v2_done']) {
      console.log('Migration already completed');
      return;
    }

    console.log('Starting automatic migration to v2 schema...');

    // Get all storage
    const allStorage = await chrome.storage.local.get();

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

    console.log(`Migration complete: ${result.migrated.length} migrated, ${result.failed} failed`);

    // Save migrated notes back to storage
    const updates: Record<string, any> = {};

    for (const { note, metadata } of result.migrated) {
      const key = note.pageURL
        ? `note:${note.pageURL}:${note.id}`
        : `note:${note.id}`;

      // Store note with metadata embedded
      updates[key] = {
        ...note,
        _metadata: metadata, // Store metadata separately with _ prefix
      };
    }

    // Save all at once
    await chrome.storage.local.set(updates);

    // Mark migration as done
    await chrome.storage.local.set({ migration_v2_done: true });

    // Export errors if any
    if (result.failed > 0) {
      await MigrationManager.exportErrors();
      console.error(`Migration completed with ${result.failed} errors. Check exported file.`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Auto-migration failed:', error);
    throw error;
  }
}
