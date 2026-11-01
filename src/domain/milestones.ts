import { HOUR, MINUTE } from './time';

/**
 * The cumulative focus-hour ladder. Phase 3's achievement system builds on these same
 * definitions; the dashboard and the plant companion already read them.
 */
export interface HourMilestone {
  id: string;
  name: string;
  thresholdMs: number;
  description: string;
}

export const HOUR_MILESTONES: HourMilestone[] = [
  { id: 'h-first-minute', name: 'First Minute', thresholdMs: MINUTE, description: 'Your first focused minute.' },
  { id: 'h-1', name: 'First Step', thresholdMs: 1 * HOUR, description: '1 hour of focus.' },
  { id: 'h-5', name: 'Getting Serious', thresholdMs: 5 * HOUR, description: '5 hours of focus.' },
  { id: 'h-10', name: 'Finding My Rhythm', thresholdMs: 10 * HOUR, description: '10 hours of focus.' },
  { id: 'h-25', name: 'Building Momentum', thresholdMs: 25 * HOUR, description: '25 hours of focus.' },
  { id: 'h-50', name: 'Dedicated Learner', thresholdMs: 50 * HOUR, description: '50 hours of focus.' },
  { id: 'h-100', name: 'Focused Mind', thresholdMs: 100 * HOUR, description: '100 hours of focus.' },
  { id: 'h-250', name: '250 Hours', thresholdMs: 250 * HOUR, description: '250 hours of focus.' },
  { id: 'h-500', name: '500 Hours', thresholdMs: 500 * HOUR, description: '500 hours of focus.' },
  { id: 'h-750', name: '750 Hours', thresholdMs: 750 * HOUR, description: '750 hours of focus.' },
  { id: 'h-1000', name: '1,000 Hours', thresholdMs: 1000 * HOUR, description: 'A thousand hours of focus. Mastery territory.' },
];

export function milestoneProgress(totalMs: number) {
  const reached = HOUR_MILESTONES.filter((m) => totalMs >= m.thresholdMs);
  const last = reached.at(-1) ?? null;
  const next = HOUR_MILESTONES.find((m) => totalMs < m.thresholdMs) ?? null;
  const fromMs = last?.thresholdMs ?? 0;
  const ratio = next ? (totalMs - fromMs) / (next.thresholdMs - fromMs) : 1;
  return { last, next, ratio: Math.min(1, Math.max(0, ratio)), reachedCount: reached.length };
}
