import { useState } from 'react';
import { Cat as CatIcon, Flame, Hourglass, Lock, Moon as MoonIcon, Pause, Play, Sprout, Timer as TimerIcon, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { BUILT_IN_PRESETS, BREAK_LIMITS, FOCUS_LIMITS } from '../../domain/presets';
import { achievementById } from '../../domain/achievements';
import { REWARDS, unlockName } from '../../domain/rewards';
import { useRewards } from '../rewards/useRewards';
import type { CompanionId, Preset } from '../../domain/types';
import { useCustomPresets } from '../../data/hooks';
import { newRecord, presetsRepo } from '../../data/repo';
import { getSettings, updateSettings, useSettings } from '../../data/settings';
import { confirmDialog, Segmented, Slider, Stepper, toast, Toggle } from '../../ui';
import { audio, useAudio } from '../audio/audioStore';
import { CUSTOM_MUSIC_ID, MUSIC } from '../audio/catalog';
import { COMPANIONS } from '../companions/Companions';
import { ambienceLayers } from '../scenes/catalog';
import { EnvironmentPicker } from '../scenes/EnvironmentPicker';
import { useActiveEnvironment } from '../scenes/sceneManager';
import { TIMES_OF_DAY, useTimeOfDay } from '../scenes/timeOfDay';
import { room, useRoom } from '../session/sessionStore';
import { applyTemplate, currentSetup, describe, isTemplate, startTemplate } from './templates';

export type PanelId = 'timer' | 'music' | 'scene' | 'companion' | 'decor' | 'thoughts';

export function Panel({ title, closing, onClose, children }: { title: string; closing?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside className={`room-panel ${closing ? 'is-closing' : ''}`} aria-label={title} inert={closing || undefined}>
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

  const presets = custom.filter((p) => !isTemplate(p));
  const templates = custom.filter(isTemplate);
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
      <Templates templates={templates} locked={locked} activeId={s.presetId} onRemove={(p) => void remove(p)} />
      <section className="stack-s">
        <h3 className="eyebrow">Timer presets</h3>
        <div className="preset-grid">
          {[...BUILT_IN_PRESETS, ...presets].map((p) => (
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

/** Saved setups: timer, scene, companion, music, volumes and Lights Off, started in one click. */
function Templates({ templates, locked, activeId, onRemove }: { templates: Preset[]; locked: boolean; activeId: string | null; onRemove: (p: Preset) => void }) {
  const s = useSettings();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [lightsOff, setLightsOff] = useState(false);
  const setup = currentSetup(lightsOff);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast('Give the template a name, e.g. “Evening revision”.');
      return;
    }
    const rec = await presetsRepo.put(newRecord({ name: n, ...currentSetup(lightsOff) }));
    updateSettings({ presetId: rec.id });
    setName('');
    setLightsOff(false);
    setSaving(false);
    toast(`Saved template “${n}”`);
  };

  return (
    <section className="stack-s">
      <h3 className="eyebrow">Session templates</h3>
      {templates.length === 0 && !saving && <p className="faint small">Save this room as it is now (timer, scene, music, companion and volumes) and start it again in one click.</p>}
      {templates.length > 0 && (
        <ul className="templates">
          {templates.map((t) => (
            <li key={t.id} className={`template ${activeId === t.id ? 'is-active' : ''}`}>
              <div className="template__text">
                <strong>
                  {t.name}
                  {t.lightsOff && <MoonIcon size={12} aria-label="Starts in Lights Off" />}
                </strong>
                <span className="faint xsmall">{describe(t)}</span>
              </div>
              <div className="template__actions">
                <button className="btn btn--sm btn--primary" disabled={locked} onClick={() => startTemplate(t, true)} title="Apply and start focusing">
                  <Play size={12} fill="currentColor" /> Start
                </button>
                <button
                  className="btn btn--sm btn--ghost"
                  disabled={locked}
                  onClick={() => {
                    if (applyTemplate(t)) toast(`“${t.name}” is set up. Start when you're ready.`);
                  }}
                >
                  Apply
                </button>
                <button className="icon-btn icon-btn--ghost template__del" onClick={() => onRemove(t)} aria-label={`Delete template ${t.name}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {saving ? (
        <div className="template-save">
          <input className="input" autoFocus placeholder="Template name, e.g. Evening revision" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
          <p className="faint xsmall">
            Saves: {describe(setup)} · music {Math.round(setup.musicVolume * 100)}% · room sound {setup.ambienceOn ? `${Math.round(setup.ambienceVolume * 100)}%` : 'off'}
          </p>
          <Toggle label="Start in Lights Off" hint={s.lightsOffFullscreen ? 'Goes full screen too (Esc turns the lights back on)' : undefined} checked={lightsOff} onChange={setLightsOff} />
          <div className="row">
            <button className="btn btn--primary btn--sm" onClick={() => void save()}>
              Save template
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setSaving(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn--sm template-add" onClick={() => setSaving(true)}>
          Save current setup as a template
        </button>
      )}
    </section>
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
      <AmbienceControls />
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
  const tod = useTimeOfDay();
  return (
    <div className="stack">
      <EnvironmentPicker />
      <section className="stack-s">
        <h3 className="eyebrow">Time of day</h3>
        <Segmented label="Time of day" value={s.timeOfDay} options={TIMES_OF_DAY} onChange={(v) => updateSettings({ timeOfDay: v })} />
        <p className="faint small">
          {s.timeOfDay === 'auto' ? `Following your clock: ${tod} now. It waits for your break rather than changing mid-session.` : 'Lights, windows and sky in the study rooms.'}
        </p>
      </section>
      <AmbienceControls />
    </div>
  );
}

/**
 * The room sound: play/pause and overall volume, then each layer of this environment's ambience
 * with its own switch and volume. In both the Scene and Music panels.
 */
function AmbienceControls() {
  const s = useSettings();
  const a = useAudio();
  const env = useActiveEnvironment();
  const layers = ambienceLayers(env, s.ambienceMix);
  const playing = layers.filter((l) => l.on).map((l) => l.layer.name);
  return (
    <section className="stack-s">
      <div className="player-card">
        <button className="btn btn--primary player-card__play" onClick={audio.toggleAmbience} aria-label={a.ambienceOn ? 'Pause room sound' : 'Play room sound'}>
          {a.ambienceOn ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="player-card__text">
          <span className="eyebrow">Room sound · {env.name}</span>
          <span className="small muted">{a.ambienceOn ? (playing.length ? `Playing · ${playing.join(', ')}` : 'Every layer is off') : 'Paused · generated, works offline'}</span>
        </div>
      </div>
      <VolumeRow label="Room sound" value={s.ambienceVolume} muted={s.ambienceMuted} onVolume={audio.setAmbienceVolume} onMute={audio.toggleAmbienceMute} />
      {layers.length > 1 && (
        <ul className="ambience-layers" aria-label={`${env.name} sound layers`}>
          {layers.map(({ layer, on, volume }) => (
            <li key={layer.id} className={on ? '' : 'is-off'}>
              <Toggle label={layer.name} checked={on} onChange={(v) => audio.setAmbienceLayer(layer.id, { on: v })} />
              <Slider label={`${layer.name} volume`} value={volume} onChange={(v) => audio.setAmbienceLayer(layer.id, { volume: v })} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const COMPANION_ICONS: Record<CompanionId, typeof TimerIcon> = { timer: TimerIcon, candle: Flame, plant: Sprout, hourglass: Hourglass, moon: MoonIcon, cat: CatIcon };

export function CompanionPanel() {
  const s = useSettings();
  const { isUnlocked } = useRewards();
  return (
    <div className="stack-s">
      {COMPANIONS.map((c) => {
        const Icon = COMPANION_ICONS[c.id];
        const locked = !isUnlocked(c.reward);
        return (
          <button
            key={c.id}
            className={`option option--row ${s.companionId === c.id ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
            onClick={() => (locked ? toast(`Unlocks with “${unlockName(c.reward)}”`) : updateSettings({ companionId: c.id }))}
            aria-disabled={locked}
          >
            {locked ? <Lock size={22} strokeWidth={1.6} /> : <Icon size={22} strokeWidth={1.6} />}
            <span>
              <span className="option__name">{c.name}</span>
              <span className="option__sub">{locked ? `Unlocks with ${unlockName(c.reward)}` : c.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Earned decorations, each switchable; locked ones show what unlocks them. */
export function DecorPanel() {
  const s = useSettings();
  const { isUnlocked, unlockedAchievements } = useRewards();
  const decor = REWARDS.filter((r) => r.kind === 'decor');
  const earned = decor.filter((r) => isUnlocked(r.id)).length;
  const toggle = (id: string, on: boolean) => {
    const off = new Set(s.decorOff);
    if (on) off.delete(id);
    else off.add(id);
    updateSettings({ decorOff: [...off] });
  };
  return (
    <div className="stack">
      <p className="muted small">
        Decorations are earned through achievements, never bought. {earned} of {decor.length} earned. New ones appear in your room automatically.
      </p>
      <div className="stack-s">
        {decor.map((r) => {
          const unlocked = isUnlocked(r.id);
          const a = achievementById(r.requires);
          return unlocked ? (
            <Toggle key={r.id} label={r.name} hint={r.description} checked={!s.decorOff.includes(r.id)} onChange={(v) => toggle(r.id, v)} />
          ) : (
            <div key={r.id} className="decor-locked">
              <Lock size={16} />
              <span>
                <span className="option__name">{r.name}</span>
                <span className="option__sub">
                  Unlocks with {a?.name}
                  {a && !unlockedAchievements.has(a.id) ? ` · ${a.description}` : ''}
                </span>
              </span>
            </div>
          );
        })}
      </div>
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
