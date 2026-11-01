import type { RecipeId } from '../audio/synth';

export interface Environment {
  id: string;
  name: string;
  blurb: string;
  sound: RecipeId;
  /** Accent light the room UI picks up (buttons, timer ring, active states). */
  glow: string;
  /** Deep tone the room's glass surfaces are tinted with. */
  ink: string;
  /** Sky → ground colours for the picker tile. */
  sky: [string, string, string];
  /** Reward that unlocks it; omitted = always available. */
  reward?: string;
}

export const ENVIRONMENTS: Environment[] = [
  { id: 'rainy-window', name: 'Rainy Window', blurb: 'Rain on glass, a sleeping town', sound: 'rain-window', glow: '#a3b3c9', ink: '#121822', sky: ['#0b1220', '#22304a', '#3a3f4f'] },
  { id: 'fireplace', name: 'Fireplace', blurb: 'Warm hearth, soft crackle', sound: 'fire', glow: '#e8a05a', ink: '#1d130c', sky: ['#120b07', '#3a1d0e', '#e08a4a'] },
  { id: 'bedroom', name: 'Cozy Bedroom', blurb: 'Lamp light, rain on the roof', sound: 'bedroom', glow: '#dcb07a', ink: '#1b140f', sky: ['#120e0b', '#2a1f18', '#7a5a3a'] },
  { id: 'night-city', name: 'Night City', blurb: 'Distant lights and traffic hum', sound: 'city', glow: '#a59cf0', ink: '#11112a', sky: ['#0a0a1c', '#1b1638', '#5a3340'] },
  { id: 'forest', name: 'Forest', blurb: 'Tall pines, birdsong, breeze', sound: 'forest', glow: '#9fbd8c', ink: '#0f1914', sky: ['#0b1a1c', '#17302c', '#2c4436'] },
  { id: 'ocean', name: 'Ocean', blurb: 'Moonlit waves rolling in', sound: 'ocean', glow: '#86bccf', ink: '#0c1720', sky: ['#060d1c', '#10213b', '#1d3550'] },
  { id: 'library', name: 'Library', blurb: 'Old shelves, a ticking clock', sound: 'library', glow: '#e2c595', ink: '#1c140d', sky: ['#1c130d', '#3b2a1c', '#6b4b2e'] },
  { id: 'cafe', name: 'Café', blurb: 'Murmur, cups, warm lights', sound: 'cafe', glow: '#e3a875', ink: '#1d140d', sky: ['#141626', '#2a2433', '#b37a4a'] },
  { id: 'snowy-window', name: 'Snowy Window', blurb: 'Falling snow, wind outside', sound: 'snow', glow: '#bccde0', ink: '#111924', sky: ['#0d1626', '#1f2f47', '#c9d5e3'] },
  { id: 'japanese-garden', name: 'Japanese Garden', blurb: 'Stream, lantern, temple bell', sound: 'garden', glow: '#e4a0a8', ink: '#1a1322', sky: ['#1b1630', '#4a3050', '#b0706a'] },
  { id: 'mountain-lake', name: 'Mountain Lake', blurb: 'Dawn over still water', sound: 'nature', glow: '#e9b08e', ink: '#191522', sky: ['#1b2140', '#4c4468', '#e9b58a'], reward: 'env-mountain-lake' },
  { id: 'aurora', name: 'Aurora Night', blurb: 'Northern lights over snow', sound: 'snow', glow: '#7fe0bc', ink: '#0a181a', sky: ['#03080f', '#0d3a36', '#3fe0a0'], reward: 'env-aurora' },
  { id: 'desert', name: 'Desert Night', blurb: 'Moonlit dunes, endless stars', sound: 'desert', glow: '#c1a9dc', ink: '#151228', sky: ['#07071a', '#3a2b4e', '#6a4a5a'], reward: 'env-desert' },
  { id: 'starfield', name: 'Starfield', blurb: 'Drifting through deep space', sound: 'space', glow: '#b29cf6', ink: '#0e0b21', sky: ['#04040c', '#120c2a', '#6a4a8a'], reward: 'env-starfield' },
];

export const environmentById = (id: string) => ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
