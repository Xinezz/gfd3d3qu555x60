import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, progressLabel, unlockTimeline } from './achievements';
import { addDays, dayKey, HOUR, MINUTE } from './time';
import type { Session } from './types';

const base = new Date(2026, 9, 1, 9, 0).getTime(); // 1 Oct 2026, 09:00
let n = 0;
const session = (day: number, min: number, opts: Partial<Session> = {}): Session => {
  const start = addDays(base, day) + (n++ % 5) * HOUR;
  return {
    id: String(n),
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
    subjectId: null,
    task: '',
    reflection: null,
    distractions: [],
    environmentId: 'rainy-window',
    musicId: null,
    companionId: 'timer',
    ...opts,
  };
};

describe('achievements', () => {
  it('has unique ids and every category represented', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'legendary').map((a) => a.id)).toEqual(['h-1000']);
  });

  it('dates each unlock at the session that crossed the threshold', () => {
    const s1 = session(0, 30);
    const s2 = session(1, 40); // total 70m → First Step (1h) crossed here
    const { unlocked, metrics } = unlockTimeline([s2, s1]); // order-independent
    expect(unlocked.get('h-first-minute')).toBe(s1.endedAt);
    expect(unlocked.get('h-1')).toBe(s2.endedAt);
    expect(unlocked.has('h-5')).toBe(false);
    expect(metrics.focusMs).toBe(70 * MINUTE);
  });

  it('tracks the best streak, not just the current one', () => {
    const list = [session(0, 25), session(1, 25), session(2, 25), session(5, 25)];
    const { unlocked, metrics } = unlockTimeline(list);
    expect(metrics.bestStreak).toBe(3);
    expect(unlocked.get('streak-3')).toBe(list[2].endedAt);
  });

  it('counts only full sessions toward session milestones, but all focus toward hours', () => {
    const list = Array.from({ length: 10 }, (_, i) => session(i, 25, i === 9 ? { status: 'ended_early' } : {}));
    const { unlocked, metrics } = unlockTimeline(list);
    expect(metrics.completedSessions).toBe(9);
    expect(unlocked.has('sessions-10')).toBe(false);
    expect(metrics.focusMs).toBe(250 * MINUTE);
  });

  it('awards depth, stamina and reflection achievements', () => {
    const reflected = { reflection: { accomplished: 'x', completedTask: null, nextTime: '' } };
    const list = [session(0, 90), session(1, 120), session(1, 130), ...Array.from({ length: 10 }, (_, i) => session(3 + i, 25, reflected))];
    const { unlocked } = unlockTimeline(list);
    expect(unlocked.get('deep-90')).toBe(list[0].endedAt);
    expect(unlocked.get('day-4h')).toBe(list[2].endedAt);
    expect(unlocked.has('reflect-10')).toBe(true);
  });

  it('ignores deleted sessions and labels progress', () => {
    const { metrics } = unlockTimeline([session(0, 600, { deletedAt: 1 })]);
    expect(metrics.focusMs).toBe(0);
    const h25 = ACHIEVEMENTS.find((a) => a.id === 'h-25')!;
    expect(progressLabel(h25, { ...metrics, focusMs: 12.5 * HOUR })).toBe('12.5 / 25h');
  });
});
