import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Flame, Moon, Music, NotebookPen, Pause, Play, RotateCcw, Square, Sun, Trees, Volume2 } from 'lucide-react';
import * as T from '../../domain/timer';
import { formatClock, formatDuration } from '../../domain/time';
import { todayStats, totalFocusMs } from '../../domain/stats';
import { useSessions, useSubjects } from '../../data/hooks';
import { useSettings } from '../../data/settings';
import { confirmDialog, lightsOffStore, toast, useNow } from '../../ui';
import { audio, useAudio } from '../audio/audioStore';
import { Companion } from '../companions/Companions';
import { Scene } from '../scenes/Scene';
import { environmentById } from '../scenes/catalog';
import { onSessionEvent, room, useRoom } from '../session/sessionStore';
import { CompanionPanel, MusicPanel, Panel, ScenePanel, ThoughtsPanel, TimerPanel, type PanelId } from './panels';
import { SubjectPicker } from './SubjectPicker';
import './room.css';

const PANELS: { id: PanelId; label: string; icon: typeof Clock }[] = [
  { id: 'timer', label: 'Timer', icon: Clock },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'scene', label: 'Scene', icon: Trees },
  { id: 'companion', label: 'Companion', icon: Flame },
  { id: 'thoughts', label: 'Thoughts', icon: NotebookPen },
];

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

async function enterLightsOff(fullscreen: boolean) {
  lightsOffStore.set(true);
  if (fullscreen && !document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen refused (e.g. iOS Safari): lights-off still works without it */
    }
  }
}

function exitLightsOff() {
  lightsOffStore.set(false);
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}

export function Room() {
  const { timer, reviewId } = useRoom();
  const settings = useSettings();
  const subjects = useSubjects();
  const { sessions } = useSessions();
  const lightsOff = lightsOffStore.use();
  const sound = useAudio();
  const [params, setParams] = useSearchParams();
  const [panel, setPanelState] = useState<PanelId | null>((params.get('panel') as PanelId) || null);
  const [capture, setCapture] = useState(false);
  const [awake, setAwake] = useState(true);

  const active = timer.status !== 'idle';
  const now = useNow(active, 200);
  const remaining = T.remainingMs(timer, now);
  const isBreak = timer.phase === 'break';
  const today = todayStats(sessions);
  const subject = subjects.find((s) => s.id === timer.subjectId);

  const setPanel = (p: PanelId | null) => {
    setPanelState(p);
    if (params.has('panel')) setParams({}, { replace: true });
  };

  // Idle timer follows the configured length (e.g. after changing it elsewhere).
  useEffect(() => {
    if (timer.status === 'idle' && (timer.focusMin !== settings.focusMin || timer.breakMin !== settings.breakMin || timer.phase !== 'focus'))
      room.configure(settings.focusMin, settings.breakMin);
  }, [timer.status, timer.focusMin, timer.breakMin, timer.phase, settings.focusMin, settings.breakMin]);

  // Leave lights-off when a session ends so the reflection screen is in context.
  useEffect(
    () =>
      onSessionEvent((e) => {
        if (e.type === 'focus-end') {
          exitLightsOff();
          if (!e.session) toast('Sessions under a minute aren’t saved.');
        }
        if (e.type === 'break-end') toast('Break’s over. Ready when you are.');
      }),
    [],
  );

  // Leaving the page or the browser leaving fullscreen also turns the lights back on.
  useEffect(() => () => exitLightsOff(), []);
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && lightsOffStore.get() && settings.lightsOffFullscreen) lightsOffStore.set(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [settings.lightsOffFullscreen]);

  // In lights-off, controls and cursor fade away after a few still seconds.
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake = useCallback(() => {
    setAwake(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setAwake(false), 2800);
  }, []);
  useEffect(() => {
    if (!lightsOff) return;
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    return () => {
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      clearTimeout(idleTimer.current);
    };
  }, [lightsOff, wake]);

  const primary = useCallback(() => {
    if (timer.status === 'idle') room.start();
    else if (timer.status === 'running') room.pause();
    else room.resume();
  }, [timer.status]);

  const finish = useCallback(async () => {
    const elapsed = T.elapsedMs(timer, Date.now());
    const short = elapsed < T.MIN_SESSION_MS;
    const ok = await confirmDialog({
      title: 'Finish this session now?',
      body: short ? 'You’ve focused for under a minute, so this one won’t be saved.' : `You’ve focused for ${formatDuration(elapsed)}. It will be saved as finished early.`,
      confirmLabel: 'Finish session',
      cancelLabel: 'Keep going',
    });
    if (ok) room.finishEarly();
  }, [timer]);

  const reset = useCallback(async () => {
    const elapsed = T.elapsedMs(timer, Date.now());
    if (!isBreak && elapsed >= T.MIN_SESSION_MS) {
      const ok = await confirmDialog({
        title: 'Reset and discard this session?',
        body: `${formatDuration(elapsed)} of focus will not be recorded. Use “Finish” instead to save it.`,
        confirmLabel: 'Discard',
        danger: true,
      });
      if (!ok) return;
    }
    room.reset();
  }, [timer, isBreak]);

  // Keyboard: Space start/pause, D park a thought, L lights, Esc back out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reviewId || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (capture) setCapture(false);
        else if (lightsOff) exitLightsOff();
        else if (panel) setPanel(null);
        return;
      }
      if (isTyping(e)) return;
      if (e.key === ' ') {
        e.preventDefault();
        primary();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setCapture(true);
      } else if (e.key === 'l' || e.key === 'L') {
        if (lightsOff) exitLightsOff();
        else void enterLightsOff(settings.lightsOffFullscreen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label = timer.status === 'paused' ? 'Paused' : isBreak ? 'Break' : timer.status === 'running' ? 'Focus' : 'Ready';
  const env = environmentById(settings.environmentId);

  const controls = (
    <div className="room__controls">
      {timer.status === 'idle' ? (
        <button className="btn btn--primary btn--lg room__start" onClick={primary}>
          <Play size={18} /> Start focus
        </button>
      ) : (
        <>
          <button className="icon-btn icon-btn--lg" onClick={() => void reset()} aria-label={isBreak ? 'Skip break' : 'Reset session'} title={isBreak ? 'Skip break' : 'Reset (discard)'}>
            <RotateCcw size={18} />
          </button>
          <button className="btn btn--primary btn--lg" onClick={primary}>
            {timer.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
            {timer.status === 'running' ? 'Pause' : 'Resume'}
          </button>
          {!isBreak && (
            <button className="icon-btn icon-btn--lg" onClick={() => void finish()} aria-label="Finish session early" title="Finish early (save)">
              <Square size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={`room ${lightsOff ? 'is-dark' : ''} ${lightsOff && !awake ? 'is-asleep' : ''} ${panel ? 'has-panel' : ''}`} style={{ ['--env-glow' as string]: env.glow }}>
      <Scene id={settings.environmentId} dim={lightsOff ? 0.12 : 0.38} />

      <header className="room__top">
        <div>
          <h1 className="room__title">Lock-In Room</h1>
          <p className="faint small">
            {today.count ? `${today.count} ${today.count === 1 ? 'session' : 'sessions'} · ${formatDuration(today.focusMs)} today` : 'No sessions yet today'}
          </p>
        </div>
        <button className="btn room__lights" onClick={() => void enterLightsOff(settings.lightsOffFullscreen)} title="Lights off (L)">
          <Moon size={16} /> Lights off
        </button>
      </header>

      <div className="room__stage">
        {lightsOff && (
          <p className="room__indicator">
            <span className={`live-pill__dot ${timer.status === 'running' ? '' : 'is-paused'}`} />
            {label}
            {subject && ` · ${subject.name}`}
            {` · session ${today.count + (active && !isBreak ? 1 : 0) || 1} today`}
          </p>
        )}
        <Companion
          id={settings.companionId}
          progress={T.progress(timer, now)}
          clock={formatClock(remaining)}
          label={label}
          running={timer.status === 'running'}
          totalFocusMs={totalFocusMs(sessions)}
          size={lightsOff ? 'large' : 'normal'}
        />

        {!lightsOff &&
          (timer.status === 'idle' ? (
            <div className="room__context">
              <SubjectPicker value={timer.subjectId} onChange={(id) => room.setContext({ subjectId: id })} />
              <input className="input" placeholder="What are you locking in on?" value={timer.task} maxLength={120} onChange={(e) => room.setContext({ task: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && room.start()} />
            </div>
          ) : (
            <p className="room__task">
              {subject && <span className="chip"><span className="dot" style={{ background: subject.color }} />{subject.name}</span>}
              {timer.task && <span>{timer.task}</span>}
              {!subject && !timer.task && <span className="faint">{isBreak ? 'Rest your eyes. Stretch. Breathe.' : 'Deep work in progress'}</span>}
            </p>
          ))}

        {controls}
        {/* Browsers block audio after a refresh until you click, so offer a one-tap way back. */}
        {!lightsOff && active && !isBreak && settings.autoPlayAudio && !sound.musicOn && !sound.ambienceOn && (
          <button
            className="btn btn--sm room__resume-sound"
            onClick={() => {
              if (settings.musicId !== 'none') audio.playMusic();
              if (settings.ambienceOn) audio.playAmbience();
            }}
          >
            <Volume2 size={14} /> Resume music & sound
          </button>
        )}
        {!lightsOff && timer.status === 'idle' && (
          <p className="faint small room__hint">
            {settings.focusMin} min focus · {settings.breakMin} min break ·{' '}
            <button className="link" onClick={() => setPanel('timer')}>
              change
            </button>
          </p>
        )}
      </div>

      <nav className="room__dock" aria-label="Room settings">
        {PANELS.map(({ id, label: l, icon: Icon }) => (
          <button key={id} className={`dock-btn ${panel === id ? 'is-active' : ''}`} onClick={() => setPanel(panel === id ? null : id)} aria-pressed={panel === id}>
            <Icon size={19} strokeWidth={1.7} />
            <span>{l}</span>
            {id === 'thoughts' && timer.distractions.length > 0 && <i className="dock-btn__badge">{timer.distractions.length}</i>}
          </button>
        ))}
      </nav>

      {panel && !lightsOff && (
        <Panel title={PANELS.find((p) => p.id === panel)!.label} onClose={() => setPanel(null)}>
          {panel === 'timer' && <TimerPanel />}
          {panel === 'music' && <MusicPanel />}
          {panel === 'scene' && <ScenePanel />}
          {panel === 'companion' && <CompanionPanel />}
          {panel === 'thoughts' && <ThoughtsPanel />}
        </Panel>
      )}

      {lightsOff && (
        <div className="room__dark-bar">
          <button className="btn btn--ghost" onClick={() => setCapture(true)}>
            <NotebookPen size={16} /> Park a thought
          </button>
          <button className="btn" onClick={exitLightsOff}>
            <Sun size={16} /> Lights on <kbd>Esc</kbd>
          </button>
        </div>
      )}

      {capture && <QuickCapture onClose={() => setCapture(false)} />}
    </div>
  );
}

function QuickCapture({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (text.trim()) {
      room.addDistraction(text);
      toast('Parked. Back to it.');
    }
    onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal capture" onClick={(e) => e.stopPropagation()}>
        <label className="field">
          <span>Park a thought. You'll see it when the session ends.</span>
          <input className="input" autoFocus value={text} maxLength={140} placeholder="e.g. email the professor about the deadline" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </label>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={submit}>
            Park it
          </button>
        </div>
      </div>
    </div>
  );
}
