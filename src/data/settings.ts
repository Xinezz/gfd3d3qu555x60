import { useSyncExternalStore } from 'react';
import type { Settings } from '../domain/types';

/**
 * Preferences live in localStorage: they're small and must be available synchronously on first
 * paint (no flash of default volume/scene). They're included in backups like everything else.
 */
const KEY = 'lockin.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMin: 120,
  presetId: 'builtin-25',
  focusMin: 25,
  breakMin: 5,
  environmentId: 'rainy-window',
  companionId: 'timer',
  musicId: 'lofi-hiphop',
  customMusicUrl: '',
  musicVolume: 0.5,
  musicMuted: false,
  ambienceOn: true,
  ambienceVolume: 0.45,
  ambienceMuted: false,
  autoPlayAudio: true,
  pauseAudioOnEnd: true,
  chime: true,
  notifications: false,
  lightsOffFullscreen: true,
  decorOff: [],
  updatedAt: 0,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let current = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getSettings = () => current;

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
  emit();
}

export function replaceSettings(next: Partial<Settings>) {
  current = { ...DEFAULT_SETTINGS, ...next };
  localStorage.setItem(KEY, JSON.stringify(current));
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Keep other open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      current = load();
      emit();
    }
  });
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}
