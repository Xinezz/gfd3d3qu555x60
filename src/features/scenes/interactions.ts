import { useSyncExternalStore } from 'react';
import type { Hotspot } from './catalog';

/**
 * State of the things you can click in a scene (a lamp's setting, the fire's size). Kept in memory
 * for this visit only: it's a small pleasure, not a preference, and it never touches the timer.
 */
const state = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

const key = (envId: string, id: string) => `${envId}:${id}`;

/** How long a one-off reaction (a puff of steam) lasts; matches the CSS. */
export const PULSE_MS = 2600;

export function hotspotState(envId: string, spot: Hotspot): number {
  return state.get(key(envId, spot.id)) ?? spot.initial ?? 0;
}

/** Cycles a hotspot to its next state, or plays its one-off reaction. */
export function pressHotspot(envId: string, spot: Hotspot) {
  const k = key(envId, spot.id);
  if (spot.kind === 'pulse') {
    if (state.get(k)) return; // already playing
    state.set(k, 1);
    emit();
    setTimeout(() => {
      state.set(k, 0);
      emit();
    }, PULSE_MS);
    return;
  }
  state.set(k, (hotspotState(envId, spot) + 1) % spot.states.length);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Re-renders when any hotspot changes. */
export const useHotspotVersion = () => useSyncExternalStore(subscribe, () => version);
