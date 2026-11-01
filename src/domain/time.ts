export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day key, e.g. "2026-11-01". */
export function dayKey(t: number | Date): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Adds calendar days (DST-safe, unlike adding 24h). */
export function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Monday 00:00 of the week containing t. */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const offset = (d.getDay() + 6) % 7;
  return addDays(d.getTime(), -offset);
}

export function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/** "1h 25m", "25m", "40s" — compact human duration. */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / MINUTE);
  if (totalMin < 1) return ms > 0 ? `${Math.max(1, Math.round(ms / 1000))}s` : '0m';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Hours with one decimal, e.g. "12.5". */
export function formatHours(ms: number): string {
  const h = ms / HOUR;
  return h >= 100 ? Math.floor(h).toLocaleString() : (Math.floor(h * 10) / 10).toString();
}

/** Countdown clock: "24:59" or "1:29:59". Rounds up so 0.4s left still shows 0:01. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatTimeOfDay(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(t: number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Date(t).toLocaleDateString(undefined, opts);
}

/** "Today", "Yesterday", or a short date. */
export function relativeDay(t: number, now = Date.now()): string {
  const k = dayKey(t);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(addDays(now, -1))) return 'Yesterday';
  return formatDate(t, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function uid(): string {
  return crypto.randomUUID();
}
