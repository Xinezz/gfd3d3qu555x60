import type { CSSProperties, ReactNode } from 'react';
import type { TimeOfDay } from '../../domain/types';
import type { Effect, Hotspot, Light, Region, SceneLayout, When } from './catalog';
import { useSceneFx } from './fx';
import { hotspotState, pressHotspot, useHotspotVersion } from './interactions';
import { Particles } from './Particles';

const place = ([x, y, w, h]: Region): CSSProperties => ({ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });

/**
 * The 16:9 artboard an environment is drawn on (a painting or a drawing), cropped around its focal
 * point to cover the room. Its lights, moving details and clickable things are placed in percent
 * of the artboard, so they stay on their spot at any screen size. The time of day and each
 * hotspot's state are on the artboard as `tod-*` and `data-<hotspot>` for the artwork's CSS.
 */
export function Board({ envId, layout, children }: { envId: string; layout: SceneLayout; children?: ReactNode }) {
  const fx = useSceneFx();
  useHotspotVersion();
  const spots = layout.hotspots ?? [];
  const states: Record<string, number> = Object.fromEntries(spots.map((h) => [h.id, hotspotState(envId, h)]));
  const shown = (w?: When) => !w || states[w.hotspot] === w.state;
  const [focusX, focusY] = layout.focus ?? [50, 50];
  return (
    <div className="board" style={{ ['--fx' as string]: focusX / 100, ['--fy' as string]: focusY / 100 }}>
      <div className={`board__art tod-${fx.tod}`} {...Object.fromEntries(spots.map((h) => [`data-${h.id}`, states[h.id]]))}>
        {children}
        {fx.lighting && layout.lights?.map((l, i) => <Glow key={i} light={l} tod={fx.tod} states={states} />)}
        {layout.effects?.filter((e) => shown(e.when)).map((e, i) => <EffectView key={i} effect={e} />)}
        {!fx.still && spots.map((h) => <HotspotButton key={h.id} envId={envId} spot={h} state={states[h.id]} />)}
      </div>
    </div>
  );
}

function Glow({ light, tod, states }: { light: Light; tod: TimeOfDay; states: Record<string, number> }) {
  const follow = light.follows ? (light.follows.values[states[light.follows.hotspot]] ?? 1) : 1;
  const strength = (light.strength?.[tod] ?? 1) * follow;
  return (
    <div
      className={`scene-light scene-light--${light.kind}`}
      style={{ left: `${light.x}%`, top: `${light.y}%`, width: `${light.r * 2}%`, ['--glow' as string]: light.colorAt?.[tod] ?? light.color, ['--l' as string]: strength }}
    >
      <i />
    </div>
  );
}

function EffectView({ effect }: { effect: Effect }) {
  if ('particles' in effect)
    return (
      <div className="board__effect" style={place(effect.region)}>
        <Particles kind={effect.particles} density={effect.density} />
      </div>
    );
  return (
    <div className={`scene-steam scene-steam--${effect.steam}`} style={place(effect.region)}>
      <i />
      <i />
      <i />
    </div>
  );
}

function HotspotButton({ envId, spot, state }: { envId: string; spot: Hotspot; state: number }) {
  const label = spot.kind === 'cycle' ? `${spot.label}: ${spot.states[state]}. Change it` : spot.label;
  return <button type="button" className="scene-hotspot" style={place(spot.region)} aria-label={label} title={label} onClick={() => pressHotspot(envId, spot)} />;
}
