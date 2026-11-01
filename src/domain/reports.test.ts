import { describe, expect, it } from 'vitest';
import { bySubject, dailySeries, filterSessions, heatLevel, heatmap, monthlySeries, summary, weeklySeries } from './reports';
import { filterNotes } from './notes';
import { addDays, dayKey, HOUR, MINUTE } from './time';
import type { Note, Session } from './types';

const now = new Date(2026, 10, 4, 15, 0).getTime(); // Wed 4 Nov 2026

const session = (dayOffset: number, min: number, subjectId: string | null = null): Session => {
  const start = addDays(now, dayOffset) - 2 * HOUR;
  return {
    id: `${dayOffset}-${min}-${subjectId}`,
    createdAt: start,
    updatedAt: start,
    deletedAt: null,
    startedAt: start,
    endedAt: start + min * MINUTE,
    dayKey: dayKey(start),
    plannedMs: min * MINUTE,
    focusMs: min * MINUTE,
    pausedMs: 0,
    status: 'completed',
    subjectId,
    task: '',
    reflection: null,
    distractions: [],
    environmentId: 'rainy-window',
    musicId: null,
    companionId: 'timer',
  };
};

const data = [session(0, 50, 'math'), session(0, 25, 'cs'), session(-1, 90, 'math'), session(-9, 30), session(-40, 60, 'cs')];

describe('reports', () => {
  it('summarises totals, averages and the longest session', () => {
    const s = summary(data, now);
    expect(s.totalMs).toBe(255 * MINUTE);
    expect(s.count).toBe(5);
    expect(s.avgMs).toBe(51 * MINUTE);
    expect(s.longest?.focusMs).toBe(90 * MINUTE);
    expect(s.activeDays).toBe(4);
    expect(s.spanDays).toBe(41); // first session 40 days ago, inclusive of today
    expect(s.dailyAvgMs).toBeCloseTo((255 * MINUTE) / 41);
  });

  it('divides the daily average by the selected range', () => {
    const s = summary(data, now, { from: dayKey(addDays(now, -6)), to: dayKey(now) });
    expect(s.spanDays).toBe(7);
    expect(s.dailyAvgMs).toBeCloseTo((255 * MINUTE) / 7);
  });

  it('is empty-safe', () => {
    expect(summary([], now)).toMatchObject({ totalMs: 0, count: 0, avgMs: 0, longest: null, dailyAvgMs: 0 });
  });

  it('buckets by day, week and month', () => {
    const days = dailySeries(data, 14, now);
    expect(days).toHaveLength(14);
    expect(days.at(-1)).toMatchObject({ ms: 75 * MINUTE, current: true });
    expect(days.at(-2)!.ms).toBe(90 * MINUTE);
    expect(days.reduce((a, b) => a + b.ms, 0)).toBe(195 * MINUTE); // the 40-day-old session is out of range

    const weeks = weeklySeries(data, 8, now);
    expect(weeks.at(-1)!.ms).toBe(165 * MINUTE); // Mon 2 – Wed 4 Nov
    expect(weeks.reduce((a, b) => a + b.ms, 0)).toBe(255 * MINUTE);

    const months = monthlySeries(data, 3, now);
    expect(months.map((m) => m.ms / MINUTE)).toEqual([60, 30, 165]); // Sep, Oct, Nov
  });

  it('splits time by subject, largest first', () => {
    const slices = bySubject(data);
    expect(slices.map((s) => [s.subjectId, s.ms / MINUTE])).toEqual([['math', 140], ['cs', 85], [null, 30]]);
    expect(slices.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1);
  });

  it('filters by date range and subject', () => {
    expect(filterSessions(data, { subjectId: 'math' })).toHaveLength(2);
    expect(filterSessions(data, { subjectId: 'none' })).toHaveLength(1);
    expect(filterSessions(data, { from: dayKey(addDays(now, -1)), to: dayKey(now) })).toHaveLength(3);
  });

  it('builds a Monday-first heatmap with fixed levels', () => {
    const grid = heatmap(data, 4, now);
    expect(grid).toHaveLength(4);
    const thisWeek = grid.at(-1)!;
    expect(thisWeek[0].key).toBe('2026-11-02');
    expect(thisWeek[2]).toMatchObject({ key: '2026-11-04', level: 3, future: false });
    expect(thisWeek[3].future).toBe(true);
    expect([0, 10 * MINUTE, 45 * MINUTE, 3 * HOUR].map(heatLevel)).toEqual([0, 1, 2, 5]);
  });
});

describe('notes', () => {
  const note = (id: string, fields: Partial<Note>): Note => ({
    id,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    subjectId: 'js',
    topic: '',
    lastStudied: '2026-11-01',
    whereStopped: '',
    learnt: '',
    confused: '',
    nextSteps: '',
    status: 'in_progress',
    ...fields,
  });
  const notes = [
    note('a', { topic: 'Functions', learnt: 'parameters and return values', lastStudied: '2026-11-01' }),
    note('b', { topic: 'Loops', status: 'completed', lastStudied: '2026-11-03' }),
    note('c', { topic: 'Closures', confused: 'lexical scope', lastStudied: '2026-11-02' }),
    note('d', { topic: 'Vectors', subjectId: 'math', deletedAt: 5 }),
  ];

  it('searches every field with all words', () => {
    expect(filterNotes(notes, { query: 'return param' }).map((n) => n.id)).toEqual(['a']);
    expect(filterNotes(notes, { query: 'SCOPE' }).map((n) => n.id)).toEqual(['c']);
    expect(filterNotes(notes, { query: 'javascript' }, () => 'JavaScript').length).toBe(3);
  });

  it('puts in-progress first, most recently studied first, and hides deleted', () => {
    expect(filterNotes(notes, {}).map((n) => n.id)).toEqual(['c', 'a', 'b']);
    expect(filterNotes(notes, { status: 'completed' }).map((n) => n.id)).toEqual(['b']);
    expect(filterNotes(notes, { subjectId: 'math' })).toEqual([]);
  });
});
