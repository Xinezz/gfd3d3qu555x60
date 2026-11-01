import type { Note, Session, Settings, Subject, Task, TaskPriority } from './types';
import { addDays, dayKey, HOUR, MINUTE, startOfDay } from './time';
import { live, monthFocusMs, todayStats, totalFocusMs, weekFocusMs } from './stats';

/* ---------- Tasks ---------- */

/** Time spent on a task = focus time of sessions linked to it. */
export function taskProgress(task: Task, sessions: Session[]) {
  const linked = live(sessions).filter((s) => s.taskId === task.id);
  const spentMs = linked.reduce((a, s) => a + s.focusMs, 0);
  const estimateMs = task.estimateMin ? task.estimateMin * MINUTE : null;
  return { spentMs, sessions: linked.length, estimateMs, ratio: estimateMs ? Math.min(1, spentMs / estimateMs) : null };
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

/** Open tasks first; then by due date (undated last), then priority, then oldest first. Done tasks: most recent first. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].filter((t) => !t.deletedAt).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    if (a.dueDate !== b.dueDate) return !a.dueDate ? 1 : !b.dueDate ? -1 : a.dueDate.localeCompare(b.dueDate);
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return a.createdAt - b.createdAt;
  });
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none';

/** Human due label and urgency, e.g. "Overdue by 2 days", "Due today", "Due Fri, 7 Nov". */
export function dueInfo(dueDate: string | null, now = Date.now()): { label: string; state: DueState } {
  if (!dueDate) return { label: 'No deadline', state: 'none' };
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const days = Math.round((due - startOfDay(now)) / (24 * HOUR));
  if (days < 0) return { label: `Overdue by ${-days} ${days === -1 ? 'day' : 'days'}`, state: 'overdue' };
  if (days === 0) return { label: 'Due today', state: 'today' };
  if (days === 1) return { label: 'Due tomorrow', state: 'soon' };
  const label = `Due ${new Date(due).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  return { label, state: days <= 3 ? 'soon' : 'later' };
}

/* ---------- Goals ---------- */

export interface GoalProgress {
  id: string;
  label: string;
  doneMs: number;
  targetMs: number;
  ratio: number;
}

/** Daily / weekly / monthly / long-term progress. Goals are targets only; changing them never touches history. */
export function goalProgress(sessions: Session[], s: Pick<Settings, 'dailyGoalMin' | 'weeklyGoalMin' | 'monthlyGoalMin' | 'longTermGoals'>, now = Date.now()) {
  const make = (id: string, label: string, doneMs: number, targetMin: number): GoalProgress | null =>
    targetMin > 0 ? { id, label, doneMs, targetMs: targetMin * MINUTE, ratio: Math.min(1, doneMs / (targetMin * MINUTE)) } : null;
  const total = totalFocusMs(sessions);
  return {
    daily: make('daily', 'Today', todayStats(sessions, now).focusMs, s.dailyGoalMin),
    weekly: make('weekly', 'This week', weekFocusMs(sessions, now), s.weeklyGoalMin),
    monthly: make('monthly', 'This month', monthFocusMs(sessions, now), s.monthlyGoalMin),
    longTerm: s.longTermGoals.map((g) => ({ id: g.id, label: g.label, doneMs: total, targetMs: g.targetHours * HOUR, ratio: Math.min(1, total / (g.targetHours * HOUR)) })),
  };
}

/* ---------- Continue where you left off ---------- */

export interface Ongoing {
  subject: Subject;
  lastStudied: string | null;
  /** The most recently studied in-progress note for this subject. */
  note: Note | null;
  lastSession: Session | null;
  topic: string;
  whereStopped: string;
  learnt: string;
  next: string;
}

/**
 * Subjects you're actively studying: any with an in-progress note or a session in the last
 * 30 days, newest first. The topic comes from your notebook when there is one; the other
 * fields come from whichever is newer, the note or your latest reflection, falling back to
 * the other when that one left a field empty.
 */
export function ongoingSubjects(subjects: Subject[], notes: Note[], sessions: Session[], now = Date.now(), limit = 4): Ongoing[] {
  const cutoff = dayKey(addDays(now, -30));
  const out: Ongoing[] = [];
  for (const subject of subjects.filter((s) => !s.deletedAt)) {
    const open = notes.filter((n) => !n.deletedAt && n.subjectId === subject.id && n.status === 'in_progress').sort((a, b) => b.lastStudied.localeCompare(a.lastStudied) || b.updatedAt - a.updatedAt);
    const lastSession = live(sessions)
      .filter((x) => x.subjectId === subject.id)
      .reduce<Session | null>((best, x) => (!best || x.startedAt > best.startedAt ? x : best), null);
    if (!open.length && !(lastSession && lastSession.dayKey >= cutoff)) continue;
    const note = open[0] ?? null;
    const r = lastSession?.reflection;
    const fromSession = { whereStopped: r?.accomplished ?? '', learnt: r?.learnt ?? '', next: r?.nextTime ?? '' };
    const fromNote = { whereStopped: note?.whereStopped ?? '', learnt: note?.learnt ?? '', next: note?.nextSteps ?? '' };
    const sessionNewer = !!lastSession && (!note || lastSession.dayKey > note.lastStudied);
    const [first, second] = sessionNewer ? [fromSession, fromNote] : [fromNote, fromSession];
    const dates = [lastSession?.dayKey, note?.lastStudied].filter((d): d is string => !!d).sort();
    out.push({
      subject,
      note,
      lastSession,
      lastStudied: dates.at(-1) ?? null,
      topic: note?.topic || lastSession?.task || '',
      whereStopped: first.whereStopped.trim() || second.whereStopped.trim(),
      learnt: first.learnt.trim() || second.learnt.trim(),
      next: first.next.trim() || second.next.trim(),
    });
  }
  return out.sort((a, b) => (b.lastStudied ?? '').localeCompare(a.lastStudied ?? '')).slice(0, limit);
}
