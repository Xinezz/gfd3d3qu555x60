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

/* ---------- Study heatmap statistics ---------- */

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Headline numbers that sit beside the heatmap. All derived from saved sessions. */
export function heatmapStats(sessions: Session[], now = Date.now()) {
  const list = live(sessions);
  const byDay = new Map<string, number>();
  for (const s of list) byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + s.focusMs);

  let bestDay: { key: string; ms: number } | null = null;
  for (const [key, ms] of byDay) if (!bestDay || ms > bestDay.ms) bestDay = { key, ms };

  // Most productive weekday, by total focus time on that weekday.
  const weekdayMs = Array(7).fill(0) as number[];
  for (const [key, ms] of byDay) weekdayMs[(new Date(keyToTime(key)).getDay() + 6) % 7] += ms;
  const best = weekdayMs.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);

  // Weekly consistency: average active days per week, over the last 13 weeks (from your first active one).
  const weeks = heatmap(sessions, 13, now);
  const activePerWeek = weeks.map((w) => w.filter((c) => c.ms > 0).length);
  const firstActive = activePerWeek.findIndex((n) => n > 0);
  const counted = firstActive < 0 ? [] : activePerWeek.slice(firstActive);
  const avgActiveDays = counted.length ? counted.reduce((a, b) => a + b, 0) / counted.length : 0;

  const thisMonth = startOfMonth(now);
  const d = new Date(thisMonth);
  const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const inRange = (from: number, to: number) => list.filter((s) => { const t = keyToTime(s.dayKey); return t >= from && t < to; }).reduce((a, s) => a + s.focusMs, 0);
  // The same stretch of last month (1st to today's date, inclusive), for a fair month-to-date comparison.
  const sameDaysEnd = Math.min(addDays(lastMonth, new Date(now).getDate()), thisMonth);

  return {
    totalMs: list.reduce((a, s) => a + s.focusMs, 0),
    activeDays: byDay.size,
    bestDay,
    bestWeekday: weekdayMs[best] > 0 ? WEEKDAYS[best] : null,
    avgActiveDays,
    consistencyWeeks: counted.length,
    thisMonthMs: inRange(thisMonth, nextMonth),
    lastMonthMs: inRange(lastMonth, thisMonth),
    lastMonthToDateMs: inRange(lastMonth, sameDaysEnd),
  };
}

/* ---------- Focus quality ---------- */

export const FOCUS_LABELS = ['Scattered', 'Distracted', 'Okay', 'Focused', 'Locked in'];

export const rated = (sessions: Session[]) => live(sessions).filter((s) => typeof s.reflection?.focusRating === 'number' && s.reflection.focusRating >= 1);
const ratingOf = (s: Session) => s.reflection!.focusRating as number;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export const TIME_OF_DAY = [
  { id: 'morning', label: 'Morning', from: 5, to: 12 },
  { id: 'afternoon', label: 'Afternoon', from: 12, to: 17 },
  { id: 'evening', label: 'Evening', from: 17, to: 22 },
  { id: 'night', label: 'Night', from: 22, to: 29 },
] as const;

/** Ratings over time plus the patterns behind them. */
export function focusTrends(sessions: Session[], now = Date.now()) {
  const list = rated(sessions);
  const daily = dailySeries(list, 30, now).map((b) => {
    const day = list.filter((s) => s.dayKey === b.key);
    return { key: b.key, start: b.start, avg: avg(day.map(ratingOf)), count: day.length, current: b.current };
  });
  const since = (days: number) => startOfDay(addDays(now, -days + 1));
  const last7 = avg(list.filter((s) => s.startedAt >= since(7)).map(ratingOf));
  const prev7 = avg(list.filter((s) => s.startedAt >= since(14) && s.startedAt < since(7)).map(ratingOf));
  const byTime = TIME_OF_DAY.map((t) => {
    const xs = list.filter((s) => {
      const h = new Date(s.startedAt).getHours();
      const hh = h < 5 ? h + 24 : h;
      return hh >= t.from && hh < t.to;
    });
    return { id: t.id, label: t.label, avg: avg(xs.map(ratingOf)), count: xs.length };
  });
  // Most common answers to "What distracted you?" (case-insensitive, exact phrase).
  const counts = new Map<string, { text: string; n: number }>();
  for (const s of live(sessions)) {
    const t = s.reflection?.distractedBy?.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    counts.set(k, { text: counts.get(k)?.text ?? t, n: (counts.get(k)?.n ?? 0) + 1 });
  }
  return {
    count: list.length,
    overall: avg(list.map(ratingOf)),
    last7,
    prev7,
    daily,
    byTime,
    distractions: [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 4),
  };
}
