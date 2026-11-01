import { useSyncExternalStore } from 'react';
import { getSettings, updateSettings } from '../../data/settings';
import { environmentById } from '../scenes/catalog';
import { onSessionEvent, registerMusicInfo } from '../session/sessionStore';
import { CUSTOM_MUSIC_ID, musicOption, youTubeIdFrom } from './catalog';
import { playChime, SynthChannel, unlockAudio } from './synth';
import { YouTubeChannel, type YTStatus } from './youtube';

/**
 * Two independent channels: music (YouTube stream or generated) and environment ambience
 * (always generated, follows the selected environment). Selections and volumes persist in settings.
 */

export interface AudioState {
  musicOn: boolean;
  musicStatus: YTStatus;
  musicTitle: string;
  musicMessage: string;
  ambienceOn: boolean;
  /** True when the visible YouTube player should be shown. */
  streaming: boolean;
}

let state: AudioState = { musicOn: false, musicStatus: 'idle', musicTitle: '', musicMessage: '', ambienceOn: false, streaming: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<AudioState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useAudio = () => useSyncExternalStore(subscribe, () => state);

const youtube = new YouTubeChannel((status, text) => {
  if (status === 'error') set({ musicStatus: status, musicMessage: text, musicOn: false });
  else if (status === 'blocked') set({ musicStatus: status, musicMessage: 'Your browser blocked autoplay. Press play to start the music.' });
  else set({ musicStatus: status, musicTitle: text || state.musicTitle, musicMessage: '' });
});
const musicSynth = new SynthChannel();
const ambienceSynth = new SynthChannel();

export const attachPlayerHost = (el: HTMLElement) => youtube.attach(el);

const musicLevel = () => {
  const s = getSettings();
  return s.musicMuted ? 0 : s.musicVolume;
};
const ambienceLevel = () => {
  const s = getSettings();
  return s.ambienceMuted ? 0 : s.ambienceVolume;
};

export const audio = {
  playMusic() {
    unlockAudio();
    const s = getSettings();
    const opt = musicOption(s.musicId, s.customMusicUrl);
    if (opt.kind === 'none') return audio.pauseMusic();
    set({ musicOn: true, musicMessage: '' });
    if (opt.kind === 'generated') {
      youtube.pause();
      set({ streaming: false, musicStatus: 'playing', musicTitle: opt.name });
      musicSynth.play(opt.recipe, musicLevel());
    } else {
      musicSynth.stop();
      set({ streaming: true });
      void youtube.play(opt.videos, s.musicVolume, s.musicMuted);
    }
  },
  pauseMusic() {
    musicSynth.stop();
    youtube.pause();
    set({ musicOn: false, musicStatus: 'paused', musicMessage: '' });
  },
  toggleMusic() {
    if (state.musicOn) audio.pauseMusic();
    else audio.playMusic();
  },
  selectMusic(id: string) {
    updateSettings({ musicId: id });
    if (id === 'none') return audio.pauseMusic();
    audio.playMusic();
  },
  /** Returns false if the text isn't a recognisable YouTube link. */
  useCustomLink(url: string): boolean {
    if (!youTubeIdFrom(url)) return false;
    updateSettings({ customMusicUrl: url.trim(), musicId: CUSTOM_MUSIC_ID });
    audio.playMusic();
    return true;
  },
  setMusicVolume(v: number) {
    updateSettings({ musicVolume: v, musicMuted: false });
    musicSynth.setVolume(musicLevel());
    youtube.setVolume(v, false);
  },
  toggleMusicMute() {
    const muted = !getSettings().musicMuted;
    updateSettings({ musicMuted: muted });
    musicSynth.setVolume(musicLevel());
    youtube.setVolume(getSettings().musicVolume, muted);
  },

  playAmbience() {
    unlockAudio();
    updateSettings({ ambienceOn: true });
    ambienceSynth.play(environmentById(getSettings().environmentId).sound, ambienceLevel());
    set({ ambienceOn: true });
  },
  pauseAmbience() {
    ambienceSynth.stop();
    set({ ambienceOn: false });
  },
  toggleAmbience() {
    if (state.ambienceOn) {
      updateSettings({ ambienceOn: false });
      audio.pauseAmbience();
    } else audio.playAmbience();
  },
  setAmbienceVolume(v: number) {
    updateSettings({ ambienceVolume: v, ambienceMuted: false });
    ambienceSynth.setVolume(ambienceLevel());
  },
  toggleAmbienceMute() {
    updateSettings({ ambienceMuted: !getSettings().ambienceMuted });
    ambienceSynth.setVolume(ambienceLevel());
  },
  selectEnvironment(id: string) {
    updateSettings({ environmentId: id });
    if (state.ambienceOn) ambienceSynth.play(environmentById(id).sound, ambienceLevel());
  },

  stopAll() {
    audio.pauseMusic();
    audio.pauseAmbience();
  },
};

registerMusicInfo(() => (state.musicOn ? getSettings().musicId : null));

function notify(title: string, body: string) {
  const s = getSettings();
  if (!s.notifications || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    new Notification(title, { body, silent: true });
  } catch {
    /* some platforms only allow notifications from a service worker */
  }
}

onSessionEvent((e) => {
  const s = getSettings();
  if (e.type === 'focus-start' && s.autoPlayAudio) {
    if (s.musicId !== 'none' && !state.musicOn) audio.playMusic();
    if (s.ambienceOn && !state.ambienceOn) audio.playAmbience();
  }
  if (e.type === 'focus-end') {
    if (s.pauseAudioOnEnd) audio.stopAll();
    if (s.chime && !e.early) playChime();
    if (!e.early) notify('Session complete', 'Nice work. Time to reflect and take a break.');
  }
  if (e.type === 'reset' && s.pauseAudioOnEnd) audio.stopAll();
  if (e.type === 'break-end') {
    if (s.chime) playChime();
    notify('Break is over', 'Ready to lock in again?');
  }
});
