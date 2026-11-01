import { describe, expect, it } from 'vitest';
import { EMPTY_CURSOR, mergeRecord, syncOnce, type Cursor, type LocalStore, type PulledRow, type RemoteStore, type Row, type SyncRecord } from './engine';

/** In-memory server with the same rules as supabase/schema.sql: newer-wins upsert + change counter. */
class FakeServer implements RemoteStore {
  rows = new Map<string, PulledRow>();
  private seq = 0;
  async push(rows: Row[]) {
    for (const r of rows) {
      const key = `${r.collection}/${r.id}`;
      const cur = this.rows.get(key);
      if (!cur || cur.updated_at < r.updated_at) this.rows.set(key, { ...r, seq: ++this.seq });
    }
  }
  async pull(afterSeq: number, limit: number) {
    return [...this.rows.values()].filter((r) => r.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit);
  }
}

class FakeDevice implements LocalStore {
  data = new Map<string, Map<string, SyncRecord>>();
  cursor: Cursor = EMPTY_CURSOR;
  constructor(public clock: { t: number }) {}
  table(c: string) {
    if (!this.data.has(c)) this.data.set(c, new Map());
    return this.data.get(c)!;
  }
  /** A local edit, like repo.put: stamps updatedAt with this device's clock. */
  edit(c: string, rec: Omit<SyncRecord, 'updatedAt'>) {
    this.table(c).set(rec.id as string, { ...rec, updatedAt: ++this.clock.t } as SyncRecord);
  }
  async changedSince(since: number) {
    const out: Row[] = [];
    for (const [collection, m] of this.data) for (const r of m.values()) if (r.updatedAt > since) out.push({ collection, id: r.id, data: r, updated_at: r.updatedAt });
    return out;
  }
  async get(c: string, id: string) {
    return this.table(c).get(id);
  }
  async write(c: string, recs: SyncRecord[]) {
    for (const r of recs) this.table(c).set(r.id, r);
  }
  async sync(server: FakeServer) {
    this.cursor = (await syncOnce(this, server, this.cursor, ++this.clock.t)).cursor;
  }
}

describe('sync engine', () => {
  it('converges two devices, newest edit wins', async () => {
    const clock = { t: 1000 };
    const server = new FakeServer();
    const a = new FakeDevice(clock);
    const b = new FakeDevice(clock);
    a.edit('notes', { id: 'n1', topic: 'Functions' });
    await a.sync(server);
    await b.sync(server);
    expect(b.table('notes').get('n1')?.topic).toBe('Functions');

    b.edit('notes', { id: 'n1', topic: 'Functions & closures' }); // later edit on B
    await b.sync(server);
    await a.sync(server);
    expect(a.table('notes').get('n1')?.topic).toBe('Functions & closures');
  });

  it("an older edit can't overwrite a newer one", async () => {
    const clock = { t: 1000 };
    const server = new FakeServer();
    const a = new FakeDevice(clock);
    const b = new FakeDevice(clock);
    a.edit('subjects', { id: 's', name: 'Old' });
    b.edit('subjects', { id: 's', name: 'New' }); // B edited later, offline
    await b.sync(server);
    await a.sync(server); // A pushes its older copy, which the server rejects, then pulls B's
    await b.sync(server);
    expect(a.table('subjects').get('s')?.name).toBe('New');
    expect(b.table('subjects').get('s')?.name).toBe('New');
  });

  it('propagates soft deletes', async () => {
    const clock = { t: 1000 };
    const server = new FakeServer();
    const a = new FakeDevice(clock);
    const b = new FakeDevice(clock);
    a.edit('sessions', { id: 'x', focusMs: 1, deletedAt: null });
    await a.sync(server);
    await b.sync(server);
    b.edit('sessions', { id: 'x', focusMs: 1, deletedAt: 5 });
    await b.sync(server);
    await a.sync(server);
    expect(a.table('sessions').get('x')?.deletedAt).toBe(5);
  });

  it('merges achievement unlocks: earliest date, never re-celebrated', async () => {
    const clock = { t: 1000 };
    const server = new FakeServer();
    const a = new FakeDevice(clock);
    const b = new FakeDevice(clock);
    a.edit('achievements', { id: 'h-1', unlockedAt: 500, seenAt: 900 }); // earned + celebrated on A
    b.edit('achievements', { id: 'h-1', unlockedAt: 700, seenAt: null }); // B noticed it later, not yet seen
    await a.sync(server);
    await b.sync(server); // B's newer-but-unseen copy wins on the server for now
    await a.sync(server); // A merges (earliest date, seen) and pushes the correction
    await b.sync(server); // B's next sync picks it up
    for (const d of [a, b]) expect(d.table('achievements').get('h-1')).toMatchObject({ unlockedAt: 500, seenAt: 900 });
    expect([...server.rows.values()][0].data).toMatchObject({ unlockedAt: 500, seenAt: 900 });
  });

  it('pages through large pulls and is idempotent', async () => {
    const clock = { t: 1000 };
    const server = new FakeServer();
    const a = new FakeDevice(clock);
    const b = new FakeDevice(clock);
    for (let i = 0; i < 2500; i++) a.edit('sessions', { id: `s${i}`, focusMs: i });
    await a.sync(server);
    await b.sync(server);
    expect(b.table('sessions').size).toBe(2500);
    const before = b.cursor.pullSeq;
    await b.sync(server); // nothing new
    expect(b.cursor.pullSeq).toBe(before);
  });

  it('mergeRecord keeps local when the incoming copy is not newer', () => {
    const local = { id: 'a', updatedAt: 10, v: 1 };
    expect(mergeRecord('notes', local, { id: 'a', updatedAt: 10, v: 2 }, 99)).toBeNull();
    expect(mergeRecord('notes', local, { id: 'a', updatedAt: 11, v: 2 }, 99)).toMatchObject({ v: 2 });
  });
});
