import { useId } from 'react';
import type { SceneLayout } from '../catalog';
import { Board } from '../Board';
import { Piece, Shelf, svgId } from './primitives';
import './library.css';

/*
 * Midnight Library on the 1600 × 900 artboard: floor-to-ceiling shelves, two tall arched windows
 * with curtains, light falling across the floor, a ladder and two reading desks with lamps. Quiet
 * on purpose: the only movement is dust in the light, curtains and the light itself, all slow.
 */

export const LAYOUT: SceneLayout = {
  focus: [50, 55],
  lights: [
    { x: 15.6, y: 72, r: 20, color: '#ffc46a', kind: 'lamp', strength: { morning: 0.35, afternoon: 0.3, night: 1 }, follows: { hotspot: 'lamp', values: [1, 0] } },
    { x: 84.4, y: 72, r: 18, color: '#ffc46a', kind: 'lamp', strength: { morning: 0.35, afternoon: 0.3, night: 0.9 } },
    { x: 41, y: 62, r: 22, color: '#8fa8de', kind: 'moon', colorAt: { morning: '#ffd49a', afternoon: '#e6edf5' }, strength: { morning: 0.8, afternoon: 0.6, night: 0.55 } },
    { x: 59, y: 62, r: 22, color: '#8fa8de', kind: 'moon', colorAt: { morning: '#ffd49a', afternoon: '#e6edf5' }, strength: { morning: 0.8, afternoon: 0.6, night: 0.55 } },
  ],
  effects: [{ particles: 'dust', region: [33, 30, 34, 70], density: 0.9 }],
  hotspots: [{ id: 'lamp', kind: 'cycle', label: 'Desk lamp', states: ['on', 'off'], region: [12, 66, 7.5, 13] }],
};

/** An arched window: frame, the sky beyond, glazing bars. */
function ArchedWindow({ x, sky, moon }: { x: number; sky: string; moon?: boolean }) {
  const w = 210;
  const r = w / 2;
  return (
    <g>
      <path d={`M${x - 12},608 V${185} A${r + 12},${r + 12} 0 0 1 ${x + w + 12},185 V608 Z`} fill="#2a1d14" />
      <path d={`M${x},600 V185 A${r},${r} 0 0 1 ${x + w},185 V600 Z`} fill={`url(#${sky})`} />
      <g style={{ opacity: 'var(--stars-o)' }} fill="#f5ecdc">
        {[[x + 40, 150, 1.4], [x + 150, 120, 1.1], [x + 80, 250, 1.2], [x + 170, 300, 1], [x + 30, 360, 1.1]].map(([cx, cy, rr], i) => (
          <circle key={i} cx={cx} cy={cy} r={rr} />
        ))}
      </g>
      {moon && <circle cx={x + 130} cy={200} r={30} fill="#f3ead8" style={{ opacity: 'var(--moon-o)' }} />}
      <path d={`M${x},600 V530 Q${x + 50},505 ${x + 100},520 Q${x + 160},498 ${x + w},516 V600 Z`} style={{ fill: 'var(--roofs)' }} />
      <rect x={x + r - 5} y={84} width={10} height={516} fill="#2a1d14" />
      <rect x={x} y={300} width={w} height={8} fill="#2a1d14" />
      <rect x={x} y={440} width={w} height={8} fill="#2a1d14" />
      <rect x={x - 20} y={600} width={w + 40} height={14} rx={2} fill="#3a2818" />
    </g>
  );
}

function Drape({ x, flip, t, delay }: { x: number; flip?: boolean; t: number; delay: number }) {
  const d = flip ? `M${x},70 H${x + 80} Q${x + 70},320 ${x + 76},622 H${x + 6} Q${x + 18},320 ${x},70Z` : `M${x},70 H${x + 80} Q${x + 62},320 ${x + 74},622 H${x + 4} Q${x + 12},320 ${x},70Z`;
  return (
    <Piece box={[x - 10, 60, 100, 570]} className="drape" origin="50% 0%" style={{ animationDuration: `${t}s`, animationDelay: `${delay}s` }}>
      <path d={d} fill="#5a1f24" />
      <path d={`M${x + 26},76 Q${x + 22},340 ${x + 28},618`} stroke="#3f1418" strokeWidth={6} fill="none" opacity={0.7} />
      <path d={`M${x + 54},76 Q${x + 50},340 ${x + 54},618`} stroke="#3f1418" strokeWidth={5} fill="none" opacity={0.6} />
    </Piece>
  );
}

function Desk({ x, lampX, glow }: { x: number; lampX: number; glow?: string }) {
  return (
    <g>
      <rect x={x + 20} y={722} width={14} height={160} fill="#2e1d10" />
      <rect x={x + 416} y={722} width={14} height={160} fill="#2e1d10" />
      <rect x={x} y={722} width={450} height={40} fill="#3e2716" />
      <rect x={x - 6} y={704} width={462} height={18} rx={3} fill="#5a3a24" />
      {/* Banker's lamp */}
      <ellipse cx={lampX} cy={704} rx={30} ry={6} fill="#b08a4a" />
      <rect x={lampX - 3} y={640} width={6} height={64} fill="#b08a4a" />
      <path d={`M${lampX - 56},644 Q${lampX},600 ${lampX + 56},644 Z`} fill="#2f5b3e" />
      <ellipse className={glow} cx={lampX} cy={644} rx={50} ry={6} fill="#ffe1a0" />
    </g>
  );
}

export function Library() {
  const id = useId();
  const sky = svgId(id, 'lib-sky');
  const beam = svgId(id, 'lib-beam');
  return (
    <>
      <div className="scene__sky" style={{ background: '#140d08' }} />
      <Board envId="library" layout={LAYOUT}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--sky-1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--sky-2)' }} />
            </linearGradient>
          </defs>

          {/* Walls and floorboards */}
          <rect width={1600} height={900} style={{ fill: 'var(--wall)' }} />
          <rect y={800} width={1600} height={100} style={{ fill: 'var(--floor)' }} />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} y={812 + i * 15} width={1600} height={2} fill="#000" opacity={0.18} />
          ))}

          <ArchedWindow x={560} sky={sky} />
          <ArchedWindow x={830} sky={sky} moon />
          <rect x={510} y={60} width={310} height={8} rx={3} fill="#3a2818" />
          <rect x={780} y={60} width={310} height={8} rx={3} fill="#3a2818" />

          <Shelf x={0} y={0} w={500} h={820} rows={7} seed={51} frame="#2a1d14" back="#140d08" />
          <Shelf x={1100} y={0} w={500} h={820} rows={7} seed={52} frame="#2a1d14" back="#140d08" />

          {/* Ladder leaning on the left shelves */}
          <g stroke="#5a3a22" strokeWidth={9} strokeLinecap="round">
            <line x1={420} y1={60} x2={496} y2={880} />
            <line x1={470} y1={60} x2={548} y2={880} />
            {Array.from({ length: 11 }, (_, i) => {
              const t = (i + 0.6) / 11.5;
              return <line key={i} x1={420 + 76 * t} y1={60 + 820 * t} x2={470 + 78 * t} y2={60 + 820 * t} strokeWidth={6} />;
            })}
          </g>

          <Desk x={90} lampX={250} glow="lib-lamp-glow" />
          <Desk x={1060} lampX={1350} />
          {/* An open book and a stack, one on each desk */}
          <path d="M330,700 Q370,690 400,698 Q430,690 470,700 L470,706 L330,706 Z" fill="#efe4cf" />
          <rect x={1130} y={676} width={110} height={12} fill="#4a2f2f" />
          <rect x={1138} y={664} width={96} height={12} fill="#3f4a3a" />
          <rect x={1126} y={688} width={118} height={16} fill="#6b4b2e" />

          <rect width={1600} height={900} style={{ fill: 'var(--ambient)', opacity: 'var(--ambient-o)' }} />
        </svg>

        {/* Light from the windows falling across the floor, shifting very slowly */}
        <Piece box={[540, 600, 540, 300]} className="lib-beam">
          <defs>
            <linearGradient id={beam} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--beam)' }} stopOpacity={0.32} />
              <stop offset="1" style={{ stopColor: 'var(--beam)' }} stopOpacity={0} />
            </linearGradient>
          </defs>
          <g style={{ opacity: 'var(--beam-o)' }} fill={`url(#${beam})`}>
            <polygon points="566,600 764,600 830,900 600,900" />
            <polygon points="836,600 1034,600 1072,900 870,900" />
          </g>
        </Piece>
        <Drape x={520} t={13} delay={0} />
        <Drape x={730} flip t={15} delay={-4} />
        <Drape x={790} t={17} delay={-9} />
        <Drape x={1000} flip t={14} delay={-2} />
      </Board>
    </>
  );
}
