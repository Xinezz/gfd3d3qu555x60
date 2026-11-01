import type { Preset } from '../../domain/types';
import { getSettings, updateSettings } from '../../data/settings';
import { audio } from '../audio/audioStore';
import { CUSTOM_MUSIC_ID, MUSIC } from '../audio/catalog';
import { COMPANIONS } from '../companions/Companions';
import { environmentById } from '../scenes/catalog';
import { getRoom, room } from '../session/sessionStore';
import { enterLightsOff } from './lightsOff';

/**
 * Session templates are presets that also remember the room: scene, companion, music, volumes
 * and whether to start in Lights Off. Plain timer presets (no scene saved) keep working as before.
 */
export const isTemplate = (p: Preset) => p.environmentId !== undefined;

export type TemplateSetup = Required<Pick<Preset, 'focusMin' | 'breakMin' | 'environmentId' | 'companionId' | 'musicId' | 'customMusicUrl' | 'musicVolume' | 'ambienceVolume' | 'ambienceOn' | 'lightsOff'>>;

/** The room exactly as it's set up now. */
export function currentSetup(lightsOff: boolean): TemplateSetup {
  const s = getSettings();
  return {
    focusMin: s.focusMin,
    breakMin: s.breakMin,
    environmentId: s.environmentId,
    companionId: s.companionId,
    musicId: s.musicId,
    customMusicUrl: s.customMusicUrl,
    musicVolume: s.musicMuted ? 0 : s.musicVolume,
    ambienceVolume: s.ambienceMuted ? 0 : s.ambienceVolume,
    ambienceOn: s.ambienceOn,
    lightsOff,
  };
}

export const musicName = (id: string | undefined) => (id === CUSTOM_MUSIC_ID ? 'Your link' : (MUSIC.find((m) => m.id === id)?.name ?? 'No music'));

/** One-line summary, e.g. "25 / 5 min · Rainy Window · Lo-fi · Cat". */
export function describe(p: Partial<TemplateSetup> & Pick<Preset, 'focusMin' | 'breakMin'>) {
  const parts = [`${p.focusMin} / ${p.breakMin} min`];
  if (p.environmentId) parts.push(environmentById(p.environmentId).name);
  if (p.musicId !== undefined) parts.push(p.musicId === 'none' ? 'No music' : musicName(p.musicId));
  if (p.companionId) parts.push(COMPANIONS.find((c) => c.id === p.companionId)?.name ?? p.companionId);
  return parts.join(' · ');
}

/** Puts the room into the template's setup. Only allowed between sessions. */
export function applyTemplate(p: Preset): boolean {
  if (getRoom().timer.status !== 'idle') return false;
  updateSettings({ focusMin: p.focusMin, breakMin: p.breakMin, presetId: p.id, ...(p.companionId ? { companionId: p.companionId } : {}) });
  room.configure(p.focusMin, p.breakMin);
  if (isTemplate(p))
    audio.applySetup({
      environmentId: p.environmentId!,
      musicId: p.musicId ?? getSettings().musicId,
      customMusicUrl: p.customMusicUrl ?? getSettings().customMusicUrl,
      musicVolume: p.musicVolume ?? getSettings().musicVolume,
      ambienceVolume: p.ambienceVolume ?? getSettings().ambienceVolume,
      ambienceOn: p.ambienceOn ?? getSettings().ambienceOn,
    });
  return true;
}

/**
 * Applies the template and starts focusing. Call it from a click so Lights Off can go full
 * screen; when the room isn't on screen yet, pass `inRoom: false` and let the room turn the
 * lights off as it opens (see `?lights=off`).
 */
export function startTemplate(p: Preset, inRoom: boolean): boolean {
  if (!applyTemplate(p)) return false;
  room.start();
  if (p.lightsOff && inRoom) void enterLightsOff(getSettings().lightsOffFullscreen);
  return true;
}
