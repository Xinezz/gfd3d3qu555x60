import type { Session } from './types';
import { addDays, dayKey, startOfDay, startOfMonth, startOfWeek } from './time';

/** All statistics are derived from saved sessions; nothing here is stored separately. */

export const live = (sessions: Session[]) => sessions.filter((s) => !s.deletedAt);

export function totalFocusMs(sessions: Session[]): number {
  return live(sessions).reduce((sum, s) => sum + s.focusMs, 0);
}

export function focusByDay(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of live(sessions)) map.set(s.dayKey, (map.get(s.dayKey) ?? 0) + s.focusMs);
  return map;
}

export function inRange(sessions: Session[], from: number, to: number): Session[] {
  return live(sessions).filter((s) => s.startedAt >= from && s.startedAt < to);
}

export function rangeFocusMs(sessions: Session[], from: number, to: number): number {
  return totalFocusMs(inRange(sessions, from, to));
}

export function todayStats(sessions: Session[], now = Date.now()) {
  const today = inRange(sessions, startOfDay(now), addDays(startOfDay(now), 1));
  return { focusMs: totalFocusMs(today), count: today.length };
}

export const weekFocusMs = (sessions: Session[], now = Date.now()) =>
  rangeFocusMs(sessions, startOfWeek(now), addDays(startOfWeek(now), 7));

export function monthFocusMs(sessions: Session[], now = Date.now()) {
  const from = startOfMonth(now);
  const d = new Date(from);
  return rangeFocusMs(sessions, from, new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime());
}

/** Focus per day for the current Monday–Sunday week. */
export function currentWeekDays(sessions: Session[], now = Date.now()) {
  const byDay = focusByDay(sessions);
  const monday = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => {
    const t = addDays(monday, i);
    const key = dayKey(t);
    return { key, t, focusMs: byDay.get(key) ?? 0, isToday: key === dayKey(now), isFuture: t > now };
  });
}

/**
 * Consecutive study days. The current streak stays alive through today until midnight
 * (a streak ending yesterday still counts), so it doesn't read 0 every morning.
 */
export function streaks(sessions: Session[], now = Date.now()): { current: number; best: number } {
  const days = new Set(live(sessions).map((s) => s.dayKey));
  if (!days.size) return { current: 0, best: 0 };

  let current = 0;
  let cursor = days.has(dayKey(now)) ? now : addDays(now, -1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    if (days.has(dayKey(addDays(t, -1)))) continue; // not the start of a run
    let len = 0;
    let c = t;
    while (days.has(dayKey(c))) {
      len++;
      c = addDays(c, 1);
    }
    best = Math.max(best, len);
  }
  return { current, best: Math.max(best, current) };
}

export function recentSessions(sessions: Session[], n: number): Session[] {
  return [...live(sessions)].sort((a, b) => b.startedAt - a.startedAt).slice(0, n);
}
