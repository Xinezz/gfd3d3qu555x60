import { useId, useMemo } from 'react';
import type { SceneLayout } from '../catalog';
import { Board } from '../Board';
import { Clip, Piece, rng, svgId } from './primitives';
import './cafe.css';

/*
 * Rainy Day Café on the 1600 × 900 artboard: a big window onto a rainy street, the counter and
 * espresso machine, pendant lights, hanging plants and a table with a coffee. The rain stays
 * outside: it only falls inside the window. Time-of-day colours are CSS variables in cafe.css.
 */

const WINDOW = { x: 346, y: 66, w: 908, h: 488 };
const glass: [number, number, number, number] = [WINDOW.x / 16, WINDOW.y / 9, WINDOW.w / 16, WINDOW.h / 9];

export const LAYOUT: SceneLayout = {
  focus: [52, 45],
  lights: [
    { x: 35, y: 15.5, r: 13, color: '#ffc070', kind: 'lamp', strength: { morning: 0.45, afternoon: 0.4, night: 1 } },
    { x: 50, y: 19.5, r: 13, color: '#ffc070', kind: 'lamp', strength: { morning: 0.45, afternoon: 0.4, night: 1 } },
    { x: 65, y: 15.5, r: 13, color: '#ffc070', kind: 'lamp', strength: { morning: 0.45, afternoon: 0.4, night: 1 } },
    { x: 12, y: 60, r: 18, color: '#ffb766', kind: 'lamp', strength: { morning: 0.35, afternoon: 0.3, night: 0.8 } },
    { x: 50, y: 34, r: 38, color: '#5d6f9a', kind: 'window', colorAt: { morning: '#e8e4d8', afternoon: '#d8e0e8' }, strength: { morning: 0.55, afternoon: 0.6, night: 0.35 } },
  ],
  effects: [
    { particles: 'rain', region: glass, density: 0.7 },
    { particles: 'glass', region: glass, density: 0.8 },
    { steam: 'wisp', region: [79.6, 60, 3.2, 10] },
    { steam: 'wisp', region: [17.9, 54, 2.6, 8] },
    { steam: 'puff', region: [78, 50, 6.4, 20], when: { hotspot: 'cup', state: 1 } },
  ],
  hotspots: [{ id: 'cup', kind: 'pulse', label: 'Coffee cup: stir up some steam', region: [78.6, 69, 5, 9] }],
};

const BOKEH = ['#ffb35c', '#ffd28a', '#ff8f6b', '#f5c26b', '#9ec1ff'];

/** The street outside: buildings with lit windows, lamps and out-of-focus lights. */
function Street({ gradId }: { gradId: string }) {
  const { buildings, lit, bokeh } = useMemo(() => {
    const r = rng(61);
    const buildings: { x: number; w: number; h: number }[] = [];
    for (let x = WINDOW.x - 20; x < WINDOW.x + WINDOW.w + 20; ) {
      const w = 50 + r() * 90;
      buildings.push({ x, w, h: 130 + r() * 190 });
      x += w + 4 + r() * 8;
    }
    const lit: { x: number; y: number }[] = [];
    for (const b of buildings)
      for (let y = 520 - b.h + 14; y < 500; y += 22) for (let x = b.x + 10; x < b.x + b.w - 12; x += 18) if (r() < 0.22) lit.push({ x, y });
    const bokeh = Array.from({ length: 16 }, () => ({ x: WINDOW.x + r() * WINDOW.w, y: 300 + r() * 230, r: 12 + r() * 30, c: Math.floor(r() * BOKEH.length) }));
    return { buildings, lit, bokeh };
  }, []);
  return (
    <>
      {buildings.map((b, i) => (
        <rect key={i} x={b.x} y={520 - b.h} width={b.w} height={b.h} style={{ fill: 'var(--city)' }} />
      ))}
      <g style={{ opacity: 'var(--lit-o)' }} fill="#ffcf8a">
        {lit.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width={6} height={9} opacity={0.75} />
        ))}
      </g>
      <rect x={WINDOW.x} y={520} width={WINDOW.w} height={40} style={{ fill: 'var(--street)' }} />
      {[470, 900, 1180].map((x) => (
        <g key={x}>
          <rect x={x - 2} y={330} width={5} height={192} fill="#111018" />
          <circle cx={x} cy={330} r={34} fill={`url(#${gradId}-0)`} style={{ opacity: 'var(--lamp-o)' }} />
        </g>
      ))}
      <g style={{ opacity: 'var(--bokeh-o)' }}>
        {bokeh.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${gradId}-${b.c})`} opacity={0.55} />
        ))}
      </g>
    </>
  );
}

function HangingPlant({ x, len, t }: { x: number; len: number; t: number }) {
  const leaves = useMemo(() => {
    const r = rng(x);
    return Array.from({ length: 22 }, (_, i) => {
      const strand = i % 3;
      const k = Math.floor(i / 3) / 7;
      return { cx: x - 34 + strand * 34 + Math.sin(k * 5 + strand) * 10, cy: 196 + k * len, rot: r() * 70 - 35, c: r() < 0.5 ? '#5d8a4e' : '#6f9a5a' };
    });
  }, [x, len]);
  return (
    <Piece box={[x - 70, 0, 140, 210 + len]} className="sway" origin="50% 0%" style={{ animationDuration: `${t}s`, ['--sway' as string]: '1.3deg' }}>
      <line x1={x} y1={0} x2={x} y2={150} stroke="#3a2a1e" strokeWidth={2} />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.cx} cy={l.cy} rx={12} ry={6} fill={l.c} transform={`rotate(${l.rot} ${l.cx} ${l.cy})`} />
      ))}
      <path d={`M${x - 42},150 L${x + 42},150 L${x + 32},198 Q${x},206 ${x - 32},198 Z`} fill="#b5694a" />
      <rect x={x - 46} y={146} width={92} height={10} rx={3} fill="#c7795a" />
    </Piece>
  );
}

function Pendant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={y - 34} stroke="#4a3424" strokeWidth={2} />
      <path d={`M${x - 42},${y} Q${x},${y - 52} ${x + 42},${y} Z`} fill="#3a281b" />
      <ellipse cx={x} cy={y} rx={34} ry={6} fill="#ffd9a0" />
    </g>
  );
}

export function Cafe() {
  const id = useId();
  const sky = svgId(id, 'cafe-sky');
  const glow = svgId(id, 'cafe-glow');
  const clip = svgId(id, 'cafe-clip');
  return (
    <>
      <div className="scene__sky" style={{ background: '#1a110c' }} />
      <Board envId="cafe" layout={LAYOUT}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--sky-1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--sky-2)' }} />
            </linearGradient>
            {BOKEH.map((c, i) => (
              <radialGradient key={c} id={`${glow}-${i}`}>
                <stop offset="0" stopColor={c} stopOpacity={0.9} />
                <stop offset="1" stopColor={c} stopOpacity={0} />
              </radialGradient>
            ))}
            <clipPath id={clip}>
              <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} />
            </clipPath>
          </defs>

          {/* Walls and floor */}
          <rect width={1600} height={900} style={{ fill: 'var(--wall)' }} />
          <rect y={620} width={1600} height={280} style={{ fill: 'var(--wainscot)' }} />
          {Array.from({ length: 20 }, (_, i) => (
            <rect key={i} x={i * 80 + 30} y={640} width={3} height={220} fill="#000" opacity={0.16} />
          ))}
          <rect y={862} width={1600} height={38} fill="#1a110b" />

          {/* The window and the rainy street outside */}
          <rect x={WINDOW.x - 16} y={WINDOW.y - 16} width={WINDOW.w + 32} height={WINDOW.h + 32} rx={6} fill="#2a1b12" />
          <g clipPath={`url(#${clip})`}>
            <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} fill={`url(#${sky})`} />
            <Street gradId={glow} />
          </g>
          <rect x={642} y={WINDOW.y} width={12} height={WINDOW.h} fill="#2a1b12" />
          <rect x={950} y={WINDOW.y} width={12} height={WINDOW.h} fill="#2a1b12" />
          <rect x={WINDOW.x} y={176} width={WINDOW.w} height={10} fill="#2a1b12" />
          <rect x={316} y={562} width={968} height={18} rx={3} fill="#3b2618" />

          {/* Chalkboard menu */}
          <rect x={40} y={130} width={250} height={260} rx={6} fill="#3a2618" />
          <rect x={52} y={142} width={226} height={236} rx={3} fill="#1e2420" />
          <g fill="#d9dccf" opacity={0.55}>
            <rect x={80} y={168} width={120} height={6} rx={3} />
            {[206, 236, 266, 296, 326].map((y, i) => (
              <g key={y}>
                <rect x={76} y={y} width={90 + (i % 3) * 14} height={4} rx={2} />
                <rect x={222} y={y} width={30} height={4} rx={2} />
              </g>
            ))}
          </g>

          {/* Counter and espresso machine */}
          <rect x={0} y={614} width={380} height={260} fill="#3a2416" />
          {[20, 140, 260].map((x) => (
            <rect key={x} x={x} y={640} width={100} height={200} rx={4} fill="none" stroke="#2a190e" strokeWidth={4} />
          ))}
          <rect x={0} y={596} width={392} height={20} rx={3} fill="#6a4630" />
          <rect x={70} y={470} width={180} height={126} rx={10} fill="#8a5632" />
          <rect x={70} y={470} width={180} height={22} rx={8} fill="#a0663a" />
          <rect x={98} y={536} width={28} height={18} rx={3} fill="#2a2420" />
          <rect x={192} y={536} width={28} height={18} rx={3} fill="#2a2420" />
          <rect x={86} y={580} width={150} height={12} rx={3} fill="#3a3430" />
          <path d="M240,500 Q262,520 256,560" stroke="#c9c2b8" strokeWidth={4} fill="none" />
          {[88, 120, 152].map((x) => (
            <rect key={x} x={x} y={452} width={22} height={18} rx={3} fill="#efe6d8" />
          ))}
          <path d="M282,560 L318,560 L314,594 L286,594 Z" fill="#f2e9dc" />
          <path d="M318,568 Q332,572 318,586" stroke="#f2e9dc" strokeWidth={4} fill="none" />

          {/* Pendant lights */}
          <Pendant x={560} y={130} />
          <Pendant x={800} y={165} />
          <Pendant x={1040} y={130} />

          {/* A table with a coffee, and chairs */}
          <path d="M1490,880 V700 Q1490,640 1530,640 H1600 V880 Z" fill="#2c1a10" />
          <rect x={1540} y={600} width={60} height={60} rx={8} fill="#3a2416" />
          <ellipse cx={1330} cy={702} rx={175} ry={26} fill="#6a4630" />
          <ellipse cx={1330} cy={696} rx={175} ry={24} fill="#7a5238" />
          <rect x={1320} y={706} width={20} height={160} fill="#3a2416" />
          <ellipse cx={1330} cy={868} rx={80} ry={10} fill="#2a190e" />
          <path d="M1080,880 V720 Q1080,690 1110,690 H1150 V880 Z" fill="#33200f" />
          <ellipse cx={1300} cy={690} rx={36} ry={8} fill="#efe4d2" />
          <path d="M1278,650 L1322,650 L1316,688 Q1300,694 1284,688 Z" fill="#f6eee2" />
          <ellipse cx={1300} cy={651} rx={22} ry={5} fill="#5a3624" />
          <path d="M1321,660 Q1338,664 1320,680" stroke="#f6eee2" strokeWidth={5} fill="none" />
          <rect x={1370} y={676} width={70} height={10} rx={2} fill="#c9b79a" transform="rotate(-6 1405 681)" />

          <rect width={1600} height={900} style={{ fill: 'var(--ambient)', opacity: 'var(--ambient-o)' }} />
        </svg>

        {/* A slow sheen of reflected light moving across the glass */}
        <Clip box={[WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h]}>
          <div className="cafe-sheen" />
        </Clip>
        <HangingPlant x={205} len={130} t={7.3} />
        <HangingPlant x={1400} len={100} t={8.9} />
      </Board>
    </>
  );
}
