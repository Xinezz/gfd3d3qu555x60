import type { Table } from 'dexie';
import type { AchievementUnlock, BaseRecord, Note, Preset, Session, Subject, Task } from '../domain/types';
import { uid } from '../domain/time';
import { db } from './db';

/**
 * The storage boundary. UI code only talks to these repositories, never to IndexedDB, so a
 * cloud-backed implementation can be swapped in (or layered on top for sync) later.
 */
export interface Repo<T extends BaseRecord> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  put(record: T): Promise<T>;
  /** Inserts only if no record with this id exists (never overwrites). Resolves true if inserted. */
  create(record: T): Promise<boolean>;
  patch(id: string, changes: Partial<Omit<T, 'id'>>): Promise<void>;
  remove(id: string): Promise<void>;
}

function dexieRepo<T extends BaseRecord>(table: Table<T, string>): Repo<T> {
  return {
    all: async () => (await table.toArray()).filter((r) => !r.deletedAt),
    get: async (id) => {
      const r = await table.get(id);
      return r && !r.deletedAt ? r : undefined;
    },
    put: async (record) => {
      const r = { ...record, updatedAt: Date.now() };
      await table.put(r);
      return r;
    },
    create: async (record) => {
      try {
        await table.add(record);
        return true;
      } catch (e) {
        if ((e as Error).name === 'ConstraintError') return false;
        throw e;
      }
    },
    patch: async (id, changes) => {
      // Dexie's UpdateSpec typing doesn't accept a generic Partial<T>.
      await table.update(id, { ...changes, updatedAt: Date.now() } as never);
    },
    remove: async (id) => {
      await table.update(id, { deletedAt: Date.now(), updatedAt: Date.now() } as never);
    },
  };
}

export const sessionsRepo = dexieRepo<Session>(db.sessions);
export const subjectsRepo = dexieRepo<Subject>(db.subjects);
export const presetsRepo = dexieRepo<Preset>(db.presets);
export const notesRepo = dexieRepo<Note>(db.notes);
export const unlocksRepo = dexieRepo<AchievementUnlock>(db.achievements);
export const tasksRepo = dexieRepo<Task>(db.tasks);

export function newRecord<T extends object>(fields: T): T & BaseRecord {
  const now = Date.now();
  return { id: uid(), createdAt: now, updatedAt: now, deletedAt: null, ...fields };
}

/**
 * Subject colours double as chart series colours, so they are a validated categorical palette
 * (colour-blind separation and contrast checked against the dark card surface). Assigned in
 * this fixed order; subject charts are always direct-labelled, so a 9th+ subject reusing a
 * colour never relies on colour alone.
 */
export const SUBJECT_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

/** First palette colour no existing subject uses, so the first eight subjects are always distinct. */
export function nextSubjectColor(existing: { color: string }[]): string {
  const used = new Set(existing.map((s) => s.color));
  return SUBJECT_COLORS.find((c) => !used.has(c)) ?? SUBJECT_COLORS[existing.length % SUBJECT_COLORS.length];
}
