import { memo, useCallback, useEffect, useRef, useState } from 'react';
import './scenes.css';
import { reducedMotion } from '../../ui/motion';
import { DEFAULT_ENVIRONMENT_ID, type Environment } from './catalog';
import { ILLUSTRATIONS } from './illustrations';
import { PaintedScene } from './PaintedScene';

/** The code-drawn version of an environment. */
export function Illustration({ id }: { id: string }) {
  const Drawing = ILLUSTRATIONS[id] ?? ILLUSTRATIONS[DEFAULT_ENVIRONMENT_ID];
  return <Drawing />;
}

interface Layer {
  env: Environment;
  ready: boolean;
}

/**
 * Full-bleed environment behind the room. Switching draws the new environment on top of the old
 * one, hidden until its artwork is ready, then fades it in and removes the old one once it's
 * covered: no flash, no empty frame. Purely visual: the timer, session and music never pass
 * through here, so they carry on untouched.
 */
export const Scene = memo(function Scene({ env, dim = 0.35 }: { env: Environment; dim?: number }) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ env, ready: true }]);

  useEffect(() => {
    setLayers((ls) => {
      if (ls[ls.length - 1].env.id === env.id) return ls;
      const shown = ls.filter((l) => l.ready);
      // Switching back to one that's still on screen: uncover it.
      const i = shown.findIndex((l) => l.env.id === env.id);
      if (i >= 0) return shown.slice(0, i + 1);
      return [...shown, { env, ready: false }];
    });
  }, [env]);

  const onReady = useCallback(
    (id: string) =>
      setLayers((ls) => {
        const top = ls[ls.length - 1];
        // Without motion there's no fade to wait for: swap straight away.
        if (top.env.id === id && reducedMotion()) return [{ ...top, ready: true }];
        return ls.map((l) => (l.env.id === id && !l.ready ? { ...l, ready: true } : l));
      }),
    [],
  );

  // The newest layer has finished fading in (not just "time is up": a background tab doesn't
  // animate), so the ones underneath can go.
  const onShown = useCallback((id: string) => setLayers((ls) => (ls.length > 1 && ls[ls.length - 1].env.id === id ? [ls[ls.length - 1]] : ls)), []);

  // Not aria-hidden: the artwork itself is silent, but the things you can click in it are buttons.
  return (
    <div className="scene-stage">
      {layers.map((l, i) => (
        <SceneLayer key={l.env.id} env={l.env} visible={l.ready} current={i === layers.length - 1} onReady={onReady} onShown={onShown} />
      ))}
      <div className="scene__shade" style={{ ['--dim' as string]: dim }} />
    </div>
  );
});

function SceneLayer({ env, visible, current, onReady, onShown }: { env: Environment; visible: boolean; current: boolean; onReady: (id: string) => void; onShown: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Artwork that fails to load falls back to the illustration rather than leaving a gap.
  const [artFailed, setArtFailed] = useState(false);
  const painted = env.art && !artFailed;

  // An illustration is ready straight away. Reading its style first makes the browser register it
  // as hidden, so becoming visible fades in rather than snapping.
  useEffect(() => {
    if (painted || visible) return;
    void getComputedStyle(ref.current!).opacity;
    onReady(env.id);
  }, [painted, visible, env.id, onReady]);

  return (
    <div
      ref={ref}
      className={`scene scene--${env.id}${visible ? ' is-visible' : ''}`}
      // An environment on its way out can't be clicked or tabbed into.
      inert={!current || undefined}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'opacity' && visible) onShown(env.id);
      }}
    >
      {painted ? <PaintedScene env={env} art={env.art!} onReady={() => onReady(env.id)} onError={() => setArtFailed(true)} /> : <Illustration id={env.id} />}
    </div>
  );
}
