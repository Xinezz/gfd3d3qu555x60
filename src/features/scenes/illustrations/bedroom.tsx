import { useId, useMemo, type ReactNode } from 'react';
import type { SceneLayout } from '../catalog';
import { Board } from '../Board';
import { Clip, Piece, rng, svgId } from './primitives';
import './bedroom.css';

/*
 * Cosy Bedroom on the 1600 × 900 artboard: a window with curtains and clouds going by, a study
 * desk with a lamp, books and a plant, a bed with cushions and a sleeping cat, string lights. The
 * desk lamp has three settings: click it.
 */

const WINDOW = { x: 360, y: 100, w: 460, h: 420 };

export const LAYOUT: SceneLayout = {
  focus: [44, 56],
  lights: [
    { x: 24, y: 64, r: 22, color: '#ffc27a', kind: 'lamp', strength: { morning: 0.4, afternoon: 0.35, night: 1 }, follows: { hotspot: 'lamp', values: [1, 0.45, 0] } },
    { x: 37, y: 34, r: 30, color: '#7d93c4', kind: 'window', colorAt: { morning: '#ffd6a6', afternoon: '#e8eef4' }, strength: { morning: 0.9, afternoon: 0.8, night: 0.35 } },
    { x: 78, y: 8, r: 24, color: '#ffd28a', kind: 'lamp', strength: { morning: 0.2, afternoon: 0.15, night: 0.6 } },
  ],
  effects: [{ particles: 'dust', region: [16, 20, 50, 70], density: 0.6 }],
  hotspots: [{ id: 'lamp', kind: 'cycle', label: 'Desk lamp', states: ['warm', 'dim', 'off'], region: [20, 50, 8, 17] }],
};

/** Two copies of the same clouds side by side, so sliding by one copy loops without a jump. */
function Clouds() {
  const clouds = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 5 }, (_, i) => ({ x: 30 + i * 92 + r() * 30, y: 60 + r() * 150, s: 0.7 + r() * 0.6 }));
  }, []);
  const one = clouds.map((c, i) => (
    <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
      <ellipse cx={0} cy={0} rx={46} ry={16} />
      <ellipse cx={-18} cy={-10} rx={22} ry={16} />
      <ellipse cx={14} cy={-14} rx={26} ry={20} />
    </g>
  ));
  return (
    <svg className="bed-clouds" viewBox={`0 0 ${WINDOW.w * 2} ${WINDOW.h}`} preserveAspectRatio="none" aria-hidden>
      <g style={{ fill: 'var(--cloud)', opacity: 'var(--cloud-o)' }}>
        {one}
        <g transform={`translate(${WINDOW.w} 0)`}>{one}</g>
      </g>
    </svg>
  );
}

function Curtain({ x, t, delay }: { x: number; t: number; delay: number }) {
  return (
    <Piece box={[x - 10, 64, 120, 500]} className="drape" origin="50% 0%" style={{ animationDuration: `${t}s`, animationDelay: `${delay}s` }}>
      <path d={`M${x},70 H${x + 100} Q${x + 84},300 ${x + 96},556 H${x + 6} Q${x + 18},300 ${x},70Z`} fill="#b9826b" />
      <path d={`M${x + 30},76 Q${x + 26},320 ${x + 34},552`} stroke="#9c6a55" strokeWidth={7} fill="none" opacity={0.7} />
      <path d={`M${x + 66},76 Q${x + 60},320 ${x + 68},552`} stroke="#9c6a55" strokeWidth={6} fill="none" opacity={0.6} />
    </Piece>
  );
}

function Plant({ box, origin, t, children }: { box: [number, number, number, number]; origin: string; t: number; children: ReactNode }) {
  return (
    <Piece box={box} className="sway" origin={origin} style={{ animationDuration: `${t}s`, ['--sway' as string]: '1.6deg' }}>
      {children}
    </Piece>
  );
}

function Cat() {
  return (
    <Piece box={[1170, 590, 190, 100]} className="bed-cat" origin="50% 100%">
      <path d="M1340,676 Q1352,630 1318,622" stroke="#3b322c" strokeWidth={14} fill="none" strokeLinecap="round" />
      <ellipse cx={1262} cy={650} rx={78} ry={34} fill="#3b322c" />
      <circle cx={1200} cy={640} r={26} fill="#433931" />
      <path d="M1182,624 L1186,600 L1200,618 Z" fill="#433931" />
      <path d="M1206,616 L1216,596 L1222,620 Z" fill="#433931" />
      <path d="M1190,642 Q1196,646 1202,642 M1206,642 Q1212,646 1218,642" stroke="#1f1a16" strokeWidth={2} fill="none" />
    </Piece>
  );
}

function StringLights() {
  const bulbs = Array.from({ length: 13 }, (_, i) => {
    const x = 900 + i * 54;
    const y = 50 + Math.sin(i * 0.8) * 14 + (i < 6 ? i * 4 : (12 - i) * 3);
    return { x, y, d: (i * 0.53) % 4 };
  });
  return (
    <Piece box={[880, 20, 720, 110]}>
      <path d={`M880,40 ${bulbs.map((b) => `L${b.x},${b.y - 6}`).join(' ')} L1600,46`} stroke="#3a2c20" strokeWidth={2} fill="none" />
      {bulbs.map((b, i) => (
        <circle key={i} className="bed-bulb" style={{ animationDelay: `${b.d}s` }} cx={b.x} cy={b.y} r={6} fill="#ffd38a" />
      ))}
    </Piece>
  );
}

export function Bedroom() {
  const id = useId();
  const sky = svgId(id, 'bed-sky');
  const clip = svgId(id, 'bed-clip');
  return (
    <>
      <div className="scene__sky" style={{ background: '#1a1410' }} />
      <Board envId="bedroom" layout={LAYOUT}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--sky-1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--sky-2)' }} />
            </linearGradient>
            <clipPath id={clip}>
              <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} />
            </clipPath>
          </defs>

          {/* Walls and floor */}
          <rect width={1600} height={900} style={{ fill: 'var(--wall)' }} />
          <rect y={830} width={1600} height={70} style={{ fill: 'var(--floor)' }} />
          <ellipse cx={760} cy={880} rx={380} ry={34} fill="#7a4a3a" />
          <ellipse cx={760} cy={880} rx={340} ry={24} fill="none" stroke="#c48a6e" strokeWidth={4} opacity={0.6} />

          {/* A framed sketch on the wall */}
          <rect x={110} y={190} width={130} height={160} rx={3} fill="#6a4a32" />
          <rect x={122} y={202} width={106} height={136} fill="#efe2cc" />
          <path d="M132,320 Q160,270 182,300 Q200,250 218,320 Z" fill="#c9a98a" />

          {/* The window: sky, hills, moon and stars at night */}
          <rect x={WINDOW.x - 16} y={WINDOW.y - 16} width={WINDOW.w + 32} height={WINDOW.h + 32} rx={4} fill="#e6d8c0" />
          <g clipPath={`url(#${clip})`}>
            <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} fill={`url(#${sky})`} />
            <g style={{ opacity: 'var(--stars-o)' }} fill="#f5ecdc">
              {[[400, 150, 1.4], [470, 210, 1.1], [560, 140, 1.2], [650, 250, 1], [760, 300, 1.3], [430, 300, 1]].map(([cx, cy, r], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} />
              ))}
            </g>
            <circle cx={730} cy={175} r={28} fill="#f3ead8" style={{ opacity: 'var(--moon-o)' }} />
            <path d="M360,520 V440 Q430,400 510,430 Q600,385 690,425 Q760,400 820,418 V520 Z" style={{ fill: 'var(--hills)' }} />
          </g>

          {/* Desk under the window */}
          <rect x={320} y={618} width={14} height={232} fill="#5a3d28" />
          <rect x={846} y={618} width={14} height={232} fill="#5a3d28" />
          <rect x={330} y={618} width={520} height={36} fill="#6a4a32" />
          <rect x={560} y={630} width={60} height={8} rx={4} fill="#4a3220" />
          <rect x={300} y={600} width={580} height={18} rx={3} fill="#7a5638" />
          {/* Lamp: base, arm, shade, and the light under it */}
          <ellipse cx={380} cy={598} rx={34} ry={7} fill="#c9a26a" />
          <path d="M380,596 L420,522 L372,474" stroke="#c9a26a" strokeWidth={7} fill="none" strokeLinecap="round" />
          <path d="M340,470 L392,446 L414,494 Z" fill="#d7b27a" />
          <ellipse className="bed-lamp-glow" cx={378} cy={488} rx={24} ry={7} fill="#fff0c8" transform="rotate(-24 378 488)" />
          {/* Notebook, mug, pencil cup, books */}
          <path d="M450,598 L530,590 L610,598 L610,600 L450,600 Z" fill="#f1e6d2" />
          <rect x={448} y={597} width={164} height={4} fill="#d8c7aa" />
          <rect x={642} y={566} width={30} height={32} rx={5} fill="#c47e6a" />
          <path d="M672,574 Q684,580 672,592" stroke="#c47e6a" strokeWidth={4} fill="none" />
          <rect x={700} y={556} width={24} height={42} rx={3} fill="#3f4a5a" />
          <g stroke="#e9c46a" strokeWidth={3}>
            <line x1={706} y1={556} x2={702} y2={530} />
            <line x1={714} y1={556} x2={716} y2={526} />
          </g>
          <line x1={720} y1={556} x2={728} y2={534} stroke="#c47e6a" strokeWidth={3} />
          <rect x={754} y={578} width={96} height={20} fill="#5d5236" />
          <rect x={760} y={560} width={84} height={18} fill="#4f3a52" />
          <rect x={750} y={544} width={92} height={16} fill="#7a4a32" transform="rotate(-3 796 552)" />

          {/* Shelf over the bed: books, a photo, a little plant */}
          <rect x={1100} y={330} width={400} height={12} rx={2} fill="#6a4a32" />
          {[1120, 1136, 1150, 1168, 1182].map((x, i) => (
            <rect key={x} x={x} y={330 - (46 + (i % 3) * 10)} width={13} height={46 + (i % 3) * 10} fill={['#5a3a2a', '#3f4a3a', '#71553a', '#2f3b4a', '#7a4a32'][i]} />
          ))}
          <rect x={1260} y={262} width={74} height={68} rx={3} fill="#e6d8c0" />
          <rect x={1268} y={270} width={58} height={52} fill="#9fb0a0" />
          <path d="M1410,330 L1440,330 L1436,300 L1414,300 Z" fill="#c7795a" />
          <g fill="#6f9a5a">
            <ellipse cx={1418} cy={286} rx={8} ry={16} transform="rotate(-20 1418 286)" />
            <ellipse cx={1432} cy={284} rx={8} ry={16} transform="rotate(20 1432 284)" />
          </g>

          {/* The bed */}
          <rect x={1040} y={480} width={580} height={180} rx={36} fill="#8a6a52" />
          <rect x={1060} y={500} width={560} height={140} rx={26} fill="#9a7860" />
          <rect x={990} y={620} width={630} height={150} rx={20} fill="#ead9c5" />
          <path d="M990,660 Q1300,640 1620,660 V820 H990 Z" fill="#c48a6e" />
          {[1060, 1180, 1300, 1420, 1540].map((x) => (
            <rect key={x} x={x} y={660} width={40} height={160} fill="#b57a5f" opacity={0.6} />
          ))}
          <rect x={990} y={810} width={630} height={50} fill="#6a4a32" />
          <ellipse cx={1150} cy={612} rx={90} ry={34} fill="#f3e7d8" />
          <ellipse cx={1420} cy={606} rx={96} ry={36} fill="#f3e7d8" />
          <rect x={1300} y={588} width={76} height={56} rx={16} fill="#c4654f" transform="rotate(-8 1338 616)" />

          <rect width={1600} height={900} style={{ fill: 'var(--ambient)', opacity: 'var(--ambient-o)' }} />
        </svg>

        {/* Clouds passing the window, behind the glazing bars */}
        <Clip box={[WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h]}>
          <Clouds />
        </Clip>
        <Piece box={[WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h]}>
          <rect x={584} y={WINDOW.y} width={12} height={WINDOW.h} fill="#e6d8c0" />
          <rect x={WINDOW.x} y={304} width={WINDOW.w} height={12} fill="#e6d8c0" />
        </Piece>
        <Piece box={[330, 512, 520, 24]}>
          <rect x={330} y={516} width={520} height={16} rx={3} fill="#d9c8ac" />
        </Piece>
        <Piece box={[260, 60, 660, 12]}>
          <rect x={260} y={62} width={660} height={8} rx={3} fill="#6a4a32" />
        </Piece>
        <Curtain x={268} t={14} delay={0} />
        <Curtain x={812} t={16.5} delay={-6} />

        {/* Plants: a tall one on the floor, a small one on the desk */}
        <Plant box={[90, 500, 190, 380]} origin="50% 100%" t={9.5}>
          <g fill="#5d8a4e">
            <ellipse cx={150} cy={620} rx={20} ry={70} transform="rotate(-28 150 620)" />
            <ellipse cx={200} cy={600} rx={22} ry={86} transform="rotate(8 200 600)" />
            <ellipse cx={236} cy={640} rx={18} ry={62} transform="rotate(34 236 640)" />
          </g>
          <g fill="#6f9a5a">
            <ellipse cx={176} cy={650} rx={16} ry={60} transform="rotate(-10 176 650)" />
            <ellipse cx={220} cy={668} rx={15} ry={50} transform="rotate(22 220 668)" />
          </g>
          <path d="M140,760 L250,760 L238,866 Q195,876 152,866 Z" fill="#b5694a" />
          <rect x={134} y={752} width={122} height={14} rx={4} fill="#c7795a" />
        </Plant>
        <Plant box={[520, 500, 80, 100]} origin="50% 100%" t={7.7}>
          <g fill="#6f9a5a">
            <ellipse cx={548} cy={536} rx={9} ry={24} transform="rotate(-22 548 536)" />
            <ellipse cx={562} cy={528} rx={9} ry={28} transform="rotate(4 562 528)" />
            <ellipse cx={576} cy={540} rx={8} ry={22} transform="rotate(26 576 540)" />
          </g>
          <path d="M540,562 L584,562 L580,598 L544,598 Z" fill="#d7c2a2" />
        </Plant>
        <Cat />
        <StringLights />
      </Board>
    </>
  );
}
