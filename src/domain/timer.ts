import type { Distraction, ID } from './types';
import { MINUTE, uid } from './time';

/**
 * Timestamp-based timer. Remaining time is always derived from wall-clock timestamps
 * (`endsAt - now`), never from a counter that ticks, so background tabs, minimised windows and
 * sleeping laptops can't make it drift. Every function is pure: (state, now) -> state.
 */

export type Phase = 'focus' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface LiveTimer {
  /** Id of the focus session; becomes the saved Session's id, making saves idempotent. */
  id: ID;
  phase: Phase;
  status: TimerStatus;
  durationMs: number;
  /** First time this phase was started. */
  startedAt: number | null;
  /** Projected end. While paused it is frozen and shifted forward on resume. */
  endsAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  focusMin: number;
  breakMin: number;
  subjectId: ID | null;
  task: string;
  /** Linked planner task, if one was picked. */
  taskId: ID | null;
  distractions: Distraction[];
}

export interface TimerConfig {
  focusMin: number;
  breakMin: number;
}

export function idleTimer(cfg: TimerConfig, keep?: Pick<LiveTimer, 'subjectId' | 'task'> & { taskId?: ID | null }): LiveTimer {
  return {
    id: uid(),
    phase: 'focus',
    status: 'idle',
    durationMs: cfg.focusMin * MINUTE,
    startedAt: null,
    endsAt: null,
    pausedAt: null,
    pausedMs: 0,
    focusMin: cfg.focusMin,
    breakMin: cfg.breakMin,
    subjectId: keep?.subjectId ?? null,
    task: keep?.task ?? '',
    taskId: keep?.taskId ?? null,
    distractions: [],
  };
}

export function start(t: LiveTimer, now: number): LiveTimer {
  if (t.status !== 'idle') return t;
  return { ...t, status: 'running', startedAt: now, endsAt: now + t.durationMs, pausedAt: null, pausedMs: 0 };
}

export function pause(t: LiveTimer, now: number): LiveTimer {
  if (t.status !== 'running') return t;
  return { ...t, status: 'paused', pausedAt: Math.min(now, t.endsAt ?? now) };
}

export function resume(t: LiveTimer, now: number): LiveTimer {
  if (t.status !== 'paused' || t.pausedAt == null || t.endsAt == null) return t;
  const gap = Math.max(0, now - t.pausedAt);
  return { ...t, status: 'running', endsAt: t.endsAt + gap, pausedMs: t.pausedMs + gap, pausedAt: null };
}

/** Starts a break phase that keeps the session context (subject, task). */
export function breakTimer(t: LiveTimer, now: number): LiveTimer {
  const durationMs = t.breakMin * MINUTE;
  return {
    ...t,
    phase: 'break',
    status: 'running',
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
    pausedAt: null,
    pausedMs: 0,
    distractions: [],
  };
}

export function remainingMs(t: LiveTimer, now: number): number {
  if (t.status === 'idle' || t.endsAt == null) return t.durationMs;
  const ref = t.status === 'paused' && t.pausedAt != null ? t.pausedAt : now;
  return Math.max(0, Math.min(t.durationMs, t.endsAt - ref));
}

/** Focused (non-paused) time elapsed in the current phase. */
export const elapsedMs = (t: LiveTimer, now: number) => t.durationMs - remainingMs(t, now);

export const progress = (t: LiveTimer, now: number) => (t.durationMs ? elapsedMs(t, now) / t.durationMs : 0);

export const isDue = (t: LiveTimer, now: number) => t.status === 'running' && t.endsAt != null && now >= t.endsAt;

/** Pause time including a pause that is still ongoing. */
export function totalPausedMs(t: LiveTimer, now: number): number {
  return t.pausedMs + (t.status === 'paused' && t.pausedAt != null ? Math.max(0, now - t.pausedAt) : 0);
}

/** Minimum focus worth recording as a session. */
export const MIN_SESSION_MS = MINUTE;
