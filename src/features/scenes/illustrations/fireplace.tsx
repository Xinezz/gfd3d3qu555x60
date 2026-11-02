import { useId } from 'react';
import type { SceneLayout } from '../catalog';
import { Board } from '../Board';
import { Piece, Shelf, svgId } from './primitives';
import './fireplace.css';

/*
 * Fireplace Study, drawn on the 1600 × 900 artboard. The hearth and flames are the original
 * Fireplace (same shapes, scaled into place); the study around them is new. Colours that change
 * with the time of day are CSS variables in fireplace.css.
 */

export const LAYOUT: SceneLayout = {
  focus: [50, 72],
  lights: [
    { x: 50, y: 88, r: 30, color: '#ff8a3d', kind: 'fire', strength: { morning: 0.65, afternoon: 0.6, night: 1 }, follows: { hotspot: 'fire', values: [1, 1.4] } },
    { x: 50, y: 78, r: 58, color: '#b4521f', kind: 'fire', strength: { morning: 0.3, afternoon: 0.25, night: 0.75 }, follows: { hotspot: 'fire', values: [1, 1.3] } },
    { x: 35, y: 54, r: 5, color: '#ffc070', kind: 'candle', strength: { morning: 0.5, afternoon: 0.45, night: 1 } },
    { x: 65, y: 54, r: 5, color: '#ffc070', kind: 'candle', strength: { morning: 0.5, afternoon: 0.45, night: 1 } },
    { x: 78, y: 42, r: 24, color: '#7f9bd0', kind: 'window', colorAt: { morning: '#ffcf96', afternoon: '#dfe8f2' }, strength: { morning: 0.9, afternoon: 0.75, night: 0.4 } },
  ],
  effects: [
    { particles: 'embers', region: [36, 45, 28, 53] },
    { particles: 'sparks', region: [40, 50, 20, 45] },
    // Banked up, the fire throws more sparks.
    { particles: 'sparks', region: [38, 42, 24, 52], density: 2, when: { hotspot: 'fire', state: 1 } },
  ],
  hotspots: [{ id: 'fire', kind: 'cycle', label: 'Fireplace', states: ['a cosy fire', 'banked up high'], region: [38, 73, 24, 25] }],
};

function Flames() {
  // Each flame is a teardrop flickering on its own rhythm (different lengths, so they never line up).
  const flames = [
    { x: 0, s: 1.15, c: '#ff9a3c', d: 0, t: 1.6 },
    { x: -38, s: 0.8, c: '#ff7a2a', d: 0.3, t: 1.9 },
    { x: 40, s: 0.85, c: '#ff8a30', d: 0.6, t: 1.45 },
    { x: -14, s: 0.65, c: '#ffd27a', d: 0.15, t: 1.75 },
    { x: 16, s: 0.6, c: '#ffe3a0', d: 0.45, t: 1.3 },
  ];
  return (
    <g className="fp-flames">
      {flames.map((f, i) => (
        <g key={i} transform={`translate(${600 + f.x} 330) scale(${f.s})`}>
          <path className="scene__flame" style={{ animationDelay: `${f.d}s`, animationDuration: `${f.t}s` }} d="M0,0 C-34,-30 -24,-80 0,-140 C24,-80 34,-30 0,0Z" fill={f.c} />
        </g>
      ))}
    </g>
  );
}

function Candle({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 8} y={500} width={16} height={46} rx={3} fill="#e9d9bd" />
      <rect x={x - 8} y={500} width={16} height={6} rx={3} fill="#f6ead4" />
    </g>
  );
}

function CandleFlame({ x, t }: { x: number; t: number }) {
  return (
    <Piece box={[x - 12, 470, 24, 32]} className="fp-candle" origin="50% 100%" style={{ animationDuration: `${t}s` }}>
      <path d={`M${x},476 C${x - 7},488 ${x - 5},497 ${x},500 C${x + 5},497 ${x + 7},488 ${x},476Z`} fill="#ffd27a" />
    </Piece>
  );
}

export function Fireplace() {
  const id = useId();
  const sky = svgId(id, 'fp-sky');
  const sun = svgId(id, 'fp-sun');
  return (
    <>
      <div className="scene__sky" style={{ background: '#140c08' }} />
      <Board envId="fireplace" layout={LAYOUT}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--sky-1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--sky-2)' }} />
            </linearGradient>
            <radialGradient id={sun}>
              <stop offset="0" stopColor="#fff1cf" stopOpacity={0.95} />
              <stop offset="1" stopColor="#ffd59a" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Walls and floor */}
          <rect width={1600} height={900} style={{ fill: 'var(--wall)' }} />
          <rect y={640} width={1600} height={260} style={{ fill: 'var(--wainscot)' }} />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={i * 100 + 46} y={660} width={4} height={210} fill="#000" opacity={0.18} />
          ))}
          <rect y={872} width={1600} height={28} fill="#140b06" />

          {/* Window, with the sky outside */}
          <path d="M1150,560 V210 A100,100 0 0 1 1350,210 V560 Z" fill="#2a1a10" />
          <path d="M1166,548 V214 A84,84 0 0 1 1334,214 V548 Z" fill={`url(#${sky})`} />
          <circle cx={1200} cy={470} r={90} fill={`url(#${sun})`} style={{ opacity: 'var(--sun-o)' }} />
          <g style={{ opacity: 'var(--stars-o)' }} fill="#f5ecdc">
            {[[1190, 200, 1.6], [1232, 168, 1.2], [1290, 236, 1.4], [1215, 290, 1], [1312, 300, 1.3], [1260, 340, 1]].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} />
            ))}
          </g>
          <circle cx={1296} cy={196} r={24} fill="#f3ead8" style={{ opacity: 'var(--moon-o)' }} />
          <path d="M1166,548 V470 Q1200,446 1236,462 Q1270,440 1300,458 Q1320,450 1334,456 V548 Z" style={{ fill: 'var(--trees)' }} />
          <rect x={1244} y={200} width={12} height={350} fill="#2a1a10" />
          <rect x={1166} y={372} width={168} height={10} fill="#2a1a10" />
          <rect x={1140} y={556} width={220} height={16} rx={3} fill="#3a2418" />

          {/* Bookshelves */}
          <Shelf x={30} y={70} w={410} h={800} rows={6} seed={11} />
          <Shelf x={1380} y={70} w={200} h={800} rows={6} seed={12} />

          {/* The hearth (the original fireplace) */}
          <g transform="translate(800 900) scale(1.1) translate(-600 -420)">
            <path d="M330,420 L330,170 Q330,120 380,120 L820,120 Q870,120 870,170 L870,420 Z" fill="#2b1a12" />
            <path d="M410,420 L410,230 Q410,190 450,190 L750,190 Q790,190 790,230 L790,420 Z" fill="#0b0605" />
            <rect x={300} y={100} width={600} height={26} rx={4} fill="#3a2418" />
          </g>

          {/* On the mantel: candles and a few books */}
          <Candle x={560} />
          <Candle x={1040} />
          <g>
            <rect x={1072} y={512} width={14} height={36} fill="#5d3a2a" />
            <rect x={1088} y={506} width={12} height={42} fill="#2f3b4a" />
            <rect x={1102} y={516} width={16} height={32} fill="#71553a" />
          </g>

          {/* Rug and armchair */}
          <ellipse cx={800} cy={902} rx={560} ry={58} fill="#4a1f17" />
          <ellipse cx={800} cy={902} rx={520} ry={44} fill="none" stroke="#6b3020" strokeWidth={6} />
          <g>
            <path d="M170,800 V640 Q170,575 235,575 H375 Q440,575 440,640 V800 Z" fill="#4c2027" />
            <path d="M190,790 V650 Q190,600 240,600 H370 Q420,600 420,650 V790 Z" fill="#5c2830" />
            <rect x={150} y={760} width={310} height={70} rx={20} fill="#552429" />
            <path d="M118,880 V720 Q118,686 152,686 H170 Q204,686 204,720 V880 Z" fill="#43191f" />
            <path d="M406,880 V720 Q406,686 440,686 H458 Q492,686 492,720 V880 Z" fill="#43191f" />
            <rect x={140} y={876} width={14} height={20} fill="#2a1410" />
            <rect x={458} y={876} width={14} height={20} fill="#2a1410" />
          </g>
          <g>
            <rect x={1130} y={860} width={90} height={14} fill="#4a2f2f" />
            <rect x={1138} y={846} width={78} height={14} fill="#3f4a3a" />
            <rect x={1134} y={834} width={70} height={12} fill="#6b4b2e" transform="rotate(-4 1170 840)" />
          </g>

          {/* Morning and afternoon light wash the room a little */}
          <rect width={1600} height={900} style={{ fill: 'var(--ambient)', opacity: 'var(--ambient-o)' }} />
        </svg>

        {/* The fire (flames, then the logs in front of them), in the same place as the original */}
        <Piece box={[560, 560, 480, 340]}>
          <g transform="translate(800 900) scale(1.1) translate(-600 -420)">
            <Flames />
            <rect x={500} y={322} width={200} height={20} rx={10} fill="#3b2216" transform="rotate(-6 600 332)" />
            <rect x={505} y={330} width={190} height={18} rx={9} fill="#2e1a10" transform="rotate(7 600 339)" />
            <ellipse cx={600} cy={352} rx={150} ry={10} fill="#ff7a2a" opacity={0.25} />
          </g>
        </Piece>
        <CandleFlame x={560} t={1.3} />
        <CandleFlame x={1040} t={1.7} />
      </Board>
    </>
  );
}
