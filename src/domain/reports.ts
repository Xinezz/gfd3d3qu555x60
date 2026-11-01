import type { Session } from './types';
import { addDays, dayKey, HOUR, MINUTE, startOfDay, startOfMonth, startOfWeek } from './time';
import { live } from './stats';

/** Focus Reports: everything here is derived from saved sessions. */

export interface ReportFilter {
  /** Inclusive local day keys (YYYY-MM-DD). */
  from?: string;
  to?: string;
  /** A subject id, 'none' for sessions without a subject, or undefined for all. */
  subjectId?: string;
}

export function filterSessions(sessions: Session[], f: ReportFilter): Session[] {
  return live(sessions).filter(
    (s) =>
      (!f.from || s.dayKey >= f.from) &&
      (!f.to || s.dayKey <= f.to) &&
      (!f.subjectId || (f.subjectId === 'none' ? !s.subjectId : s.subjectId === f.subjectId)),
  );
}

const keyToTime = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

/**
 * `span` sets the calendar range the daily average divides by (e.g. the selected period,
 * clipped to your first-ever session). Without it, the range starts at the first session given.
 */
export function summary(sessions: Session[], now = Date.now(), span?: { from?: string; to?: string }) {
  const list = live(sessions);
  const totalMs = list.reduce((a, s) => a + s.focusMs, 0);
  const longest = list.reduce<Session | null>((best, s) => (!best || s.focusMs > best.focusMs ? s : best), null);
  const activeDays = new Set(list.map((s) => s.dayKey)).size;
  // Daily average counts every calendar day in the range (rest days included).
  const first = span?.from ? keyToTime(span.from) : list.reduce((min, s) => Math.min(min, keyToTime(s.dayKey)), Infinity);
  const last = Math.min(startOfDay(now), span?.to ? keyToTime(span.to) : Infinity);
  const spanDays = list.length && last >= first ? Math.round((last - first) / (24 * HOUR)) + 1 : 0;
  return {
    totalMs,
    count: list.length,
    avgMs: list.length ? totalMs / list.length : 0,
    longest,
    activeDays,
    spanDays,
    dailyAvgMs: spanDays ? totalMs / spanDays : 0,
    activeDayAvgMs: activeDays ? totalMs / activeDays : 0,
  };
}

export interface Bucket {
  key: string;
  start: number;
  ms: number;
  count: number;
  current: boolean;
}

/** Sums sessions into ascending buckets; each bucket runs until the next one starts. */
function bucketize(sessions: Session[], starts: number[], current: number): Bucket[] {
  const buckets = starts.map((start) => ({ key: dayKey(start), start, ms: 0, count: 0, current: start === current }));
  for (const s of live(sessions)) {
    const t = keyToTime(s.dayKey);
    if (t < starts[0]) continue;
    let i = starts.length - 1;
    while (i > 0 && t < starts[i]) i--;
    buckets[i].ms += s.focusMs;
    buckets[i].count++;
  }
  return buckets;
}

export function dailySeries(sessions: Session[], days: number, now = Date.now()): Bucket[] {
  const today = startOfDay(now);
  const starts = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  return bucketize(sessions, starts, today);
}

export function weeklySeries(sessions: Session[], weeks: number, now = Date.now()): Bucket[] {
  const thisWeek = startOfWeek(now);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(thisWeek, (i - weeks + 1) * 7));
  return bucketize(sessions, starts, thisWeek);
}

export function monthlySeries(sessions: Session[], months: number, now = Date.now()): Bucket[] {
  const thisMonth = startOfMonth(now);
  const d = new Date(thisMonth);
  const starts = Array.from({ length: months }, (_, i) => new Date(d.getFullYear(), d.getMonth() - months + 1 + i, 1).getTime());
  return bucketize(sessions, starts, thisMonth);
}

export interface SubjectSlice {
  subjectId: string | null;
  ms: number;
  count: number;
  share: number;
}

export function bySubject(sessions: Session[]): SubjectSlice[] {
  const map = new Map<string | null, { ms: number; count: number }>();
  let total = 0;
  for (const s of live(sessions)) {
    const cur = map.get(s.subjectId) ?? { ms: 0, count: 0 };
    cur.ms += s.focusMs;
    cur.count++;
    total += s.focusMs;
    map.set(s.subjectId, cur);
  }
  return [...map.entries()]
    .map(([subjectId, v]) => ({ subjectId, ...v, share: total ? v.ms / total : 0 }))
    .sort((a, b) => b.ms - a.ms);
}

/** Fixed thresholds keep heatmap colours meaningful as your history grows. */
export const HEAT_LEVELS = [
  { min: 1, label: 'under 30m' },
  { min: 30 * MINUTE, label: '30m–1h' },
  { min: HOUR, label: '1–2h' },
  { min: 2 * HOUR, label: '2–3h' },
  { min: 3 * HOUR, label: '3h+' },
];

export const heatLevel = (ms: number) => {
  let level = 0;
  HEAT_LEVELS.forEach((l, i) => {
    if (ms >= l.min) level = i + 1;
  });
  return level;
};

export interface HeatCell {
  key: string;
  t: number;
  ms: number;
  level: number;
  future: boolean;
}

/** Columns of Monday–Sunday weeks, oldest first, ending with the current week. */
export function heatmap(sessions: Session[], weeks: number, now = Date.now()): HeatCell[][] {
  const byDay = new Map<string, number>();
  for (const s of live(sessions)) byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + s.focusMs);
  const thisWeek = startOfWeek(now);
  const today = startOfDay(now);
  return Array.from({ length: weeks }, (_, w) => {
    const monday = addDays(thisWeek, (w - weeks + 1) * 7);
    return Array.from({ length: 7 }, (_, d) => {
      const t = addDays(monday, d);
      const key = dayKey(t);
      const ms = byDay.get(key) ?? 0;
      return { key, t, ms, level: heatLevel(ms), future: t > today };
    });
  });
}
