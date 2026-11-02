import { createContext, useContext, useMemo } from 'react';
import type { TimeOfDay } from '../../domain/types';
import { useSettings } from '../../data/settings';
import { useReducedMotion } from '../../ui/motion';

/** What a scene may do right now: the Settings → Environment choices, plus the time of day. */
export interface SceneFx {
  /** A thumbnail: one still frame, nothing to click. */
  still: boolean;
  animate: boolean;
  particles: boolean;
  lighting: boolean;
  calm: boolean;
  tod: TimeOfDay;
}

export const SceneFxContext = createContext<SceneFx>({ still: false, animate: true, particles: true, lighting: true, calm: false, tod: 'night' });
export const useSceneFx = () => useContext(SceneFxContext);

/** The room's effects from your settings. Reduced motion (yours or the system's) stops all movement. */
export function useSceneFxSettings(tod: TimeOfDay): SceneFx {
  const s = useSettings();
  const reduced = useReducedMotion();
  return useMemo(
    () => ({ still: false, animate: s.sceneAnimations && !reduced, particles: s.sceneParticles, lighting: s.sceneLighting, calm: s.calmMotion, tod }),
    [s.sceneAnimations, s.sceneParticles, s.sceneLighting, s.calmMotion, reduced, tod],
  );
}
