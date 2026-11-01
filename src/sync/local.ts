import type { Table } from 'dexie';
import { db } from '../data/db';
import { getSettings, replaceSettings } from '../data/settings';
import type { LocalStore, Row, SyncRecord } from './engine';

/** What syncs: every IndexedDB table plus the settings object. The live timer stays per-device. */
const TABLES: Record<string, Table<SyncRecord, string>> = {
  sessions: db.sessions as unknown as Table<SyncRecord, string>,
  subjects: db.subjects as unknown as Table<SyncRecord, string>,
  presets: db.presets as unknown as Table<SyncRecord, string>,
  notes: db.notes as unknown as Table<SyncRecord, string>,
  achievements: db.achievements as unknown as Table<SyncRecord, string>,
};
const SETTINGS = 'settings';

const settingsRecord = (): SyncRecord => ({ ...getSettings(), id: SETTINGS });

export const dexieLocal: LocalStore = {
  async changedSince(since) {
    const rows: Row[] = [];
    for (const [collection, table] of Object.entries(TABLES)) {
      for (const r of await table.where('updatedAt').above(since).toArray()) rows.push({ collection, id: r.id, data: r, updated_at: r.updatedAt });
    }
    const s = settingsRecord();
    if (s.updatedAt > since) rows.push({ collection: SETTINGS, id: SETTINGS, data: s, updated_at: s.updatedAt });
    return rows;
  },
  async get(collection, id) {
    if (collection === SETTINGS) return settingsRecord();
    return TABLES[collection]?.get(id);
  },
  async write(collection, records) {
    if (collection === SETTINGS) {
      const { id: _id, ...settings } = records[records.length - 1];
      replaceSettings(settings);
      return;
    }
    // Unknown collections (from a newer app version) are ignored rather than crashing.
    await TABLES[collection]?.bulkPut(records);
  },
};
