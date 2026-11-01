import { describe, expect, it } from 'vitest';
import * as T from './timer';
import { streaks, todayStats, weekFocusMs } from './stats';
import { milestoneProgress } from './milestones';
import { addDays, dayKey, formatClock, HOUR, MINUTE } from './time';
import type { Session } from './types';
import { parseBackup, recordsToWrite } from '../data/merge';

const t0 = new Date(2026, 10, 2, 9, 0, 0).getTime(); // Mon 2 Nov 2026, 09:00

describe('timer', () => {
  const idle = T.idleTimer({ focusMin: 25, breakMin: 5 });

  it('counts down from wall-clock time, not ticks', () => {
    const run = T.start(idle, t0);
    expect(T.remainingMs(run, t0)).toBe(25 * MINUTE);
    // A background tab that got no ticks for 10 minutes still reads correctly.
    expect(T.remainingMs(run, t0 + 10 * MINUTE)).toBe(15 * MINUTE);
    expect(T.isDue(run, t0 + 25 * MINUTE - 1)).toBe(false);
    expect(T.isDue(run, t0 + 25 * MINUTE)).toBe(true);
  });

  it('freezes while paused and shifts the end on resume', () => {
    let t = T.start(idle, t0);
    t = T.pause(t, t0 + 5 * MINUTE);
    expect(T.remainingMs(t, t0 + 60 * MINUTE)).toBe(20 * MINUTE);
    expect(T.isDue(t, t0 + 60 * MINUTE)).toBe(false);
    expect(T.totalPausedMs(t, t0 + 7 * MINUTE)).toBe(2 * MINUTE);
    t = T.resume(t, t0 + 15 * MINUTE);
    expect(t.pausedMs).toBe(10 * MINUTE);
    expect(T.remainingMs(t, t0 + 15 * MINUTE)).toBe(20 * MINUTE);
    expect(T.isDue(t, t0 + 35 * MINUTE)).toBe(true);
  });

  it('survives a JSON round trip (page refresh)', () => {
    const run = T.start(idle, t0);
    const restored = JSON.parse(JSON.stringify(run)) as T.LiveTimer;
    expect(T.remainingMs(restored, t0 + 3 * MINUTE)).toBe(22 * MINUTE);
  });

  it('never reports more than the duration or less than zero', () => {
    const run = T.start(idle, t0);
    expect(T.remainingMs(run, t0 - 5000)).toBe(25 * MINUTE);
    expect(T.remainingMs(run, t0 + 99 * HOUR)).toBe(0);
    expect(T.progress(run, t0 + 99 * HOUR)).toBe(1);
  });

  it('runs a break with the break length', () => {
    const b = T.breakTimer(T.start(idle, t0), t0 + 25 * MINUTE);
    expect(b.phase).toBe('break');
    expect(T.remainingMs(b, t0 + 25 * MINUTE)).toBe(5 * MINUTE);
  });

  it('formats the clock', () => {
    expect(formatClock(25 * MINUTE)).toBe('25:00');
    expect(formatClock(400)).toBe('00:01');
    expect(formatClock(90 * MINUTE)).toBe('1:30:00');
  });
});

const session = (start: number, focusMin: number): Session => ({
  id: String(start),
  createdAt: start,
  updatedAt: start,
  deletedAt: null,
  startedAt: start,
  endedAt: start + focusMin * MINUTE,
  dayKey: dayKey(start),
  plannedMs: focusMin * MINUTE,
  focusMs: focusMin * MINUTE,
  pausedMs: 0,
  status: 'completed',
  subjectId: null,
  task: '',
  reflection: null,
  distractions: [],
  environmentId: 'rainy-window',
  musicId: null,
  companionId: 'timer',
});

describe('stats', () => {
  it('computes streaks that survive until midnight', () => {
    const s = [session(addDays(t0, -2), 25), session(addDays(t0, -1), 25)];
    expect(streaks(s, t0)).toEqual({ current: 2, best: 2 });
    expect(streaks([...s, session(t0, 25)], t0)).toEqual({ current: 3, best: 3 });
    expect(streaks(s, addDays(t0, 2)).current).toBe(0);
  });

  it('finds the best run separately from the current one', () => {
    const s = [-10, -9, -8, -7, -1].map((d) => session(addDays(t0, d), 25));
    expect(streaks(s, t0)).toEqual({ current: 1, best: 4 });
  });

  it('ignores soft-deleted sessions', () => {
    const del = { ...session(t0, 50), deletedAt: t0 };
    expect(todayStats([session(t0, 25), del], t0)).toEqual({ focusMs: 25 * MINUTE, count: 1 });
  });

  it('sums the Monday-based week', () => {
    const s = [session(addDays(t0, -1), 60), session(t0, 30), session(addDays(t0, 6), 10)];
    expect(weekFocusMs(s, t0)).toBe(40 * MINUTE); // Sunday before is last week
  });

  it('tracks milestone progress', () => {
    const p = milestoneProgress(3 * HOUR);
    expect(p.last?.name).toBe('First Step');
    expect(p.next?.name).toBe('Getting Serious');
    expect(p.ratio).toBeCloseTo(0.5);
  });
});

describe('backup merge', () => {
  it('keeps the newer copy of each record', () => {
    const a = { ...session(t0, 25), updatedAt: 10 };
    const b = { ...session(t0, 30), updatedAt: 20 };
    expect(recordsToWrite([a], [b])).toEqual([b]);
    expect(recordsToWrite([b], [a])).toEqual([]);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/);
    expect(() => parseBackup('{"format":"x"}')).toThrow(/not a LOCK IN/);
    expect(parseBackup(JSON.stringify({ format: 'lock-in-backup', version: 1, sessions: [] })).sessions).toEqual([]);
  });
});
