import type { ComponentType } from 'react';
// Shared scene styles first, so each environment's own stylesheet can refine them.
import '../scenes.css';
import { Aurora } from './aurora';
import { Bedroom } from './bedroom';
import { Cafe } from './cafe';
import { Desert } from './desert';
import { Fireplace } from './fireplace';
import { Forest } from './forest';
import { JapaneseGarden } from './japanese-garden';
import { Library } from './library';
import { MountainLake } from './mountain-lake';
import { NightCity } from './night-city';
import { Ocean } from './ocean';
import { RainyWindow } from './rainy-window';
import { SnowyWindow } from './snowy-window';
import { Starfield } from './starfield';

/**
 * The code-drawn version of each environment, by environment id. The room shows it whenever an
 * environment has no painted artwork (or the artwork fails to load).
 */
export const ILLUSTRATIONS: Record<string, ComponentType> = {
  fireplace: Fireplace,
  cafe: Cafe,
  library: Library,
  bedroom: Bedroom,
  'rainy-window': RainyWindow,
  'night-city': NightCity,
  forest: Forest,
  ocean: Ocean,
  'snowy-window': SnowyWindow,
  'japanese-garden': JapaneseGarden,
  'mountain-lake': MountainLake,
  aurora: Aurora,
  desert: Desert,
  starfield: Starfield,
};
