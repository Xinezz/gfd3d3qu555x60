/**
 * Backend-agnostic sync. A device pushes records it changed since its last push, then pulls
 * everything the server changed after its pull cursor. The server only accepts a row if it is
 * newer than what it has (see supabase/schema.sql), and pulled rows are merged locally with the
 * same rule, so devices converge no matter the order things happen in.
 */

export interface SyncRecord {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
}

export interface Row {
  collection: string;
  id: string;
  data: SyncRecord;
  updated_at: number;
}

export interface PulledRow extends Row {
  seq: number;
}

export interface RemoteStore {
  push(rows: Row[]): Promise<void>;
  /** Rows changed after `afterSeq`, oldest first, at most `limit`. */
  pull(afterSeq: number, limit: number): Promise<PulledRow[]>;
}

export interface LocalStore {
  /** Every record (any collection) whose updatedAt is greater than `since`. */
  changedSince(since: number): Promise<Row[]>;
  get(collection: string, id: string): Promise<SyncRecord | undefined>;
  /** Writes records exactly as given (no updatedAt bump). */
  write(collection: string, records: SyncRecord[]): Promise<void>;
}

export interface Cursor {
  /** Highest server seq applied locally. */
  pullSeq: number;
  /** Local time of the start of the last successful push. */
  pushAt: number;
}

export const EMPTY_CURSOR: Cursor = { pullSeq: 0, pushAt: 0 };

/**
 * Decides what to keep when a pulled record meets the local copy.
 * Default: newest updatedAt wins. Achievement unlocks merge instead: keep the earliest unlock
 * date and treat "already celebrated" as sticky, so no device re-celebrates.
 */
export function mergeRecord(collection: string, local: SyncRecord | undefined, incoming: SyncRecord, now: number): SyncRecord | null {
  if (!local) return incoming;
  if (collection === 'achievements') {
    const newer = incoming.updatedAt > local.updatedAt ? incoming : local;
    const seen = [local.seenAt, incoming.seenAt].filter((v): v is number => typeof v === 'number');
    const merged = {
      ...newer,
      unlockedAt: Math.min(Number(local.unlockedAt), Number(incoming.unlockedAt)),
      seenAt: seen.length ? Math.min(...seen) : null,
    };
    if (merged.unlockedAt === local.unlockedAt && merged.seenAt === local.seenAt && newer === local) return null;
    // If the merge differs from what the server sent, stamp it so it propagates back out.
    const sameAsIncoming = merged.unlockedAt === incoming.unlockedAt && merged.seenAt === incoming.seenAt && newer === incoming;
    // (+1 past `now`: the next push sends records strictly newer than this sync's start.)
    return sameAsIncoming ? merged : { ...merged, updatedAt: Math.max(now + 1, local.updatedAt + 1, incoming.updatedAt + 1) };
  }
  return incoming.updatedAt > local.updatedAt ? incoming : null;
}

const PUSH_BATCH = 400;
const PULL_PAGE = 1000;

export async function syncOnce(local: LocalStore, remote: RemoteStore, cursor: Cursor, now = Date.now()): Promise<{ cursor: Cursor; pushed: number; pulled: number }> {
  // Push first. Anything written while this runs has updatedAt >= now and goes next time.
  const changes = await local.changedSince(cursor.pushAt);
  for (let i = 0; i < changes.length; i += PUSH_BATCH) await remote.push(changes.slice(i, i + PUSH_BATCH));

  let pullSeq = cursor.pullSeq;
  let pulled = 0;
  const corrections: Row[] = [];
  for (;;) {
    const page = await remote.pull(pullSeq, PULL_PAGE);
    if (!page.length) break;
    const byCollection = new Map<string, SyncRecord[]>();
    for (const row of page) {
      const merged = mergeRecord(row.collection, await local.get(row.collection, row.id), row.data, now);
      if (merged) {
        byCollection.set(row.collection, [...(byCollection.get(row.collection) ?? []), merged]);
        // A merge that differs from the server's copy goes straight back up.
        if (merged !== row.data) corrections.push({ collection: row.collection, id: row.id, data: merged, updated_at: merged.updatedAt });
      }
      pullSeq = Math.max(pullSeq, row.seq);
    }
    for (const [collection, records] of byCollection) await local.write(collection, records);
    pulled += page.length;
    if (page.length < PULL_PAGE) break;
  }
  if (corrections.length) await remote.push(corrections);
  return { cursor: { pullSeq, pushAt: now }, pushed: changes.length + corrections.length, pulled };
}
