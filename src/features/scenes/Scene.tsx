import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import { Particles } from './Particles';
import './scenes.css';

/** Deterministic PRNG so generated scenery (skylines, trees, books) is identical every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1200;
const H = 400;

function Layer({ children, className, style, viewBox = `0 0 ${W} ${H}` }: { children: ReactNode; className?: string; style?: CSSProperties; viewBox?: string }) {
  return (
    <svg className={`scene__layer ${className ?? ''}`} style={style} viewBox={viewBox} preserveAspectRatio="xMidYMax slice" aria-hidden>
      {children}
    </svg>
  );
}

function Stars({ seed, count = 90, maxY = 0.55 }: { seed: number; count?: number; maxY?: number }) {
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ x: r() * 100, y: r() * maxY * 100, s: 0.5 + r() * 1.4, d: r() * 6, tw: r() < 0.35 }));
  }, [seed, count, maxY]);
  return (
    <div className="scene__stars">
      {stars.map((s, i) => (
        <i key={i} className={s.tw ? 'twinkle' : undefined} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
    </div>
  );
}

function Skyline({ seed, fill, lit, density, minH, maxH, className, style }: { seed: number; fill: string; lit: string; density: number; minH: number; maxH: number; className?: string; style?: CSSProperties }) {
  const { bs, wins } = useMemo(() => {
    const r = rng(seed);
    const bs: { x: number; w: number; h: number; antenna: boolean }[] = [];
    for (let x = -20; x < W + 20; ) {
      const w = 34 + r() * 70;
      bs.push({ x, w, h: minH + r() * (maxH - minH), antenna: r() < 0.12 });
      x += w + r() * 5;
    }
    const wins: { x: number; y: number; tw: boolean; d: number }[] = [];
    for (const b of bs)
      for (let y = H - b.h + 10; y < H - 8; y += 13)
        for (let x = b.x + 6; x < b.x + b.w - 8; x += 10) if (r() < density) wins.push({ x, y, tw: r() < 0.06, d: r() * 20 });
    return { bs, wins };
  }, [seed, density, minH, maxH]);
  return (
    <Layer className={className} style={style}>
      {bs.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={H - b.h} width={b.w} height={b.h} fill={fill} />
          {b.antenna && <rect x={b.x + b.w / 2} y={H - b.h - 22} width={2} height={22} fill={fill} />}
          {b.antenna && <circle className="blink" cx={b.x + b.w / 2 + 1} cy={H - b.h - 23} r={2.2} fill="#ff6b5a" />}
        </g>
      ))}
      {wins.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={4} height={6} fill={lit} className={w.tw ? 'flicker' : undefined} style={w.tw ? { animationDelay: `${w.d}s` } : undefined} />
      ))}
    </Layer>
  );
}

function treePath(x: number, base: number, h: number, w: number) {
  const tiers = 4;
  const right: string[] = [];
  const tierH = h / tiers;
  for (let i = 0; i < tiers; i++) {
    const yb = base - h + (i + 1) * tierH * 0.92;
    const hw = (w / 2) * ((i + 1) / tiers);
    right.push(`${x + hw},${yb}`);
    if (i < tiers - 1) right.push(`${x + hw * 0.42},${yb - tierH * 0.12}`);
  }
  const left = right.map((p) => {
    const [px, py] = p.split(',').map(Number);
    return `${2 * x - px},${py}`;
  });
  return `M${x},${base - h} L${right.join(' L')} L${x + w * 0.04},${base} L${x - w * 0.04},${base} L${left.reverse().join(' L')} Z`;
}

function Pines({ seed, fill, count, minH, maxH, className, style }: { seed: number; fill: string; count: number; minH: number; maxH: number; className?: string; style?: CSSProperties }) {
  const d = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, (_, i) => {
      const x = (i / count) * (W + 80) - 40 + r() * 30;
      const h = minH + r() * (maxH - minH);
      return treePath(x, H + 4, h, h * (0.32 + r() * 0.12));
    }).join(' ');
  }, [seed, count, minH, maxH]);
  return (
    <Layer className={className} style={style}>
      <path d={d} fill={fill} />
      <rect x={0} y={H - 6} width={W} height={10} fill={fill} />
    </Layer>
  );
}

function Ridge({ seed, fill, top, rough, className, style }: { seed: number; fill: string; top: number; rough: number; className?: string; style?: CSSProperties }) {
  const d = useMemo(() => {
    const r = rng(seed);
    let y = top + r() * rough;
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 40) {
      y = Math.min(H - 20, Math.max(top - rough, y + (r() - 0.5) * rough * 0.6));
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  }, [seed, top, rough]);
  return (
    <Layer className={className} style={style}>
      <path d={d} fill={fill} />
    </Layer>
  );
}

function Waves({ color, amp, period, y, duration, opacity = 1, reverse }: { color: string; amp: number; period: number; y: number; duration: number; opacity?: number; reverse?: boolean }) {
  const d = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= W * 2; x += 10) pts.push(`${x},${(20 + amp * Math.sin((2 * Math.PI * x) / period)).toFixed(1)}`);
    return `M0,100 L${pts.join(' L')} L${W * 2},100 Z`;
  }, [amp, period]);
  return (
    <div className="scene__waves" style={{ bottom: `${y}%`, opacity }}>
      <svg viewBox={`0 0 ${W * 2} 100`} preserveAspectRatio="none" style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }} aria-hidden>
        <path d={d} fill={color} />
      </svg>
    </div>
  );
}

function Moon({ x, y, size, color = '#f3ead8' }: { x: string; y: string; size: number; color?: string }) {
  return <div className="scene__moon" style={{ left: x, top: y, width: size, height: size, ['--moon' as string]: color }} />;
}

function WindowFrame({ frost }: { frost?: boolean }) {
  return (
    <div className={`scene__window ${frost ? 'scene__window--frost' : ''}`}>
      <i className="scene__mullion scene__mullion--v" />
      <i className="scene__mullion scene__mullion--h" />
    </div>
  );
}

function Flames() {
  // Each flame is a teardrop flickering on its own rhythm.
  const flames = [
    { x: 0, s: 1.15, c: '#ff9a3c', d: 0 },
    { x: -38, s: 0.8, c: '#ff7a2a', d: 0.3 },
    { x: 40, s: 0.85, c: '#ff8a30', d: 0.6 },
    { x: -14, s: 0.65, c: '#ffd27a', d: 0.15 },
    { x: 16, s: 0.6, c: '#ffe3a0', d: 0.45 },
  ];
  return (
    <g className="flames">
      {flames.map((f, i) => (
        <g key={i} transform={`translate(${600 + f.x} 330) scale(${f.s})`}>
          <path className="flame" style={{ animationDelay: `${f.d}s` }} d="M0,0 C-34,-30 -24,-80 0,-140 C24,-80 34,-30 0,0Z" fill={f.c} />
        </g>
      ))}
    </g>
  );
}

function Books({ seed }: { seed: number }) {
  const books = useMemo(() => {
    const r = rng(seed);
    const palette = ['#5a3a2a', '#3f4a3a', '#6b4b2e', '#2f3b4a', '#71553a', '#4a2f2f', '#5d5236', '#3b3328'];
    const out: { x: number; y: number; w: number; h: number; c: string; tilt: number }[] = [];
    for (let row = 0; row < 6; row++) {
      const base = 120 + row * 135;
      for (let x = 10; x < W - 10; ) {
        if (r() < 0.04) {
          x += 30 + r() * 50;
          continue;
        }
        const w = 9 + r() * 15;
        const h = 75 + r() * 35;
        out.push({ x, y: base - h, w, h, c: palette[Math.floor(r() * palette.length)], tilt: r() < 0.04 ? -8 : 0 });
        x += w + 1.5;
      }
    }
    return out;
  }, [seed]);
  return (
    <Layer viewBox={`0 0 ${W} 820`} className="scene__books">
      {books.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} rx={1.5} transform={b.tilt ? `rotate(${b.tilt} ${b.x} ${b.y + b.h})` : undefined} />
      ))}
      {Array.from({ length: 6 }, (_, row) => (
        <rect key={row} x={0} y={120 + row * 135} width={W} height={12} fill="#2a1d14" />
      ))}
    </Layer>
  );
}

function Bokeh({ seed, count, colors }: { seed: number; count: number; colors: string[] }) {
  const dots = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ x: r() * 100, y: 20 + r() * 60, s: 14 + r() * 50, c: colors[Math.floor(r() * colors.length)], d: r() * 8 }));
  }, [seed, count, colors]);
  return (
    <div className="scene__bokeh">
      {dots.map((b, i) => (
        <i key={i} style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, background: b.c, animationDelay: `${b.d}s` }} />
      ))}
    </div>
  );
}

const CAFE_COLORS = ['#ffb35c', '#ffd28a', '#ff8f6b', '#f5c26b', '#9ec1ff'];

const SCENES: Record<string, () => ReactNode> = {
  'rainy-window': () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0b1220, #18233a 55%, #2a2f3f)' }} />
      <Skyline seed={3} fill="#0d1422" lit="#e8b36a" density={0.12} minH={60} maxH={210} className="scene__blur" />
      <Particles kind="rain" />
      <div className="scene__fog" />
      <Particles kind="glass" />
      <WindowFrame />
    </>
  ),
  fireplace: () => (
    <>
      <div className="scene__sky" style={{ background: 'radial-gradient(ellipse at 50% 85%, #3a1d0e, #1a0f09 55%, #0e0907)' }} />
      <div className="scene__firelight" />
      <Layer viewBox={`0 0 ${W} 420`} className="scene__hearth">
        <path d="M330,420 L330,170 Q330,120 380,120 L820,120 Q870,120 870,170 L870,420 Z" fill="#2b1a12" />
        <path d="M410,420 L410,230 Q410,190 450,190 L750,190 Q790,190 790,230 L790,420 Z" fill="#0b0605" />
        <rect x={300} y={100} width={600} height={26} rx={4} fill="#3a2418" />
        <Flames />
        <rect x={500} y={322} width={200} height={20} rx={10} fill="#3b2216" transform="rotate(-6 600 332)" />
        <rect x={505} y={330} width={190} height={18} rx={9} fill="#2e1a10" transform="rotate(7 600 339)" />
        <ellipse cx={600} cy={352} rx={150} ry={10} fill="#ff7a2a" opacity={0.25} />
      </Layer>
      <Particles kind="embers" />
    </>
  ),
  bedroom: () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(160deg, #2a1f18, #1a1410 60%, #120e0b)' }} />
      <div className="scene__inset-window">
        <div className="scene__sky" style={{ background: 'linear-gradient(#0e1626, #1c2a42)' }} />
        <Stars seed={11} count={30} />
        <Particles kind="rain" density={0.35} />
        <WindowFrame />
      </div>
      <div className="scene__lamp" />
      <svg className="scene__garland" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
        <path d="M0,20 Q300,110 600,40 T1200,30" stroke="#3a2c20" strokeWidth={2} fill="none" />
      </svg>
      <div className="scene__bulbs">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ left: `${3 + i * 7}%`, top: `${4 + Math.sin(i * 0.9) * 3 + (i < 7 ? i * 0.9 : (14 - i) * 0.4)}%`, animationDelay: `${i * 0.37}s` }} />
        ))}
      </div>
      <Particles kind="dust" />
    </>
  ),
  'night-city': () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0a0a1c, #1b1638 50%, #3d2546 78%, #5a3340)' }} />
      <Stars seed={7} count={70} maxY={0.4} />
      <div className="scene__haze" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,150,110,.28), transparent 60%)' }} />
      <Skyline seed={21} fill="#1d1a33" lit="#6f6596" density={0.08} minH={120} maxH={300} style={{ height: '62%' }} />
      <Skyline seed={22} fill="#141226" lit="#d7b37a" density={0.1} minH={80} maxH={240} style={{ height: '50%' }} />
      <Skyline seed={23} fill="#0a0914" lit="#f0c27c" density={0.13} minH={40} maxH={160} style={{ height: '34%' }} />
    </>
  ),
  forest: () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0b1a1c, #17302c 55%, #2c4436)' }} />
      <Moon x="72%" y="16%" size={70} color="#e8eccf" />
      <Pines seed={31} fill="#1d3a33" count={34} minH={160} maxH={260} style={{ height: '72%' }} />
      <div className="scene__mist" />
      <Pines seed={32} fill="#122822" count={22} minH={200} maxH={330} style={{ height: '80%' }} />
      <Pines seed={33} fill="#08130f" count={11} minH={300} maxH={400} style={{ height: '95%' }} />
      <Particles kind="fireflies" />
    </>
  ),
  ocean: () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#060d1c, #10213b 50%, #1d3550 58%, #0b1a2c 58.2%, #07111d)' }} />
      <Stars seed={41} count={110} maxY={0.5} />
      <Moon x="62%" y="14%" size={90} />
      <div className="scene__reflection" />
      <Waves color="#0f2238" amp={6} period={300} y={22} duration={38} opacity={0.9} />
      <Waves color="#0b1b2e" amp={9} period={400} y={11} duration={30} reverse />
      <Waves color="#08131f" amp={12} period={600} y={0} duration={24} />
    </>
  ),
  library: () => (
    <>
      <div className="scene__sky" style={{ background: '#1c130d' }} />
      <Books seed={51} />
      <div className="scene__lamp scene__lamp--library" />
      <Particles kind="dust" density={1.2} />
    </>
  ),
  cafe: () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#231711, #1a110c 70%, #120c08)' }} />
      <div className="scene__cafe-window">
        <div className="scene__sky" style={{ background: 'linear-gradient(#141626, #2a2433)' }} />
        <Bokeh seed={61} count={18} colors={CAFE_COLORS} />
      </div>
      <div className="scene__pendants">
        {[22, 50, 78].map((x, i) => (
          <div key={x} className="scene__pendant" style={{ left: `${x}%`, height: `${18 + (i % 2) * 8}%` }} />
        ))}
      </div>
      <div className="scene__counter" />
      <Particles kind="dust" density={0.6} />
    </>
  ),
  'snowy-window': () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#0d1626, #1f2f47 60%, #3c4f68)' }} />
      <Stars seed={71} count={50} maxY={0.35} />
      <Ridge seed={72} fill="#5d7088" top={210} rough={60} style={{ height: '55%' }} />
      <Pines seed={73} fill="#1b2738" count={26} minH={90} maxH={170} style={{ height: '42%' }} />
      <Ridge seed={74} fill="#c9d5e3" top={330} rough={30} style={{ height: '26%' }} />
      <Particles kind="snow" />
      <div className="scene__warm-sill" />
      <WindowFrame frost />
    </>
  ),
  'japanese-garden': () => (
    <>
      <div className="scene__sky" style={{ background: 'linear-gradient(#1b1630, #4a3050 45%, #b0706a 70%, #2a2238 70.2%, #1a1528)' }} />
      <Moon x="20%" y="12%" size={110} color="#f6e2cf" />
      <Ridge seed={81} fill="#5d3f5c" top={170} rough={90} style={{ height: '48%', bottom: '30%' }} />
      <Ridge seed={82} fill="#3a2a45" top={250} rough={60} style={{ height: '40%', bottom: '30%' }} />
      <Layer className="scene__torii" style={{ bottom: '30%', height: '36%' }}>
        <g fill="#24182a">
          <rect x={840} y={150} width={14} height={250} />
          <rect x={986} y={150} width={14} height={250} />
          <rect x={815} y={182} width={210} height={12} />
          <path d="M790,128 Q920,150 1050,128 L1046,146 Q920,166 794,146 Z" />
        </g>
      </Layer>
      <div className="scene__pond" />
      <svg className="scene__stone-lantern" viewBox="0 0 60 130" aria-hidden>
        <g fill="#221a28">
          <path d="M4,22 L30,4 L56,22 L50,26 L10,26 Z" />
          <rect x={14} y={26} width={32} height={30} />
          <rect x={8} y={56} width={44} height={8} rx={2} />
          <rect x={22} y={64} width={16} height={50} />
          <rect x={12} y={114} width={36} height={12} rx={2} />
        </g>
        <rect className="lantern__light" x={22} y={32} width={16} height={18} rx={2} fill="#ffcf8a" />
      </svg>
      <svg className="scene__branch" viewBox="0 0 400 260" aria-hidden>
        <path d="M400,10 C320,40 260,30 200,80 C160,110 120,120 60,150" stroke="#1d1220" strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M260,52 C240,90 230,120 200,150" stroke="#1d1220" strokeWidth={5} fill="none" strokeLinecap="round" />
        {[[70, 150], [110, 132], [150, 118], [205, 150], [225, 100], [270, 60], [320, 42], [190, 86], [130, 160], [360, 26]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={16 + (i % 3) * 6} fill={i % 2 ? '#b8505a' : '#a33f4c'} opacity={0.85} />
        ))}
      </svg>
      <Particles kind="petals" />
    </>
  ),
};

/** Full-bleed animated environment. Purely visual; sound is handled by the audio module. */
export const Scene = memo(function Scene({ id, dim = 0.35 }: { id: string; dim?: number }) {
  const render = SCENES[id] ?? SCENES['rainy-window'];
  return (
    <div className={`scene scene--${id}`} aria-hidden>
      {render()}
      <div className="scene__shade" style={{ ['--dim' as string]: dim }} />
    </div>
  );
});
