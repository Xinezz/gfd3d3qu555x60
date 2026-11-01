/**
 * Tiny hand-drawn pixel sprites: the app's one playful touch (brand mark, streak flame, achievement
 * emblems). Each sprite is a grid of characters; '.' is empty and every other character maps to a
 * colour in its palette. Rendered as SVG rects with crisp edges so they stay sharp at any size.
 */

interface Sprite {
  rows: string[];
  palette: Record<string, string>;
}

export const SPRITES = {
  lock: {
    rows: [
      '...####...',
      '..#....#..',
      '..#....#..',
      '..#....#..',
      '.########.',
      '.#hhhhhh#.',
      '.#bbkkbb#.',
      '.#bbkkbb#.',
      '.#bbbkbb#.',
      '.#bbbkbb#.',
      '.#bbbbbb#.',
      '.########.',
    ],
    palette: { '#': '#9a6a30', h: '#f6dc9e', b: '#e2ac5c', k: '#2e1c0e' },
  },
  flame: {
    rows: [
      '....r....',
      '....rr...',
      '...rrr...',
      '...ror.r.',
      '..rrorrr.',
      '..roooor.',
      '.rrooooor',
      '.roooyoor',
      '.rooyyyor',
      '.rooyyyor',
      '..royyor.',
      '...rrrr..',
    ],
    palette: { r: '#b8502a', o: '#e8913a', y: '#fbd68a' },
  },
  hourglass: {
    rows: [
      'wwwwwwwww',
      '.g.....g.',
      '.gsssssg.',
      '..gsssg..',
      '...gsg...',
      '....g....',
      '...g.g...',
      '..g.s.g..',
      '.g.sss.g.',
      '.gsssssg.',
      'wwwwwwwww',
    ],
    palette: { w: '#8a5d3a', g: '#b9c3c8', s: '#ecc77e' },
  },
  star: {
    rows: [
      '....s....',
      '...sys...',
      '...sys...',
      'sssyyysss',
      '.syyyyys.',
      '..syyys..',
      '..sysys..',
      '.sys.sys.',
      '.s.....s.',
    ],
    palette: { s: '#c48a2e', y: '#f6d888' },
  },
  target: {
    rows: [
      '..rrrrr..',
      '.r.....r.',
      'r..www..r',
      'r.w...w.r',
      'r.w.y.w.r',
      'r.w...w.r',
      'r..www..r',
      '.r.....r.',
      '..rrrrr..',
    ],
    palette: { r: '#d0735a', w: '#ece0cf', y: '#ecc77e' },
  },
  quill: {
    rows: [
      '.........f',
      '........ff',
      '.......fwf',
      '......fwwf',
      '.....fwwf.',
      '....fwwf..',
      '...fwwf...',
      '...fwf....',
      '..nff.....',
      '.n........',
    ],
    palette: { f: '#9a8fc8', w: '#e8e2f8', n: '#d6a15a' },
  },
  crown: {
    rows: [
      'y....y....y',
      'yy..yyy..yy',
      'yry.yyy.yry',
      'yyyyyyyyyyy',
      'yyygyyygyyy',
      'yyyyyyyyyyy',
      'ddddddddddd',
    ],
    palette: { y: '#f3cb62', r: '#d8586a', g: '#6fc2a5', d: '#a8661a' },
  },
  sun: {
    rows: [
      '....y....',
      '.y.....y.',
      '...ooo...',
      '..oyyyo..',
      'y.oyyyo.y',
      '..oyyyo..',
      '...ooo...',
      '.y.....y.',
      '....y....',
    ],
    palette: { y: '#f6d888', o: '#e3a24a' },
  },
  moon: {
    rows: [
      '..mmmm..',
      '.mmmh...',
      'mmmh....',
      'mmm.....',
      'mmm.....',
      'mmmh....',
      '.mmmh..m',
      '..mmmmm.',
    ],
    palette: { m: '#d9d1f2', h: '#a99fd1' },
  },
} satisfies Record<string, Sprite>;

export type SpriteName = keyof typeof SPRITES;

/** Pixel rects for a sprite, merging horizontal runs of the same colour. */
function rects(name: SpriteName, mono?: string) {
  const { rows, palette } = SPRITES[name] as Sprite;
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      out.push({ x, y, w, fill: mono ?? palette[ch] });
      x += w;
    }
  });
  return out;
}

export const spriteSize = (name: SpriteName) => ({ w: SPRITES[name].rows[0].length, h: SPRITES[name].rows.length });

/** A standalone sprite. `scale` is pixels per sprite pixel. */
export function Pixel({ name, scale = 3, mono, className, title }: { name: SpriteName; scale?: number; mono?: string; className?: string; title?: string }) {
  const { w, h } = spriteSize(name);
  return (
    <svg className={`pixel ${className ?? ''}`} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects(name, mono).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** A sprite placed inside another SVG, centred on (cx, cy) and `size` units wide at most. */
export function PixelGroup({ name, cx, cy, size, mono }: { name: SpriteName; cx: number; cy: number; size: number; mono?: string }) {
  const { w, h } = spriteSize(name);
  const s = size / Math.max(w, h);
  return (
    <g transform={`translate(${cx - (w * s) / 2} ${cy - (h * s) / 2}) scale(${s})`} shapeRendering="crispEdges">
      {rects(name, mono).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </g>
  );
}
