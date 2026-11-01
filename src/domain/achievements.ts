import type { Session } from './types';
import { HOUR_MILESTONES } from './milestones';
import { addDays, dayKey, formatDuration, formatHours, HOUR, MINUTE } from './time';
import { live } from './stats';

/**
 * Achievements are pure functions of your recorded sessions. Unlock dates are the moment the
 * threshold was actually crossed (found by replaying history), not the moment the app noticed,
 * so achievements earned before this feature existed, or restored from a backup, get honest dates.
 */

export type Metric = 'focusMs' | 'bestStreak' | 'completedSessions' | 'longestSessionMs' | 'bestDayMs' | 'reflections';
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
export type CategoryId = 'getting-started' | 'long-term' | 'consistency' | 'sessions' | 'craft';

export interface Achievement {
  id: string;
  category: CategoryId;
  name: string;
  description: string;
  metric: Metric;
  threshold: number;
  tier: Tier;
}

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: 'getting-started', name: 'Getting Started', blurb: 'Your first hundred hours of focus.' },
  { id: 'long-term', name: 'Long-Term Milestones', blurb: 'The road to a thousand hours.' },
  { id: 'consistency', name: 'Consistency', blurb: 'Days in a row with at least one session.' },
  { id: 'sessions', name: 'Session Milestones', blurb: 'Full focus sessions completed.' },
  { id: 'craft', name: 'Deep Work', blurb: 'Depth, stamina and reflection.' },
];

const HOUR_TIERS: Record<string, Tier> = {
  'h-first-minute': 'bronze', 'h-1': 'bronze', 'h-5': 'bronze', 'h-10': 'silver', 'h-25': 'silver',
  'h-50': 'gold', 'h-100': 'gold', 'h-250': 'platinum', 'h-500': 'platinum', 'h-750': 'platinum', 'h-1000': 'legendary',
};

const LONG_TERM_COPY: Record<string, string> = {
  'h-250': '250 hours of focus. A quarter of the way to mastery.',
  'h-500': '500 hours of focus. Halfway to a thousand.',
  'h-750': '750 hours of focus. The summit is in sight.',
  'h-1000': 'A thousand hours of focused study. Few people ever get here. This is mastery.',
};

export const ACHIEVEMENTS: Achievement[] = [
  ...HOUR_MILESTONES.map((m) => ({
    id: m.id,
    category: (m.thresholdMs >= 250 * HOUR ? 'long-term' : 'getting-started') as CategoryId,
    name: m.name,
    description: LONG_TERM_COPY[m.id] ?? `Accumulate ${m.thresholdMs < HOUR ? 'your first minute' : `${formatHours(m.thresholdMs)} ${m.thresholdMs === HOUR ? 'hour' : 'hours'}`} of focus.`,
    metric: 'focusMs' as Metric,
    threshold: m.thresholdMs,
    tier: HOUR_TIERS[m.id],
  })),
  { id: 'streak-3', category: 'consistency', name: 'Three in a Row', description: 'Study 3 days in a row.', metric: 'bestStreak', threshold: 3, tier: 'bronze' },
  { id: 'streak-7', category: 'consistency', name: 'A Full Week', description: 'Study 7 days in a row.', metric: 'bestStreak', threshold: 7, tier: 'silver' },
  { id: 'streak-14', category: 'consistency', name: 'Two Weeks Strong', description: 'Study 14 days in a row.', metric: 'bestStreak', threshold: 14, tier: 'gold' },
  { id: 'streak-30', category: 'consistency', name: 'Month of Focus', description: 'Study 30 days in a row.', metric: 'bestStreak', threshold: 30, tier: 'platinum' },
  { id: 'streak-100', category: 'consistency', name: 'Hundred-Day Habit', description: 'Study 100 days in a row.', metric: 'bestStreak', threshold: 100, tier: 'platinum' },
  { id: 'sessions-10', category: 'sessions', name: 'Warming Up', description: 'Complete 10 full focus sessions.', metric: 'completedSessions', threshold: 10, tier: 'bronze' },
  { id: 'sessions-50', category: 'sessions', name: 'Half Century', description: 'Complete 50 full focus sessions.', metric: 'completedSessions', threshold: 50, tier: 'silver' },
  { id: 'sessions-100', category: 'sessions', name: 'Centurion', description: 'Complete 100 full focus sessions.', metric: 'completedSessions', threshold: 100, tier: 'gold' },
  { id: 'sessions-500', category: 'sessions', name: 'Unstoppable', description: 'Complete 500 full focus sessions.', metric: 'completedSessions', threshold: 500, tier: 'platinum' },
  { id: 'deep-90', category: 'craft', name: 'Deep Diver', description: 'Focus for 90 minutes in a single session.', metric: 'longestSessionMs', threshold: 90 * MINUTE, tier: 'silver' },
  { id: 'day-4h', category: 'craft', name: 'Marathon Day', description: 'Focus for 4 hours in a single day.', metric: 'bestDayMs', threshold: 4 * HOUR, tier: 'gold' },
  { id: 'reflect-10', category: 'craft', name: 'Reflective', description: 'Write 10 session reflections.', metric: 'reflections', threshold: 10, tier: 'bronze' },
  { id: 'reflect-50', category: 'craft', name: 'Self-Aware', description: 'Write 50 session reflections.', metric: 'reflections', threshold: 50, tier: 'silver' },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

export type Metrics = Record<Metric, number>;

const hasReflection = (s: Session) => !!s.reflection && !!(s.reflection.accomplished || s.reflection.nextTime || s.reflection.completedTask);

/**
 * Replays sessions in order, tracking every metric as it would have been at that moment, and
 * returns the time each achievement was first earned plus the final metrics.
 */
export function unlockTimeline(sessions: Session[]): { unlocked: Map<string, number>; metrics: Metrics } {
  const m: Metrics = { focusMs: 0, bestStreak: 0, completedSessions: 0, longestSessionMs: 0, bestDayMs: 0, reflections: 0 };
  const unlocked = new Map<string, number>();
  const dayTotals = new Map<string, number>();
  let lastDay = '';
  let run = 0;

  for (const s of [...live(sessions)].sort((a, b) => a.startedAt - b.startedAt)) {
    m.focusMs += s.focusMs;
    if (s.status === 'completed') m.completedSessions++;
    m.longestSessionMs = Math.max(m.longestSessionMs, s.focusMs);
    const day = (dayTotals.get(s.dayKey) ?? 0) + s.focusMs;
    dayTotals.set(s.dayKey, day);
    m.bestDayMs = Math.max(m.bestDayMs, day);
    if (hasReflection(s)) m.reflections++;
    if (s.dayKey !== lastDay) {
      const [y, mo, d] = s.dayKey.split('-').map(Number);
      run = lastDay === dayKey(addDays(new Date(y, mo - 1, d).getTime(), -1)) ? run + 1 : 1;
      lastDay = s.dayKey;
      m.bestStreak = Math.max(m.bestStreak, run);
    }
    for (const a of ACHIEVEMENTS) if (!unlocked.has(a.id) && m[a.metric] >= a.threshold) unlocked.set(a.id, s.endedAt);
  }
  return { unlocked, metrics: m };
}

export function progressOf(a: Achievement, m: Metrics) {
  const value = m[a.metric];
  return { value, ratio: Math.min(1, value / a.threshold) };
}

/** "12.5 / 25h", "4 / 7 days", "1h 10m / 1h 30m" — progress text for a locked achievement. */
export function progressLabel(a: Achievement, m: Metrics): string {
  const v = m[a.metric];
  switch (a.metric) {
    case 'focusMs':
      return a.threshold < HOUR ? `${formatDuration(v)} / 1m` : `${formatHours(v)} / ${formatHours(a.threshold)}h`;
    case 'bestStreak':
      return `best ${v} / ${a.threshold} days`;
    case 'longestSessionMs':
    case 'bestDayMs':
      return `best ${formatDuration(v)} / ${formatDuration(a.threshold)}`;
    default:
      return `${v} / ${a.threshold}`;
  }
}
