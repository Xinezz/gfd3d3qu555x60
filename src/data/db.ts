import Dexie, { type Table } from 'dexie';
import type { AchievementUnlock, Note, Preset, Session, Subject } from '../domain/types';

/**
 * Local IndexedDB database. Bump the version and add an upgrade() when the schema changes,
 * never edit an existing version (that would break existing users' data).
 */
export class LockInDB extends Dexie {
  sessions!: Table<Session, string>;
  subjects!: Table<Subject, string>;
  presets!: Table<Preset, string>;
  notes!: Table<Note, string>;
  achievements!: Table<AchievementUnlock, string>;

  constructor() {
    super('lock-in');
    this.version(1).stores({
      sessions: 'id, startedAt, dayKey, subjectId, updatedAt',
      subjects: 'id, name, updatedAt',
      presets: 'id, updatedAt',
    });
    // v2 (Phase 2): study notes.
    this.version(2).stores({
      notes: 'id, subjectId, status, lastStudied, updatedAt',
    });
    // v3 (Phase 3): achievement unlocks.
    this.version(3).stores({
      achievements: 'id, unlockedAt, seenAt, updatedAt',
    });
  }
}

export const db = new LockInDB();

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isStoragePersistent(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
