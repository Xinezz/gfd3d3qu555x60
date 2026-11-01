import { useSyncExternalStore } from 'react';
import * as T from '../../domain/timer';
import type { Distraction, Reflection, Session } from '../../domain/types';
import { dayKey, uid } from '../../domain/time';
import { sessionsRepo } from '../../data/repo';
import { getSettings } from '../../data/settings';

/**
 * The live session lives outside React so it survives page navigation, and it is mirrored to
 * localStorage on every change (synchronously, so a refresh mid-write can't lose it). A session
 * that has ended is first written into the snapshot as `pendingSave`, then to IndexedDB; on the
 * next load any pendingSave is re-written. Saves are keyed by the session id, so repeats are harmless.
 */

export interface RoomState {
  timer: T.LiveTimer;
  /** Session awaiting the completion/reflection screen. */
  reviewId: string | null;
  pendingSave: Session | null;
}

export type SessionEvent =
  | { type: 'focus-start' }
  | { type: 'focus-end'; session: Session | null; early: boolean }
  | { type: 'break-end' }
  | { type: 'reset' };

const KEY = 'lockin.live.v1';

function freshState(): RoomState {
  const s = getSettings();
  return { timer: T.idleTimer({ focusMin: s.focusMin, breakMin: s.breakMin }), reviewId: null, pendingSave: null };
}

function load(): RoomState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RoomState;
      if (parsed?.timer?.id) return { ...parsed, reviewId: parsed.reviewId ?? null, pendingSave: parsed.pendingSave ?? null };
    }
  } catch {
    /* corrupted snapshot: start clean */
  }
  return freshState();
}

let state = load();
const listeners = new Set<() => void>();
const eventListeners = new Set<(e: SessionEvent) => void>();

function set(next: RoomState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore: state still lives in memory */
  }
  listeners.forEach((l) => l());
}

/** The audio module reports what is playing, so sessions can record it. */
let currentMusic: () => string | null = () => null;
export const registerMusicInfo = (fn: () => string | null) => void (currentMusic = fn);

const emit = (e: SessionEvent) => eventListeners.forEach((l) => l(e));
export const onSessionEvent = (l: (e: SessionEvent) => void) => {
  eventListeners.add(l);
  return () => void eventListeners.delete(l);
};

export const getRoom = () => state;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useRoom = () => useSyncExternalStore(subscribe, getRoom);

async function flushPendingSave() {
  const pending = state.pendingSave;
  if (!pending) return;
  await sessionsRepo.put(pending);
  if (state.pendingSave?.id === pending.id) set({ ...state, pendingSave: null });
}

function buildSession(t: T.LiveTimer, now: number, early: boolean): Session {
  const s = getSettings();
  const startedAt = t.startedAt ?? now;
  return {
    id: t.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    startedAt,
    endedAt: now,
    dayKey: dayKey(startedAt),
    plannedMs: t.durationMs,
    focusMs: early ? T.elapsedMs(t, now) : t.durationMs,
    pausedMs: T.totalPausedMs(t, now),
    status: early ? 'ended_early' : 'completed',
    subjectId: t.subjectId,
    task: t.task.trim(),
    taskId: t.taskId ?? null,
    reflection: null,
    distractions: t.distractions,
    environmentId: s.environmentId,
    musicId: currentMusic(),
    companionId: s.companionId,
  };
}

/** Ends the focus phase. Sessions under a minute are discarded rather than saved. */
function endFocus(early: boolean, now = Date.now()) {
  const t = state.timer;
  if (t.phase !== 'focus' || t.status === 'idle') return;
  const session = buildSession(t, now, early);
  const keep = T.elapsedMs(t, now) >= T.MIN_SESSION_MS;
  const nextTimer = T.idleTimer({ focusMin: t.focusMin, breakMin: t.breakMin }, t);
  set({ timer: nextTimer, reviewId: keep ? session.id : null, pendingSave: keep ? session : null });
  emit({ type: 'focus-end', session: keep ? session : null, early });
  if (keep) void flushPendingSave();
}

/** Called often (interval, tab focus, visibility change). Cheap when nothing is due. */
export function tick(now = Date.now()) {
  const t = state.timer;
  if (!T.isDue(t, now)) return;
  if (t.phase === 'focus') endFocus(false, t.endsAt ?? now);
  else {
    set({ ...state, timer: T.idleTimer({ focusMin: t.focusMin, breakMin: t.breakMin }, t) });
    emit({ type: 'break-end' });
  }
}

export const room = {
  configure(focusMin: number, breakMin: number) {
    if (state.timer.status !== 'idle') return;
    set({ ...state, timer: T.idleTimer({ focusMin, breakMin }, state.timer) });
  },
  setContext(ctx: { subjectId?: string | null; task?: string; taskId?: string | null }) {
    set({ ...state, timer: { ...state.timer, ...ctx } });
  },
  /** A planner task was completed: stop counting the next session toward it. */
  releaseTask(taskId: string, title: string) {
    const t = state.timer;
    if (t.status !== 'idle' || t.taskId !== taskId) return;
    set({ ...state, timer: { ...t, taskId: null, task: t.task.trim() === title ? '' : t.task } });
  },
  start() {
    if (state.timer.status !== 'idle') return;
    // A fresh id per focus session (the idle timer may have been sitting around).
    set({ ...state, reviewId: null, timer: T.start({ ...state.timer, id: uid(), phase: 'focus' }, Date.now()) });
    emit({ type: 'focus-start' });
  },
  pause() {
    set({ ...state, timer: T.pause(state.timer, Date.now()) });
  },
  resume() {
    set({ ...state, timer: T.resume(state.timer, Date.now()) });
  },
  /** Discards the current phase without saving. */
  reset() {
    const t = state.timer;
    set({ ...state, timer: T.idleTimer({ focusMin: t.focusMin, breakMin: t.breakMin }, t) });
    emit({ type: 'reset' });
  },
  finishEarly() {
    endFocus(true);
  },
  startBreak() {
    const t = state.timer;
    if (t.breakMin <= 0) return;
    set({ ...state, reviewId: null, timer: T.breakTimer(t, Date.now()) });
  },
  closeReview() {
    set({ ...state, reviewId: null });
  },
  addDistraction(text: string) {
    const d: Distraction = { id: uid(), text: text.trim(), createdAt: Date.now(), done: false };
    if (!d.text) return;
    set({ ...state, timer: { ...state.timer, distractions: [...state.timer.distractions, d] } });
  },
  removeDistraction(id: string) {
    set({ ...state, timer: { ...state.timer, distractions: state.timer.distractions.filter((d) => d.id !== id) } });
  },
  async saveReflection(sessionId: string, fields: { reflection: Reflection; subjectId: string | null; task: string; distractions: Distraction[] }) {
    await flushPendingSave();
    await sessionsRepo.patch(sessionId, fields);
  },
};

// Boot: retry any save interrupted by a refresh, then keep the timer honest.
if (typeof window !== 'undefined') {
  void flushPendingSave();
  tick();
  setInterval(() => tick(), 500);
  document.addEventListener('visibilitychange', () => tick());
  window.addEventListener('focus', () => tick());
  // Another tab changed the session: adopt its state.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
  if (import.meta.env.DEV) {
    // Dev-only helper for testing completion without waiting: __lockin.skip(60000)
    (window as unknown as { __lockin: object }).__lockin = {
      skip(ms: number) {
        const t = state.timer;
        if (t.endsAt == null) return;
        set({ ...state, timer: { ...t, endsAt: t.endsAt - ms, startedAt: (t.startedAt ?? 0) - ms, pausedAt: t.pausedAt != null ? t.pausedAt - ms : null } });
        tick();
      },
    };
  }
}
