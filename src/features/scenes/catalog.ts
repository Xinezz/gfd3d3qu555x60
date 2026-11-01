import type { RecipeId } from '../audio/synth';

export interface Environment {
  id: string;
  name: string;
  blurb: string;
  sound: RecipeId;
  /** Ambient light colour the room UI picks up. */
  glow: string;
}

export const ENVIRONMENTS: Environment[] = [
  { id: 'rainy-window', name: 'Rainy Window', blurb: 'Rain on glass, a sleeping town', sound: 'rain-window', glow: '#7d93b8' },
  { id: 'fireplace', name: 'Fireplace', blurb: 'Warm hearth, soft crackle', sound: 'fire', glow: '#e08a4a' },
  { id: 'bedroom', name: 'Cozy Bedroom', blurb: 'Lamp light, rain on the roof', sound: 'bedroom', glow: '#d9a86c' },
  { id: 'night-city', name: 'Night City', blurb: 'Distant lights and traffic hum', sound: 'city', glow: '#8a7fd0' },
  { id: 'forest', name: 'Forest', blurb: 'Tall pines, birdsong, breeze', sound: 'forest', glow: '#8fb07a' },
  { id: 'ocean', name: 'Ocean', blurb: 'Moonlit waves rolling in', sound: 'ocean', glow: '#6fa3b8' },
  { id: 'library', name: 'Library', blurb: 'Old shelves, a ticking clock', sound: 'library', glow: '#c99a5b' },
  { id: 'cafe', name: 'Café', blurb: 'Murmur, cups, warm lights', sound: 'cafe', glow: '#d79a66' },
  { id: 'snowy-window', name: 'Snowy Window', blurb: 'Falling snow, wind outside', sound: 'snow', glow: '#a9bfd6' },
  { id: 'japanese-garden', name: 'Japanese Garden', blurb: 'Stream, lantern, temple bell', sound: 'garden', glow: '#d48a8a' },
];

export const environmentById = (id: string) => ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
