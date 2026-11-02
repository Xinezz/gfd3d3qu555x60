import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Lock } from 'lucide-react';
import { unlockName } from '../../domain/rewards';
import { toast } from '../../ui';
import { useRewards } from '../rewards/useRewards';
import { ENVIRONMENTS, type Environment } from './catalog';
import { SceneFxContext, useSceneFxSettings } from './fx';
import { thumbUrl } from './PaintedScene';
import { Illustration } from './Scene';
import { selectEnvironment, useActiveEnvironment } from './sceneManager';
import { useTimeOfDay } from './timeOfDay';
import './picker.css';

const STUDY = ENVIRONMENTS.filter((e) => e.group === 'study');
const MORE = ENVIRONMENTS.filter((e) => e.group === 'more');

/** The size a thumbnail is drawn at before it's scaled down, so it matches the room exactly. */
const BOARD_W = 1280;

/**
 * The Scene panel's environment list: the study rooms as illustrated cards, the other places one
 * click further. Choosing one only changes the environment; the timer and music carry on.
 */
export function EnvironmentPicker() {
  const active = useActiveEnvironment();
  const { isUnlocked } = useRewards();
  const [moreOpen, setMoreOpen] = useState(() => MORE.some((e) => e.id === active.id));
  // Thumbnails show each room as it looks now (time of day, lighting), as one still frame.
  const fx = useSceneFxSettings(useTimeOfDay());
  const still = useMemo(() => ({ ...fx, still: true }), [fx]);

  const card = (env: Environment) => <EnvironmentCard key={env.id} env={env} active={env.id === active.id} locked={!isUnlocked(env.reward)} />;

  return (
    <SceneFxContext.Provider value={still}>
      <div className="env-picker">
        <div className="env-picker__grid">{STUDY.map(card)}</div>
        <button className="env-picker__more" aria-expanded={moreOpen} aria-controls="env-more" onClick={() => setMoreOpen(!moreOpen)}>
          <span>More places</span>
          <span className="faint">{MORE.length}</span>
          <ChevronDown size={16} />
        </button>
        {moreOpen && (
          <div id="env-more" className="env-picker__grid">
            {MORE.map(card)}
          </div>
        )}
      </div>
    </SceneFxContext.Provider>
  );
}

function EnvironmentCard({ env, active, locked }: { env: Environment; active: boolean; locked: boolean }) {
  return (
    <button
      className={`env-card ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
      style={{ ['--s1' as string]: env.sky[0], ['--s2' as string]: env.sky[1], ['--s3' as string]: env.sky[2] }}
      aria-pressed={active}
      aria-disabled={locked || undefined}
      onClick={() => (locked ? toast(`Unlocks with “${unlockName(env.reward)}”`) : selectEnvironment(env.id))}
    >
      <span className="env-card__thumb">
        <EnvironmentThumb env={env} />
        {active && (
          <span className="env-card__badge">
            <Check size={13} strokeWidth={2.6} /> Current
          </span>
        )}
        {locked && (
          <span className="env-card__lock">
            <Lock size={14} />
          </span>
        )}
      </span>
      <span className="env-card__name">{env.name}</span>
      <span className="env-card__blurb">{locked ? `Unlocks with ${unlockName(env.reward)}` : env.blurb}</span>
    </button>
  );
}

/** A still picture of the environment: its painted thumbnail, or a frozen miniature of the illustration. */
const EnvironmentThumb = memo(function EnvironmentThumb({ env }: { env: Environment }) {
  const [artFailed, setArtFailed] = useState(false);
  if (env.art && !artFailed) return <img className="env-card__img" src={thumbUrl(env.art)} alt="" loading="lazy" decoding="async" onError={() => setArtFailed(true)} />;
  return <Miniature id={env.id} />;
});

function Miniature({ id }: { id: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current!;
    const fit = () => setScale(el.clientWidth / BOARD_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <span ref={ref} className="env-card__mini" aria-hidden>
      {scale > 0 && (
        <span className="env-card__board" style={{ width: BOARD_W, height: (BOARD_W * 9) / 16, transform: `scale(${scale})` }}>
          <span className={`scene scene--${id} scene--still is-visible`}>
            <Illustration id={id} />
          </span>
        </span>
      )}
    </span>
  );
}
