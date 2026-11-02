import { useSyncExternalStore } from 'react';
import { isRewardUnlocked } from '../../domain/rewards';
import { getSettings, onSettingsChange, updateSettings } from '../../data/settings';
import { environmentById, ENVIRONMENTS, type Environment } from './catalog';

/**
 * Which environment the room shows. The saved choice is `environmentId` in settings (localStorage,
 * backed up and synced with the other preferences); this module turns it into one the person can
 * actually use. An unknown id (e.g. from an older version) or a locked reward (e.g. restored from
 * another device's backup) falls back to the default. The room, the room sound and the dashboard
 * all read the active environment from here, so they always agree.
 */

export function resolveEnvironment(id: string | undefined, isUnlocked: (rewardId?: string) => boolean): Environment {
  const env = ENVIRONMENTS.find((e) => e.id === id);
  return env && isUnlocked(env.reward) ? env : environmentById(undefined);
}

// Achievement unlocks load from IndexedDB after startup. Until they have, the saved choice is
// trusted, so an earned environment doesn't flash the default on every visit.
let unlocked: Set<string> | null = null;
const isUnlocked = (rewardId?: string) => !unlocked || isRewardUnlocked(rewardId, unlocked);

let active = resolveEnvironment(getSettings().environmentId, isUnlocked);
const listeners = new Set<() => void>();

function refresh() {
  const next = resolveEnvironment(getSettings().environmentId, isUnlocked);
  if (next === active) return;
  active = next;
  listeners.forEach((l) => l());
}
onSettingsChange(refresh);

/** Called by the app shell whenever the unlocked achievements change (null while loading). */
export function setUnlockedAchievements(next: Set<string> | null) {
  unlocked = next;
  refresh();
}

export const activeEnvironment = () => active;

/** Notified only when the active environment actually changes, not on every settings change. */
export function onEnvironmentChange(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export const useActiveEnvironment = () => useSyncExternalStore(onEnvironmentChange, activeEnvironment);

/**
 * Switches environment. Only the saved preference changes: the timer, the session and the music
 * live elsewhere and carry on untouched. Returns false for an unknown or locked environment.
 */
export function selectEnvironment(id: string): boolean {
  const env = ENVIRONMENTS.find((e) => e.id === id);
  if (!env || !isUnlocked(env.reward)) return false;
  if (getSettings().environmentId !== id) updateSettings({ environmentId: id });
  return true;
}
