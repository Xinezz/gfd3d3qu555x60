import type { RecipeId } from '../audio/synth';
import type { TimeOfDay } from '../../domain/types';
import type { ParticleKind } from './Particles';

/**
 * Scene configuration: everything the app knows about an environment, and nothing about how it's
 * drawn. Rendering lives in Scene.tsx (painted art when it exists, otherwise the environment's
 * code-drawn illustration in illustrations/), selection and fallbacks in sceneManager.ts.
 * See docs/environments.md to add one.
 */

export type ImageFormat = 'avif' | 'webp' | 'jpg' | 'png';

/** A rectangle on the 16:9 artboard, in percent: left, top, width, height. */
export type Region = [x: number, y: number, w: number, h: number];

/** Shown only while a hotspot is in a given state (e.g. extra sparks while the fire roars). */
export type When = { hotspot: string; state: number };

/** A light in the scene, drawn as a soft glow that the lighting settings can dim or switch off. */
export interface Light {
  /** Centre (percent of the artboard) and radius (percent of its width). */
  x: number;
  y: number;
  r: number;
  color: string;
  /** How it moves: fire and candles flicker, lamps hold steady (the odd flicker), windows and moonlight drift. */
  kind: 'fire' | 'candle' | 'lamp' | 'window' | 'moon';
  /** Strength (0–1) at each time of day. Missing times use 1. */
  strength?: Partial<Record<TimeOfDay, number>>;
  /** A different colour at some times of day: a window is gold at sunrise and blue at night. */
  colorAt?: Partial<Record<TimeOfDay, string>>;
  /** Follows a hotspot: strength × values[state], e.g. a lamp switched off. */
  follows?: { hotspot: string; values: number[] };
}

/** Movement pinned to the artwork: particles kept inside a region, or steam rising from a cup. */
export type Effect =
  | { particles: ParticleKind; region: Region; density?: number; when?: When }
  | { steam: 'wisp' | 'puff'; region: Region; when?: When };

/** Something in the scene you can click. It's optional and never affects the timer. */
export type Hotspot =
  | { id: string; kind: 'cycle'; label: string; states: string[]; initial?: number; region: Region }
  | { id: string; kind: 'pulse'; label: string; initial?: number; region: Region };

/** Where things are on an environment's 16:9 artboard: the same for a painting or a drawing. */
export interface SceneLayout {
  /** The point (percent across, percent down) that stays in view when a screen crops the artboard. */
  focus?: [number, number];
  lights?: Light[];
  effects?: Effect[];
  hotspots?: Hotspot[];
}

/**
 * Hand-painted artwork for an environment, served from public/<dir>/, plus the lights, effects and
 * hotspots placed on it. Only describe files that exist: a test checks every one (sceneManager.test.ts).
 */
export interface PaintedArt extends SceneLayout {
  /** Folder under public/, e.g. 'environments/fireplace'. */
  dir: string;
  /** Widths the plate was exported at: plate-<width>.<format> for each width and format. */
  widths: number[];
  /** Best first. The last one is the fallback every browser gets, and the thumbnail's format (thumb.<format>). */
  formats: ImageFormat[];
}

/** One sound in an environment's ambience. Layers play together; each can be switched and turned up or down. */
export interface AmbienceLayer {
  id: string;
  name: string;
  recipe: RecipeId;
  /** Default volume, 0–1. */
  volume: number;
  /** Plays by default unless this is false. */
  on?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  /** One short line for the picker. */
  blurb: string;
  /** The four study rooms come first in the picker; the rest sit under "More places". */
  group: 'study' | 'more';
  /** Room sound: one or more layers (recipes in audio/synth.ts). */
  ambience: AmbienceLayer[];
  /** Accent light the room UI picks up (buttons, timer ring, active states). */
  glow: string;
  /** Deep tone the room's glass surfaces are tinted with. */
  ink: string;
  /** Sky → ground colours, shown behind the artwork while it loads. */
  sky: [string, string, string];
  /** Reward that unlocks it; omitted = always available. */
  reward?: string;
  /** Painted artwork. Without it the room draws the environment's illustration. */
  art?: PaintedArt;
}

export const DEFAULT_ENVIRONMENT_ID = 'fireplace';

/** The single layer of a place that has one room sound. */
const roomSound = (recipe: RecipeId): AmbienceLayer[] => [{ id: 'room', name: 'Room sound', recipe, volume: 1 }];

export const ENVIRONMENTS: Environment[] = [
  // ---- Study rooms ----
  {
    id: 'fireplace', name: 'Fireplace Study', blurb: 'Crackling hearth, candles, old books', group: 'study',
    ambience: [{ id: 'fire', name: 'Fireplace crackle', recipe: 'fire', volume: 0.9 }, { id: 'wind', name: 'Gentle wind', recipe: 'wind', volume: 0.35 }],
    glow: '#e8a05a', ink: '#1d130c', sky: ['#120b07', '#3a1d0e', '#e08a4a'],
  },
  {
    id: 'cafe', name: 'Rainy Day Café', blurb: 'Rain on the windows, warm lights, coffee on', group: 'study',
    ambience: [
      { id: 'rain', name: 'Rainfall', recipe: 'rain-soft', volume: 0.6 },
      { id: 'cafe', name: 'Café ambience', recipe: 'cafe', volume: 0.6 },
      { id: 'chatter', name: 'Distant chatter', recipe: 'chatter', volume: 0.45 },
    ],
    glow: '#e3a875', ink: '#1d140d', sky: ['#141626', '#2a2433', '#b37a4a'],
  },
  {
    id: 'library', name: 'Midnight Library', blurb: 'Moonlit windows, desk lamps, quiet shelves', group: 'study',
    ambience: [
      { id: 'room', name: 'Quiet room', recipe: 'quiet-room', volume: 0.7 },
      { id: 'wind', name: 'Gentle wind', recipe: 'wind', volume: 0.3 },
      { id: 'pages', name: 'Pages and creaks', recipe: 'pages', volume: 0.5 },
    ],
    glow: '#e2c595', ink: '#1c140d', sky: ['#1c130d', '#3b2a1c', '#6b4b2e'],
  },
  {
    id: 'bedroom', name: 'Cosy Bedroom', blurb: 'Desk lamp, soft curtains, a sleeping cat', group: 'study',
    ambience: [
      { id: 'night', name: 'Night ambience', recipe: 'night', volume: 0.5 },
      { id: 'rain', name: 'Gentle rain', recipe: 'rain-soft', volume: 0.55 },
      { id: 'wind', name: 'Soft wind', recipe: 'wind', volume: 0.3 },
    ],
    glow: '#dcb07a', ink: '#1b140f', sky: ['#120e0b', '#2a1f18', '#7a5a3a'],
  },

  // ---- More places ----
  { id: 'rainy-window', name: 'Rainy Window', blurb: 'Rain on glass, a sleeping town', group: 'more', ambience: roomSound('rain-window'), glow: '#a3b3c9', ink: '#121822', sky: ['#0b1220', '#22304a', '#3a3f4f'] },
  { id: 'night-city', name: 'Night City', blurb: 'Distant lights and traffic hum', group: 'more', ambience: roomSound('city'), glow: '#a59cf0', ink: '#11112a', sky: ['#0a0a1c', '#1b1638', '#5a3340'] },
  { id: 'forest', name: 'Forest', blurb: 'Tall pines, birdsong, breeze', group: 'more', ambience: roomSound('forest'), glow: '#9fbd8c', ink: '#0f1914', sky: ['#0b1a1c', '#17302c', '#2c4436'] },
  { id: 'ocean', name: 'Ocean', blurb: 'Moonlit waves rolling in', group: 'more', ambience: roomSound('ocean'), glow: '#86bccf', ink: '#0c1720', sky: ['#060d1c', '#10213b', '#1d3550'] },
  { id: 'snowy-window', name: 'Snowy Window', blurb: 'Falling snow, wind outside', group: 'more', ambience: roomSound('snow'), glow: '#bccde0', ink: '#111924', sky: ['#0d1626', '#1f2f47', '#c9d5e3'] },
  { id: 'japanese-garden', name: 'Japanese Garden', blurb: 'Stream, lantern, temple bell', group: 'more', ambience: roomSound('garden'), glow: '#e4a0a8', ink: '#1a1322', sky: ['#1b1630', '#4a3050', '#b0706a'] },
  { id: 'mountain-lake', name: 'Mountain Lake', blurb: 'Dawn over still water', group: 'more', ambience: roomSound('nature'), glow: '#e9b08e', ink: '#191522', sky: ['#1b2140', '#4c4468', '#e9b58a'], reward: 'env-mountain-lake' },
  { id: 'aurora', name: 'Aurora Night', blurb: 'Northern lights over snow', group: 'more', ambience: roomSound('snow'), glow: '#7fe0bc', ink: '#0a181a', sky: ['#03080f', '#0d3a36', '#3fe0a0'], reward: 'env-aurora' },
  { id: 'desert', name: 'Desert Night', blurb: 'Moonlit dunes, endless stars', group: 'more', ambience: roomSound('desert'), glow: '#c1a9dc', ink: '#151228', sky: ['#07071a', '#3a2b4e', '#6a4a5a'], reward: 'env-desert' },
  { id: 'starfield', name: 'Starfield', blurb: 'Drifting through deep space', group: 'more', ambience: roomSound('space'), glow: '#b29cf6', ink: '#0e0b21', sky: ['#04040c', '#120c2a', '#6a4a8a'], reward: 'env-starfield' },
];

/** Each layer of an environment's ambience with your settings applied (on/off, volume). */
export function ambienceLayers(env: Environment, mix: Record<string, { on: boolean; volume: number }>) {
  return env.ambience.map((layer) => {
    const mine = mix[`${env.id}:${layer.id}`];
    return { layer, on: mine?.on ?? layer.on ?? true, volume: mine?.volume ?? layer.volume };
  });
}

/** The environment with this id, or the default for an unknown id. Ignores locks: see sceneManager. */
export const environmentById = (id: string | undefined): Environment =>
  ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS.find((e) => e.id === DEFAULT_ENVIRONMENT_ID)!;

/** Every file a painted environment needs, relative to public/. */
export function artFiles(art: PaintedArt): string[] {
  const plates = art.formats.flatMap((f) => art.widths.map((w) => `${art.dir}/plate-${w}.${f}`));
  return [...plates, thumbFile(art)];
}

export const thumbFile = (art: PaintedArt) => `${art.dir}/thumb.${art.formats[art.formats.length - 1]}`;
