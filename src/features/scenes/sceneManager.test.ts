import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '../../data/settings';
import { ambienceLayers, artFiles, DEFAULT_ENVIRONMENT_ID, ENVIRONMENTS, environmentById, type SceneLayout } from './catalog';
import { ILLUSTRATIONS } from './illustrations';
import { LAYOUT as bedroom } from './illustrations/bedroom';
import { LAYOUT as cafe } from './illustrations/cafe';
import { LAYOUT as fireplace } from './illustrations/fireplace';
import { LAYOUT as library } from './illustrations/library';

const STUDY_LAYOUTS: Record<string, SceneLayout> = { fireplace, cafe, library, bedroom };
import { activeEnvironment, resolveEnvironment, selectEnvironment, setUnlockedAchievements } from './sceneManager';

// Every file in public/, relative to it. Vite lists them at build time; nothing is loaded.
const PUBLIC_FILES = new Set(Object.keys(import.meta.glob('/public/**/*')).map((p) => p.slice('/public/'.length)));

const allUnlocked = () => true;
const noneUnlocked = (reward?: string) => !reward;

describe('environment config', () => {
  it('has unique ids', () => {
    const ids = ENVIRONMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leads with the four study rooms, all free', () => {
    const study = ENVIRONMENTS.filter((e) => e.group === 'study');
    expect(study.map((e) => e.name)).toEqual(['Fireplace Study', 'Rainy Day Café', 'Midnight Library', 'Cosy Bedroom']);
    expect(ENVIRONMENTS.slice(0, 4)).toEqual(study);
    expect(study.every((e) => !e.reward)).toBe(true);
  });

  it('opens first-time visitors in the default environment, which is free', () => {
    expect(DEFAULT_SETTINGS.environmentId).toBe(DEFAULT_ENVIRONMENT_ID);
    expect(ENVIRONMENTS.find((e) => e.id === DEFAULT_ENVIRONMENT_ID)?.reward).toBeUndefined();
  });

  it('can draw every environment', () => {
    for (const e of ENVIRONMENTS) expect(e.art || ILLUSTRATIONS[e.id], e.id).toBeTruthy();
  });

  it('only points at artwork files that exist', () => {
    expect(PUBLIC_FILES.has('robots.txt'), 'the public/ listing works').toBe(true);
    for (const e of ENVIRONMENTS) {
      if (!e.art) continue;
      for (const file of artFiles(e.art)) expect(PUBLIC_FILES.has(file), `${e.id}: public/${file}`).toBe(true);
    }
  });

  it('gives each study room several sound layers, each with its own id', () => {
    for (const e of ENVIRONMENTS.filter((x) => x.group === 'study')) {
      expect(e.ambience.length, e.id).toBeGreaterThanOrEqual(2);
      expect(new Set(e.ambience.map((l) => l.id)).size, e.id).toBe(e.ambience.length);
    }
  });

  it('places lights, effects and hotspots consistently in each study room', () => {
    for (const [id, layout] of Object.entries(STUDY_LAYOUTS)) {
      const spots = layout.hotspots ?? [];
      expect(new Set(spots.map((h) => h.id)).size, id).toBe(spots.length);
      const spot = (hotspotId: string) => spots.find((h) => h.id === hotspotId);
      for (const l of layout.lights ?? []) {
        if (!l.follows) continue;
        const followed = spot(l.follows.hotspot);
        // A light that follows a switch has a strength for each of its settings.
        expect(followed?.kind === 'cycle' ? followed.states.length : -1, `${id}: light follows ${l.follows.hotspot}`).toBe(l.follows.values.length);
      }
      for (const e of layout.effects ?? []) if (e.when) expect(spot(e.when.hotspot), `${id}: effect follows ${e.when.hotspot}`).toBeTruthy();
      for (const h of spots) for (const v of [...h.region]) expect(v >= 0 && v <= 100, `${id}:${h.id} region in the artboard`).toBe(true);
      expect(spots.length, `${id} has something to click`).toBeGreaterThanOrEqual(1);
    }
  });

  it('lists every file a painted environment needs', () => {
    expect(artFiles({ dir: 'environments/cafe', widths: [1280, 2560], formats: ['avif', 'webp'] })).toEqual([
      'environments/cafe/plate-1280.avif',
      'environments/cafe/plate-2560.avif',
      'environments/cafe/plate-1280.webp',
      'environments/cafe/plate-2560.webp',
      'environments/cafe/thumb.webp',
    ]);
  });
});

describe('ambienceLayers', () => {
  const cafeEnv = environmentById('cafe');

  it('uses each layer’s defaults until you change it', () => {
    expect(ambienceLayers(cafeEnv, {}).map((l) => [l.layer.id, l.on, l.volume])).toEqual(cafeEnv.ambience.map((l) => [l.id, true, l.volume]));
  });

  it('applies your choices for that environment only', () => {
    const mix = { 'cafe:chatter': { on: false, volume: 0.2 }, 'library:wind': { on: false, volume: 0 } };
    const chatter = ambienceLayers(cafeEnv, mix).find((l) => l.layer.id === 'chatter')!;
    expect([chatter.on, chatter.volume]).toEqual([false, 0.2]);
    expect(ambienceLayers(environmentById('fireplace'), mix).every((l) => l.on)).toBe(true);
  });
});

describe('resolveEnvironment', () => {
  it('returns the saved environment', () => {
    expect(resolveEnvironment('library', allUnlocked).id).toBe('library');
  });

  it('falls back to the default for a missing or unknown id', () => {
    expect(resolveEnvironment(undefined, allUnlocked).id).toBe(DEFAULT_ENVIRONMENT_ID);
    expect(resolveEnvironment('', allUnlocked).id).toBe(DEFAULT_ENVIRONMENT_ID);
    expect(resolveEnvironment('moon-base', allUnlocked).id).toBe(DEFAULT_ENVIRONMENT_ID);
  });

  it('falls back to the default for an environment that is still locked', () => {
    expect(resolveEnvironment('aurora', noneUnlocked).id).toBe(DEFAULT_ENVIRONMENT_ID);
    expect(resolveEnvironment('aurora', allUnlocked).id).toBe('aurora');
  });
});

describe('selectEnvironment', () => {
  it('saves a valid choice, and the active environment follows', () => {
    expect(selectEnvironment('cafe')).toBe(true);
    expect(getSettings().environmentId).toBe('cafe');
    expect(activeEnvironment().id).toBe('cafe');
  });

  it('refuses unknown and locked environments without touching the saved one', () => {
    selectEnvironment('bedroom');
    setUnlockedAchievements(new Set());
    expect(selectEnvironment('moon-base')).toBe(false);
    expect(selectEnvironment('starfield')).toBe(false);
    expect(getSettings().environmentId).toBe('bedroom');
    setUnlockedAchievements(null);
  });

  it('shows the default when the saved environment turns out to be locked, and restores it once earned', () => {
    updateSettings({ environmentId: 'desert' });
    setUnlockedAchievements(null); // unlocks still loading: trust the saved choice
    expect(activeEnvironment().id).toBe('desert');
    setUnlockedAchievements(new Set());
    expect(activeEnvironment().id).toBe(DEFAULT_ENVIRONMENT_ID);
    expect(getSettings().environmentId).toBe('desert'); // the saved choice is kept, not overwritten
    setUnlockedAchievements(new Set(['h-100']));
    expect(activeEnvironment().id).toBe('desert');
    setUnlockedAchievements(null);
  });
});
