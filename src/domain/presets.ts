import type { Preset } from './types';

const builtIn = (id: string, name: string, focusMin: number, breakMin: number): Preset => ({
  id,
  name,
  focusMin,
  breakMin,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});

/** Built-in presets live in code; only custom presets are stored. */
export const BUILT_IN_PRESETS: Preset[] = [
  builtIn('builtin-25', 'Classic', 25, 5),
  builtIn('builtin-50', 'Deep work', 50, 10),
  builtIn('builtin-90', 'Long haul', 90, 20),
];

export const FOCUS_LIMITS = { min: 1, max: 240 };
export const BREAK_LIMITS = { min: 0, max: 60 };

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
