import { useState } from 'react';
import { Flame, Pause, Play, Sprout, Timer as TimerIcon, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { BUILT_IN_PRESETS, BREAK_LIMITS, FOCUS_LIMITS } from '../../domain/presets';
import type { CompanionId, Preset } from '../../domain/types';
import { useCustomPresets } from '../../data/hooks';
import { newRecord, presetsRepo } from '../../data/repo';
import { getSettings, updateSettings, useSettings } from '../../data/settings';
import { confirmDialog, Slider, Stepper, toast, Toggle } from '../../ui';
import { audio, useAudio } from '../audio/audioStore';
import { CUSTOM_MUSIC_ID, MUSIC } from '../audio/catalog';
import { COMPANIONS } from '../companions/Companions';
import { ENVIRONMENTS } from '../scenes/catalog';
import { room, useRoom } from '../session/sessionStore';

export type PanelId = 'timer' | 'music' | 'scene' | 'companion' | 'thoughts';

export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside className="room-panel" aria-label={title}>
      <header className="room-panel__head">
        <h2>{title}</h2>
        <button className="icon-btn icon-btn--ghost" onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>
      </header>
      <div className="room-panel__body">{children}</div>
    </aside>
  );
}

function applyTimer(focusMin: number, breakMin: number, presetId: string | null) {
  updateSettings({ focusMin, breakMin, presetId });
  room.configure(focusMin, breakMin);
}

export function TimerPanel() {
  const s = useSettings();
  const { timer } = useRoom();
  const custom = useCustomPresets();
  const [name, setName] = useState('');
  const locked = timer.status !== 'idle';

  const pick = (p: Preset) => applyTimer(p.focusMin, p.breakMin, p.id);
  const save = async () => {
    const n = name.trim() || `${s.focusMin} / ${s.breakMin}`;
    const rec = await presetsRepo.put(newRecord({ name: n, focusMin: s.focusMin, breakMin: s.breakMin }));
    updateSettings({ presetId: rec.id });
    setName('');
    toast(`Saved preset “${n}”`);
  };
  const remove = async (p: Preset) => {
    if (await confirmDialog({ title: `Delete “${p.name}”?`, confirmLabel: 'Delete', danger: true })) {
      await presetsRepo.remove(p.id);
      if (s.presetId === p.id) updateSettings({ presetId: null });
    }
  };

  return (
    <div className="stack">
      {locked && <p className="note">Finish or reset the current session to change its length.</p>}
      <section className="stack-s">
        <h3 className="eyebrow">Presets</h3>
        <div className="preset-grid">
          {[...BUILT_IN_PRESETS, ...custom].map((p) => (
            <div key={p.id} className={`preset ${s.presetId === p.id ? 'is-active' : ''}`}>
              <button className="preset__main" disabled={locked} onClick={() => pick(p)}>
                <span className="preset__time num">
                  {p.focusMin}
                  <small> / {p.breakMin}</small>
                </span>
                <span className="preset__name">{p.name}</span>
              </button>
              {p.createdAt > 0 && (
                <button className="preset__del" onClick={() => void remove(p)} aria-label={`Delete preset ${p.name}`}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="stack-s">
        <h3 className="eyebrow">Focus length</h3>
        <Stepper label="Focus minutes" unit="min" value={s.focusMin} min={FOCUS_LIMITS.min} max={FOCUS_LIMITS.max} disabled={locked} onChange={(v) => applyTimer(v, getSettings().breakMin, null)} />
      </section>
      <section className="stack-s">
        <h3 className="eyebrow">Break length</h3>
        <Stepper label="Break minutes" unit="min" value={s.breakMin} min={BREAK_LIMITS.min} max={BREAK_LIMITS.max} disabled={locked} onChange={(v) => applyTimer(getSettings().focusMin, v, null)} />
      </section>
      {s.presetId === null && (
        <section className="stack-s">
          <h3 className="eyebrow">Save as preset</h3>
          <div className="row">
            <input className="input" placeholder={`${s.focusMin} / ${s.breakMin}`} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
            <button className="btn" onClick={() => void save()}>
              Save
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function VolumeRow({ value, muted, onVolume, onMute, label }: { value: number; muted: boolean; onVolume: (v: number) => void; onMute: () => void; label: string }) {
  return (
    <div className="volume-row">
      <button className="icon-btn icon-btn--ghost" onClick={onMute} aria-label={muted ? `Unmute ${label}` : `Mute ${label}`} aria-pressed={muted}>
        {muted || value === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <Slider label={`${label} volume`} value={muted ? 0 : value} onChange={onVolume} />
    </div>
  );
}

export function MusicPanel() {
  const s = useSettings();
  const a = useAudio();
  const [link, setLink] = useState(s.customMusicUrl);
  const current = s.musicId;
  const statusText =
    a.musicStatus === 'loading' ? 'Connecting to stream…' : a.musicStatus === 'blocked' || a.musicStatus === 'error' ? a.musicMessage : a.musicOn ? a.musicTitle || 'Playing' : 'Paused';

  return (
    <div className="stack">
      <div className="player-card">
        <button className="btn btn--primary player-card__play" onClick={audio.toggleMusic} disabled={current === 'none'} aria-label={a.musicOn ? 'Pause music' : 'Play music'}>
          {a.musicOn ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="player-card__text">
          <span className="eyebrow">{current === 'none' ? 'Music off' : (MUSIC.find((m) => m.id === current)?.name ?? 'Your link')}</span>
          <span className={`small ${a.musicStatus === 'error' || a.musicStatus === 'blocked' ? 'warn' : 'muted'}`}>{current === 'none' ? 'Pick a category to play music.' : statusText}</span>
        </div>
      </div>
      <VolumeRow label="Music" value={s.musicVolume} muted={s.musicMuted} onVolume={audio.setMusicVolume} onMute={audio.toggleMusicMute} />
      <div className="option-grid">
        {MUSIC.map((m) => (
          <button key={m.id} className={`option ${current === m.id ? 'is-active' : ''}`} onClick={() => audio.selectMusic(m.id)}>
            <span className="option__name">{m.name}</span>
            <span className="option__sub">{m.sub}</span>
          </button>
        ))}
      </div>
      <section className="stack-s">
        <h3 className="eyebrow">Your own YouTube link</h3>
        <div className="row">
          <input className="input" placeholder="https://youtube.com/watch?v=…" value={link} onChange={(e) => setLink(e.target.value)} />
          <button
            className={`btn ${current === CUSTOM_MUSIC_ID ? 'btn--primary' : ''}`}
            onClick={() => {
              if (!audio.useCustomLink(link)) toast("That doesn't look like a YouTube link.");
            }}
          >
            Play
          </button>
        </div>
      </section>
      <section>
        <Toggle label="Play with the timer" hint="Starts music and room sound when a focus session starts" checked={s.autoPlayAudio} onChange={(v) => updateSettings({ autoPlayAudio: v })} />
        <Toggle label="Pause when a session ends" checked={s.pauseAudioOnEnd} onChange={(v) => updateSettings({ pauseAudioOnEnd: v })} />
      </section>
      <p className="note">
        Music categories stream live from YouTube (Lofi Girl, Chillhop and others). They need internet, a stream can occasionally go offline (the next one is tried automatically), and YouTube may show ads. Rain, Brown Noise and Nature are generated in your browser and work offline.
      </p>
    </div>
  );
}

export function ScenePanel() {
  const s = useSettings();
  const a = useAudio();
  return (
    <div className="stack">
      <div className="player-card">
        <button className="btn btn--primary player-card__play" onClick={audio.toggleAmbience} aria-label={a.ambienceOn ? 'Pause room sound' : 'Play room sound'}>
          {a.ambienceOn ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="player-card__text">
          <span className="eyebrow">Room sound</span>
          <span className="small muted">{a.ambienceOn ? `Playing · ${ENVIRONMENTS.find((e) => e.id === s.environmentId)?.name}` : 'Paused · generated, works offline'}</span>
        </div>
      </div>
      <VolumeRow label="Room sound" value={s.ambienceVolume} muted={s.ambienceMuted} onVolume={audio.setAmbienceVolume} onMute={audio.toggleAmbienceMute} />
      <div className="env-grid">
        {ENVIRONMENTS.map((e) => (
          <button
            key={e.id}
            className={`env ${s.environmentId === e.id ? 'is-active' : ''}`}
            style={{ ['--glow' as string]: e.glow }}
            onClick={() => audio.selectEnvironment(e.id)}
          >
            <span className="env__swatch" aria-hidden />
            <span className="option__name">{e.name}</span>
            <span className="option__sub">{e.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const COMPANION_ICONS: Record<CompanionId, typeof TimerIcon> = { timer: TimerIcon, candle: Flame, plant: Sprout };

export function CompanionPanel() {
  const s = useSettings();
  return (
    <div className="stack-s">
      {COMPANIONS.map((c) => {
        const Icon = COMPANION_ICONS[c.id];
        return (
          <button key={c.id} className={`option option--row ${s.companionId === c.id ? 'is-active' : ''}`} onClick={() => updateSettings({ companionId: c.id })}>
            <Icon size={22} strokeWidth={1.6} />
            <span>
              <span className="option__name">{c.name}</span>
              <span className="option__sub">{c.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ThoughtsPanel() {
  const { timer } = useRoom();
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    room.addDistraction(text);
    setText('');
  };
  return (
    <div className="stack">
      <p className="muted small">Something unrelated popped into your head? Park it here and get straight back to work. You'll review the list when the session ends. Press <kbd>D</kbd> anytime.</p>
      <div className="row">
        <input className="input" autoFocus placeholder="e.g. reply to Sam, buy notebook" value={text} maxLength={140} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add} disabled={!text.trim()}>
          Park
        </button>
      </div>
      {timer.distractions.length ? (
        <ul className="thought-list">
          {timer.distractions.map((d) => (
            <li key={d.id}>
              <span>{d.text}</span>
              <button className="icon-btn icon-btn--ghost" onClick={() => room.removeDistraction(d.id)} aria-label={`Remove ${d.text}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Nothing parked. Your mind is clear.</p>
      )}
    </div>
  );
}
