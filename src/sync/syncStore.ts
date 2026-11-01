import { useSyncExternalStore } from 'react';
import Dexie from 'dexie';
import type { SupabaseClient } from '@supabase/supabase-js';
import { onSettingsChange } from '../data/settings';
import { EMPTY_CURSOR, syncOnce, type Cursor } from './engine';
import { dexieLocal } from './local';
import { deleteRemote, getClient, supabaseRemote, syncConfigured } from './supabase';

/**
 * Account + sync state for the UI, and the scheduler: sync on sign-in, on start, every minute,
 * when the tab regains focus or comes back online, and a few seconds after any local change.
 */

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  configured: boolean;
  /** Auth has been checked (so "signed out" is real, not "still loading"). */
  ready: boolean;
  email: string | null;
  userId: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  codeSentTo: string | null;
}

const KEY = 'lockin.sync.v1';
interface Saved extends Cursor {
  userId: string;
  lastSyncedAt: number | null;
}

function loadSaved(userId: string): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null;
    if (s?.userId === userId) return s;
  } catch {
    /* fall through */
  }
  // New account on this device: start from scratch, which uploads everything here once.
  return { ...EMPTY_CURSOR, userId, lastSyncedAt: null };
}
const save = (s: Saved) => localStorage.setItem(KEY, JSON.stringify(s));

let state: SyncState = { configured: syncConfigured, ready: !syncConfigured, email: null, userId: null, status: 'idle', lastSyncedAt: null, error: null, codeSentTo: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getSyncState = () => state;
export const useSync = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => void listeners.delete(l)),
    () => state,
  );

let c: SupabaseClient | null = null;
let running: Promise<void> | null = null;
let again = false;
let applying = false;

export function syncNow(): Promise<void> {
  if (!c || !state.userId) return Promise.resolve();
  if (running) {
    again = true; // run once more after the current pass
    return running;
  }
  if (!navigator.onLine) {
    set({ status: 'offline' });
    return Promise.resolve();
  }
  const userId = state.userId;
  running = (async () => {
    set({ status: 'syncing', error: null });
    try {
      const saved = loadSaved(userId);
      applying = true;
      const { cursor } = await syncOnce(dexieLocal, supabaseRemote(c!), saved);
      const lastSyncedAt = Date.now();
      save({ ...cursor, userId, lastSyncedAt });
      set({ status: 'idle', lastSyncedAt });
    } catch (e) {
      set({ status: navigator.onLine ? 'error' : 'offline', error: (e as Error).message });
    } finally {
      applying = false;
      running = null;
      if (again) {
        again = false;
        void syncNow();
      }
    }
  })();
  return running;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
function onLocalChange() {
  if (applying || !state.userId) return; // ignore writes made by sync itself
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), 3000);
}

export async function sendCode(email: string) {
  if (!c) return;
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(error.message);
  set({ codeSentTo: email });
}

export async function verifyCode(email: string, token: string) {
  if (!c) return;
  const { error } = await c.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
  if (error) throw new Error(error.message);
  set({ codeSentTo: null });
}

export const cancelCode = () => set({ codeSentTo: null });

/** Signing out keeps this device's data; it simply stops syncing. */
export async function signOut() {
  await c?.auth.signOut();
}

/** After an import, upload everything (imported records keep their old timestamps). */
export function uploadEverything() {
  if (!state.userId) return;
  save({ ...loadSaved(state.userId), pushAt: 0 });
  void syncNow();
}

/** Removes every row of this account from the cloud (used by "Delete all data"). */
export async function deleteCloudData() {
  if (!c || !state.userId) return;
  await deleteRemote(c, state.userId);
  localStorage.removeItem(KEY);
}

async function init() {
  if (!syncConfigured) return;
  try {
    c = await getClient();
  } catch {
    set({ ready: true, status: 'offline', error: "Couldn't load the sync service." });
    return;
  }
  c.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    const changed = user?.id !== state.userId;
    set({ ready: true, userId: user?.id ?? null, email: user?.email ?? null, lastSyncedAt: user ? loadSaved(user.id).lastSyncedAt : null });
    if (user && changed) void syncNow();
  });
  const { data } = await c.auth.getSession();
  if (!data.session) set({ ready: true });

  setInterval(() => void syncNow(), 60_000);
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => set({ status: 'offline' }));
  // Coming back to the tab pulls; leaving it pushes anything pending.
  document.addEventListener('visibilitychange', () => void syncNow());
  Dexie.on('storagemutated', onLocalChange);
  onSettingsChange(onLocalChange);
}

if (typeof window !== 'undefined') void init();
