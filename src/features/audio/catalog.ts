import type { RecipeId } from './synth';

/**
 * Music options. Streamed options use the official YouTube IFrame Player with several streams
 * each: if one is removed or blocked, the next plays. Generated options are synthesised in the
 * browser (Web Audio) and work offline.
 * Stream ids verified via YouTube oEmbed on 2026-11-01.
 */
export type MusicOption =
  | { id: string; name: string; sub: string; kind: 'youtube'; videos: string[] }
  | { id: string; name: string; sub: string; kind: 'generated'; recipe: RecipeId }
  | { id: string; name: string; sub: string; kind: 'none' };

export const MUSIC: MusicOption[] = [
  { id: 'lofi-hiphop', name: 'Lo-Fi Hip Hop', sub: 'Lofi Girl · Chillhop', kind: 'youtube', videos: ['jfKfPfyJRdk', '7NOSDKb0HlU', 'lTRiuFIWV54'] },
  { id: 'chill-lofi', name: 'Chill Lo-Fi', sub: 'Slow, late-night beats', kind: 'youtube', videos: ['28KRPhVzCus', 'rUxyKA_-grg', 'DWcJFNfaw9c'] },
  { id: 'jazz-lofi', name: 'Jazz Lo-Fi', sub: 'Warm, mellow jazz', kind: 'youtube', videos: ['HuFYqnbVbzY', '5yx6BWlEVcY'] },
  { id: 'ambient', name: 'Ambient', sub: 'Deep and spacious', kind: 'youtube', videos: ['S_MOd40zlYU', '6tH1eaEnyMI', 'X7X3UDwyyqo'] },
  { id: 'piano', name: 'Piano', sub: 'Soft and calm', kind: 'youtube', videos: ['4oStw0r33so', 'P5zNx2wUqaI'] },
  { id: 'classical', name: 'Classical', sub: 'Baroque to Romantic', kind: 'youtube', videos: ['LnkZeaRKUug', 'RGyC8xunN3o', 'g3lBkoFnjyw'] },
  { id: 'rain', name: 'Rain Sounds', sub: 'Generated · works offline', kind: 'generated', recipe: 'rain' },
  { id: 'brown-noise', name: 'Brown Noise', sub: 'Generated · works offline', kind: 'generated', recipe: 'brown' },
  { id: 'nature', name: 'Nature Sounds', sub: 'Generated · works offline', kind: 'generated', recipe: 'nature' },
  { id: 'none', name: 'No music', sub: 'Just the room', kind: 'none' },
];

export const CUSTOM_MUSIC_ID = 'custom';

export function musicOption(id: string, customUrl: string): MusicOption {
  if (id === CUSTOM_MUSIC_ID) {
    const vid = youTubeIdFrom(customUrl);
    if (vid) return { id, name: 'Your link', sub: 'YouTube', kind: 'youtube', videos: [vid] };
  }
  return MUSIC.find((m) => m.id === id) ?? MUSIC[0];
}

/** Accepts watch, youtu.be, live, shorts and embed links, or a bare 11-character id. */
export function youTubeIdFrom(text: string): string {
  const s = text.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:live|shorts|embed)\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}
