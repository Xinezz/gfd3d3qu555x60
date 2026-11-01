import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { attachPlayerHost, audio, playerVisible, setPlayerMin, useAudio } from './audioStore';
import { useSettings } from '../../data/settings';
import { lightsOffStore, Slider } from '../../ui';
import './audio.css';

/**
 * The YouTube player lives here, mounted once for the whole app so music keeps playing while you
 * move between pages. It floats as a small glass capsule (YouTube's terms expect the player to be
 * visible) and can be folded down to a slim pill.
 */
export function NowPlaying() {
  const host = useRef<HTMLDivElement>(null);
  const a = useAudio();
  const s = useSettings();
  const lightsOff = lightsOffStore.use();
  // Outside the room the player folds to a slim pill so it never covers what you are reading.
  const inRoom = useLocation().pathname === '/room';
  const min = a.playerMin || !inRoom;

  useEffect(() => {
    if (host.current) attachPlayerHost(host.current);
  }, []);

  const visible = playerVisible(a);
  const collapsed = min || lightsOff;
  const playing = a.musicOn && a.musicStatus === 'playing';
  const status =
    a.musicStatus === 'loading' ? 'Connecting…' : a.musicStatus === 'blocked' || a.musicStatus === 'error' ? a.musicMessage : a.musicOn ? 'Now playing' : 'Paused';

  return (
    <div className={`now-playing ${visible ? '' : 'is-hidden'} ${collapsed ? 'is-min' : ''} ${lightsOff ? 'is-dark' : ''}`} aria-hidden={!visible}>
      <div className="now-playing__video">
        <div ref={host} />
      </div>
      <div className="now-playing__bar">
        <span className={`eq ${playing ? 'is-playing' : ''}`} aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <div className="now-playing__text">
          <span className="now-playing__status">{status}</span>
          <span className="now-playing__title">{a.musicTitle || 'YouTube stream'}</span>
        </div>
        <button className="now-playing__play" onClick={audio.toggleMusic} aria-label={a.musicOn ? 'Pause music' : 'Play music'}>
          {a.musicOn ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>
        {!lightsOff && inRoom && (
          <button className="icon-btn icon-btn--ghost now-playing__fold" onClick={() => setPlayerMin(!min)} aria-label={min ? 'Show player' : 'Fold player'}>
            {min ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="now-playing__volume">
          <button className="icon-btn icon-btn--ghost" onClick={audio.toggleMusicMute} aria-label={s.musicMuted ? 'Unmute music' : 'Mute music'}>
            {s.musicMuted || s.musicVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <Slider label="Music volume" value={s.musicMuted ? 0 : s.musicVolume} onChange={audio.setMusicVolume} />
        </div>
      )}
    </div>
  );
}
