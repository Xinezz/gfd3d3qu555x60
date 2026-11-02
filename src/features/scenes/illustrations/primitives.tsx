import { useMemo, type CSSProperties, type ReactNode } from 'react';

/**
 * Shapes the code-drawn environments are built from. Every one is generated from a seed, so the
 * same scenery (skylines, trees, ridges) appears on every visit.
 */

/** Deterministic PRNG so generated scenery is identical every visit. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const W = 1200;
export const H = 400;

export function Layer({ children, className, style, viewBox = `0 0 ${W} ${H}` }: { children: ReactNode; className?: string; style?: CSSProperties; viewBox?: string }) {
  return (
    <svg className={`scene__layer ${className ?? ''}`} style={style} viewBox={viewBox} preserveAspectRatio="xMidYMax slice" aria-hidden>
      {children}
    </svg>
  );
}

export function Stars({ seed, count = 90, maxY = 0.55 }: { seed: number; count?: number; maxY?: number }) {
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ x: r() * 100, y: r() * maxY * 100, s: 0.5 + r() * 1.4, d: r() * 6, tw: r() < 0.35 }));
  }, [seed, count, maxY]);
  return (
    <div className="scene__stars">
      {stars.map((s, i) => (
        <i key={i} className={s.tw ? 'scene__twinkle' : undefined} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
    </div>
  );
}

export function Skyline({ seed, fill, lit, density, minH, maxH, className, style }: { seed: number; fill: string; lit: string; density: number; minH: number; maxH: number; className?: string; style?: CSSProperties }) {
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
          {b.antenna && <circle className="scene__blink" cx={b.x + b.w / 2 + 1} cy={H - b.h - 23} r={2.2} fill="#ff6b5a" />}
        </g>
      ))}
      {wins.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={4} height={6} fill={lit} className={w.tw ? 'scene__flicker' : undefined} style={w.tw ? { animationDelay: `${w.d}s` } : undefined} />
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

export function Pines({ seed, fill, count, minH, maxH, className, style }: { seed: number; fill: string; count: number; minH: number; maxH: number; className?: string; style?: CSSProperties }) {
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

export function Ridge({ seed, fill, top, rough, className, style }: { seed: number; fill: string; top: number; rough: number; className?: string; style?: CSSProperties }) {
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

const BOOK_COLOURS = ['#5a3a2a', '#3f4a3a', '#6b4b2e', '#2f3b4a', '#71553a', '#4a2f2f', '#5d5236', '#3b3328', '#7a4a32', '#4f3a52'];

/**
 * A bookshelf for an SVG scene: a frame with `rows` shelves of books (seeded, so it's the same every
 * visit), the odd gap and leaning volume. Coordinates are in the scene's viewBox.
 */
export function Shelf({ x, y, w, h, rows, seed, frame = '#2a1a10', back = '#170e08' }: { x: number; y: number; w: number; h: number; rows: number; seed: number; frame?: string; back?: string }) {
  const books = useMemo(() => {
    const r = rng(seed);
    const rowH = (h - 24) / rows;
    const out: { x: number; y: number; w: number; h: number; c: string; tilt: number }[] = [];
    for (let row = 0; row < rows; row++) {
      const base = y + 12 + (row + 1) * rowH - 8;
      for (let bx = x + 14; bx < x + w - 22; ) {
        if (r() < 0.05) {
          bx += 20 + r() * 30;
          continue;
        }
        const bw = 7 + r() * 11;
        const bh = rowH * (0.55 + r() * 0.3);
        out.push({ x: bx, y: base - bh, w: bw, h: bh, c: BOOK_COLOURS[Math.floor(r() * BOOK_COLOURS.length)], tilt: r() < 0.04 ? -7 : 0 });
        bx += bw + 1.2;
      }
    }
    return { out, rowH };
  }, [x, y, w, h, rows, seed]);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={frame} />
      <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} fill={back} />
      {books.out.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} rx={1.5} transform={b.tilt ? `rotate(${b.tilt} ${b.x} ${b.y + b.h})` : undefined} />
      ))}
      {Array.from({ length: rows }, (_, row) => (
        <rect key={row} x={x + 6} y={y + 12 + (row + 1) * books.rowH - 8} width={w - 12} height={9} fill={frame} />
      ))}
    </g>
  );
}

/*
 * Moving parts of a drawn room. The room is one static SVG on the 1600 × 900 artboard; anything that
 * moves is drawn in its own small layer on top, so the browser only redraws (or just moves) that
 * small layer instead of repainting the whole room every frame.
 */
type Box = [x: number, y: number, w: number, h: number];
const boxStyle = ([x, y, w, h]: Box) => ({ left: `${x / 16}%`, top: `${y / 9}%`, width: `${w / 16}%`, height: `${h / 9}%` });

/** An SVG layer over part of the artboard, drawn in the artboard's own coordinates. */
export function Piece({ box, className, origin, style, children }: { box: Box; className?: string; origin?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg className={`board__piece ${className ?? ''}`} viewBox={box.join(' ')} style={{ ...boxStyle(box), transformOrigin: origin, ...style }} aria-hidden>
      {children}
    </svg>
  );
}

/** A window onto part of the artboard: whatever's inside is cut off at its edges (e.g. clouds passing). */
export function Clip({ box, children }: { box: Box; children: ReactNode }) {
  return (
    <div className="board__clip" style={boxStyle(box)}>
      {children}
    </div>
  );
}

/** A unique id for SVG gradients, safe inside url(#…) and distinct per copy (room and thumbnails). */
export const svgId = (reactId: string, name: string) => `${name}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

export function Moon({ x, y, size, color = '#f3ead8' }: { x: string; y: string; size: number; color?: string }) {
  return <div className="scene__moon" style={{ left: x, top: y, width: size, height: size, ['--moon' as string]: color }} />;
}

/** A window frame filling its container: the whole room, or an inset window in a scene. */
export function WindowFrame({ frost }: { frost?: boolean }) {
  return (
    <div className={`scene__window ${frost ? 'scene__window--frost' : ''}`}>
      <i className="scene__mullion scene__mullion--v" />
      <i className="scene__mullion scene__mullion--h" />
    </div>
  );
}
