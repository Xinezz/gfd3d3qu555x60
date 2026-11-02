import { useSyncExternalStore } from 'react';
import { getSettings, onSettingsChange } from '../data/settings';

/**
 * Reduced motion: on when the operating system asks for it, or when it's switched on in Settings.
 * CSS gets the same answer from the media query plus the `reduce-motion` class on <html> (global.css).
 */
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const systemReducesMotion = () => media?.matches ?? false;
export const reducedMotion = () => getSettings().reduceMotion || systemReducesMotion();

function subscribe(listener: () => void) {
  const offSettings = onSettingsChange(listener);
  media?.addEventListener('change', listener);
  return () => {
    offSettings();
    media?.removeEventListener('change', listener);
  };
}

export const useReducedMotion = () => useSyncExternalStore(subscribe, reducedMotion, () => false);
