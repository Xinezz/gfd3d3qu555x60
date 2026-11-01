import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import { attachPlayerHost, audio, useAudio } from './audioStore';
import { lightsOffStore } from '../../ui';
import './audio.css';

/**
 * The YouTube player lives here, mounted once for the whole app so music keeps playing while you
 * move between pages. It is shown as a small "now playing" card (YouTube's terms expect the player
 * to be visible); you can minimise it to a pill.
 */
export function NowPlaying() {
  const host = useRef<HTMLDivElement>(null);
  const a = useAudio();
  const lightsOff = lightsOffStore.use();
  const [min, setMin] = useState(() => window.matchMedia('(max-width: 860px)').matches);

  useEffect(() => {
    if (host.current) attachPlayerHost(host.current);
  }, []);

  const visible = a.streaming && (a.musicOn || a.musicStatus === 'blocked' || a.musicStatus === 'error');
  const collapsed = min || lightsOff;
  const status =
    a.musicStatus === 'loading' ? 'Connecting…' : a.musicStatus === 'blocked' || a.musicStatus === 'error' ? a.musicMessage : a.musicOn ? 'Now playing' : 'Paused';

  return (
    <div className={`now-playing ${visible ? '' : 'is-hidden'} ${collapsed ? 'is-min' : ''} ${lightsOff ? 'is-dark' : ''}`} aria-hidden={!visible}>
      <div className="now-playing__video">
        <div ref={host} />
      </div>
      <div className="now-playing__bar">
        <button className="icon-btn icon-btn--ghost" onClick={audio.toggleMusic} aria-label={a.musicOn ? 'Pause music' : 'Play music'}>
          {a.musicOn ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="now-playing__text">
          <span className="now-playing__status">{status}</span>
          <span className="now-playing__title">{a.musicTitle || 'YouTube stream'}</span>
        </div>
        {!lightsOff && (
          <button className="icon-btn icon-btn--ghost" onClick={() => setMin(!min)} aria-label={min ? 'Show player' : 'Minimise player'}>
            {min ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
