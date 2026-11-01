import { describe, expect, it } from 'vitest';
import { dueInfo, goalProgress, ongoingSubjects, sortTasks, taskProgress } from './planner';
import { focusTrends, heatmapStats } from './reports';
import { BACKUP_FORMAT, parseBackup } from '../data/merge';
import { addDays, dayKey, HOUR, MINUTE } from './time';
import type { Note, Session, Subject, Task } from './types';

const now = new Date(2026, 10, 4, 15, 0).getTime(); // Wed 4 Nov 2026

const base = (id: string, t = now) => ({ id, createdAt: t, updatedAt: t, deletedAt: null });

const session = (dayOffset: number, min: number, extra: Partial<Session> = {}): Session => {
  const start = addDays(now, dayOffset) - 2 * HOUR;
  return {
    ...base(`${dayOffset}-${min}-${extra.taskId ?? ''}-${extra.subjectId ?? ''}`, start),
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
    ...extra,
  };
};

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...base(id),
  title: id,
  subjectId: null,
  dueDate: null,
  estimateMin: null,
  priority: 'medium',
  done: false,
  completedAt: null,
  ...extra,
});

const rating = (focusRating: number, distractedBy = '') => ({ accomplished: '', completedTask: null, nextTime: '', focusRating, distractedBy });

describe('planner: tasks', () => {
  it('counts focus time of linked sessions toward a task', () => {
    const t = task('essay', { estimateMin: 120 });
    const sessions = [session(0, 50, { taskId: 'essay' }), session(-1, 25, { taskId: 'essay' }), session(0, 90, { taskId: 'other' }), { ...session(-2, 30, { taskId: 'essay' }), deletedAt: now }];
    expect(taskProgress(t, sessions)).toEqual({ spentMs: 75 * MINUTE, sessions: 2, estimateMs: 120 * MINUTE, ratio: 75 / 120 });
    expect(taskProgress(task('x'), sessions).ratio).toBeNull();
    expect(taskProgress({ ...t, estimateMin: 30 }, sessions).ratio).toBe(1);
  });

  it('sorts open tasks by deadline, then priority; done tasks last', () => {
    const list = [
      task('done-old', { done: true, completedAt: 1 }),
      task('undated-high', { priority: 'high' }),
      task('fri', { dueDate: '2026-11-06' }),
      task('thu-low', { dueDate: '2026-11-05', priority: 'low' }),
      task('thu-high', { dueDate: '2026-11-05', priority: 'high' }),
      task('done-new', { done: true, completedAt: 2 }),
      { ...task('deleted'), deletedAt: now },
    ];
    expect(sortTasks(list).map((t) => t.id)).toEqual(['thu-high', 'thu-low', 'fri', 'undated-high', 'done-new', 'done-old']);
  });

  it('describes deadlines relative to today', () => {
    expect(dueInfo(null, now).state).toBe('none');
    expect(dueInfo('2026-11-02', now)).toEqual({ label: 'Overdue by 2 days', state: 'overdue' });
    expect(dueInfo('2026-11-03', now)).toEqual({ label: 'Overdue by 1 day', state: 'overdue' });
    expect(dueInfo('2026-11-04', now)).toEqual({ label: 'Due today', state: 'today' });
    expect(dueInfo('2026-11-05', now)).toEqual({ label: 'Due tomorrow', state: 'soon' });
    expect(dueInfo('2026-11-07', now).state).toBe('soon');
    expect(dueInfo('2026-11-20', now).state).toBe('later');
  });
});

describe('planner: goals', () => {
  const sessions = [session(0, 60), session(-1, 30), session(-10, 120), session(-60, 300)];

  it('measures each goal against its own period', () => {
    const g = goalProgress(sessions, { dailyGoalMin: 120, weeklyGoalMin: 600, monthlyGoalMin: 0, longTermGoals: [{ id: 'g', label: '100 hours', targetHours: 100, createdAt: 0 }] }, now);
    expect(g.daily).toMatchObject({ doneMs: 60 * MINUTE, ratio: 0.5 });
    expect(g.weekly).toMatchObject({ doneMs: 90 * MINUTE, ratio: 90 / 600 });
    expect(g.monthly).toBeNull(); // 0 = off
    expect(g.longTerm[0]).toMatchObject({ doneMs: 510 * MINUTE, targetMs: 100 * HOUR });
  });

  it('caps the ratio at 1 and leaves history untouched when the target changes', () => {
    const lower = goalProgress(sessions, { dailyGoalMin: 30, weeklyGoalMin: 0, monthlyGoalMin: 0, longTermGoals: [] }, now);
    expect(lower.daily).toMatchObject({ doneMs: 60 * MINUTE, ratio: 1 });
    const higher = goalProgress(sessions, { dailyGoalMin: 600, weeklyGoalMin: 0, monthlyGoalMin: 0, longTermGoals: [] }, now);
    expect(higher.daily?.doneMs).toBe(60 * MINUTE);
  });
});

describe('planner: continue where you left off', () => {
  const subj = (id: string): Subject => ({ ...base(id), name: id, color: '#3987e5' });
  const note = (id: string, subjectId: string, lastStudied: string, status: Note['status'] = 'in_progress'): Note =>
    ({ ...base(id), subjectId, topic: id, status, lastStudied, whereStopped: '', learnt: '', confused: '', nextSteps: '' });

  it('lists subjects with open topics or recent sessions, newest first', () => {
    const subjects = [subj('math'), subj('cs'), subj('history'), subj('art')];
    const notes = [note('limits', 'math', '2026-10-20'), note('derivs', 'math', '2026-11-01'), note('rome', 'history', '2026-09-01', 'completed')];
    const sessions = [session(-1, 30, { subjectId: 'cs' }), session(-90, 30, { subjectId: 'history' }), session(0, 30, { subjectId: 'math' })];
    const out = ongoingSubjects(subjects, notes, sessions, now);
    expect(out.map((o) => o.subject.id)).toEqual(['math', 'cs']);
    expect(out[0].note?.topic).toBe('derivs');
    expect(out[0].lastStudied).toBe(dayKey(now));
    expect(out[1].note).toBeNull();
  });

  it('takes the newer of the note and the latest reflection, field by field', () => {
    const n = { ...note('derivs', 'math', '2026-11-02'), whereStopped: 'Chain rule', learnt: 'Product rule', nextSteps: 'Quotient rule' };
    const reflect = (dayOffset: number, r: Partial<Session['reflection'] & object>) =>
      session(dayOffset, 30, { subjectId: 'math', task: 'Worksheet', reflection: { accomplished: '', completedTask: null, nextTime: '', ...r } });

    // Reflection from today is newer than the note (2 Nov): its fields win, empty ones fall back.
    const [a] = ongoingSubjects([subj('math')], [n], [reflect(0, { accomplished: 'Problems 1-8', nextTime: 'Problem 9' })], now);
    expect(a).toMatchObject({ topic: 'derivs', whereStopped: 'Problems 1-8', learnt: 'Product rule', next: 'Problem 9' });

    // A reflection older than the note only fills gaps.
    const [b] = ongoingSubjects([subj('math')], [{ ...n, learnt: '' }], [reflect(-5, { accomplished: 'Old', learnt: 'Limits', nextTime: 'Old next' })], now);
    expect(b).toMatchObject({ whereStopped: 'Chain rule', learnt: 'Limits', next: 'Quotient rule' });

    // No note: everything comes from the session, including the topic.
    const [c] = ongoingSubjects([subj('math')], [], [reflect(-1, { nextTime: 'Problem 9' })], now);
    expect(c).toMatchObject({ topic: 'Worksheet', next: 'Problem 9', note: null });
  });
});

describe('heatmap stats and focus trends', () => {
  it('finds the best day, best weekday, consistency and month totals', () => {
    // now is Wed 4 Nov; -1 is Tue 3 Nov, -8 is Tue 27 Oct.
    const sessions = [session(0, 30), session(-1, 120), session(-8, 60), session(-8, 30)];
    const h = heatmapStats(sessions, now);
    expect(h.totalMs).toBe(240 * MINUTE);
    expect(h.activeDays).toBe(3);
    expect(h.bestDay).toEqual({ key: dayKey(addDays(now, -1)), ms: 120 * MINUTE });
    expect(h.bestWeekday).toBe('Tuesday');
    expect(h.thisMonthMs).toBe(150 * MINUTE);
    expect(h.lastMonthMs).toBe(90 * MINUTE);
    expect(h.lastMonthToDateMs).toBe(0); // 27 Oct is after 1–4 Oct
    expect(h.avgActiveDays).toBeCloseTo(3 / 2); // two weeks since the first active one
    expect(h.consistencyWeeks).toBe(2);
    expect(heatmapStats([], now)).toMatchObject({ totalMs: 0, bestDay: null, bestWeekday: null, avgActiveDays: 0 });
  });

  it('averages focus ratings and compares the last 7 days with the 7 before', () => {
    const sessions = [
      session(0, 30, { reflection: rating(5, 'Phone') }),
      session(-2, 30, { reflection: rating(3, 'phone') }),
      session(-9, 30, { reflection: rating(2, 'Noise') }),
      session(-3, 30), // unrated sessions are ignored
    ];
    const f = focusTrends(sessions, now);
    expect(f.count).toBe(3);
    expect(f.overall).toBeCloseTo(10 / 3);
    expect(f.last7).toBe(4);
    expect(f.prev7).toBe(2);
    expect(f.daily).toHaveLength(30);
    expect(f.daily.at(-1)).toMatchObject({ avg: 5, count: 1 });
    expect(f.byTime.find((t) => t.id === 'afternoon')).toMatchObject({ avg: 10 / 3, count: 3 }); // all start at 13:00
    expect(f.distractions[0]).toEqual({ text: 'Phone', n: 2 });
    expect(focusTrends([], now)).toMatchObject({ count: 0, overall: null, last7: null, prev7: null });
  });
});

describe('backup', () => {
  it('accepts planner tasks and older backups without them', () => {
    const t = task('t1');
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, sessions: [], subjects: [], presets: [], tasks: [t] })).tasks).toEqual([t]);
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, sessions: [], subjects: [], presets: [] })).tasks).toEqual([]);
  });
});
