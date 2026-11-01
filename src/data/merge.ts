import type { BaseRecord } from '../domain/types';

/**
 * Last-write-wins merge by `updatedAt`. Used by backup import today and by cloud sync later.
 * Returns only the incoming records that should be written.
 */
export function recordsToWrite<T extends BaseRecord>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((r) => [r.id, r]));
  return incoming.filter((r) => {
    const cur = byId.get(r.id);
    return !cur || (r.updatedAt ?? 0) > (cur.updatedAt ?? 0);
  });
}

export const BACKUP_FORMAT = 'lock-in-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  sessions: BaseRecord[];
  subjects: BaseRecord[];
  presets: BaseRecord[];
  notes: BaseRecord[];
  achievements: BaseRecord[];
  tasks: BaseRecord[];
  settings: Record<string, unknown> | null;
}

const isRecord = (r: unknown): r is BaseRecord =>
  !!r && typeof r === 'object' && typeof (r as BaseRecord).id === 'string' && typeof (r as BaseRecord).updatedAt === 'number';

/** Throws a readable error if the file isn't a valid LOCK IN backup. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const b = data as Partial<BackupFile>;
  if (b?.format !== BACKUP_FORMAT) throw new Error('This is not a LOCK IN backup file.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION)
    throw new Error('This backup was made by a newer version of LOCK IN.');
  for (const key of ['sessions', 'subjects', 'presets', 'notes', 'achievements', 'tasks'] as const) {
    const list = b[key] ?? [];
    if (!Array.isArray(list) || !list.every(isRecord)) throw new Error(`The backup's ${key} look damaged.`);
  }
  return {
    format: BACKUP_FORMAT,
    version: b.version,
    exportedAt: b.exportedAt ?? 0,
    sessions: b.sessions ?? [],
    subjects: b.subjects ?? [],
    presets: b.presets ?? [],
    notes: b.notes ?? [],
    achievements: b.achievements ?? [],
    tasks: b.tasks ?? [],
    settings: b.settings ?? null,
  };
}
