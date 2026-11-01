import type { ReactNode } from 'react';
import { Particles } from '../scenes/Particles';
import './decor.css';

/** Hand-drawn SVG decorations. Each is small, slow and low-contrast so it never pulls focus. */

const Mug = () => (
  <svg viewBox="0 0 70 80" className="decor decor--mug" aria-hidden>
    <g className="decor__steam" fill="none" stroke="rgb(240 230 215 / 0.35)" strokeWidth="2.5" strokeLinecap="round">
      <path d="M24,30 C18,22 30,18 24,8" style={{ animationDelay: '0s' }} />
      <path d="M34,30 C28,20 40,16 34,4" style={{ animationDelay: '1.2s' }} />
      <path d="M44,30 C38,22 50,18 44,8" style={{ animationDelay: '2.4s' }} />
    </g>
    <path d="M58,44 C70,44 70,62 56,62" fill="none" stroke="#b9805a" strokeWidth="5" />
    <path d="M14,36 L58,36 L54,74 Q53,78 49,78 L23,78 Q19,78 18,74 Z" fill="#c98f6a" />
    <path d="M14,36 L58,36 L57,42 L15,42 Z" fill="#a8704f" />
    <ellipse cx="36" cy="37" rx="21" ry="3" fill="#3a2418" />
  </svg>
);

const Cactus = () => (
  <svg viewBox="0 0 70 100" className="decor decor--cactus" aria-hidden>
    <path d="M30,74 L30,30 Q35,18 40,30 L40,74 Z" fill="#6f9a63" />
    <path d="M30,52 L22,52 Q16,52 16,44 L16,36 Q19,31 22,36 L22,46 L30,46 Z" fill="#7aa86d" />
    <path d="M40,58 L47,58 Q53,58 53,50 L53,44 Q50,39 47,44 L47,52 L40,52 Z" fill="#7aa86d" />
    <circle cx="35" cy="24" r="4" fill="#e9a3b3" />
    <path d="M20,72 L50,72 L46,96 L24,96 Z" fill="#b5694a" />
    <rect x="17" y="70" width="36" height="7" rx="2" fill="#c7795a" />
  </svg>
);

const Books = () => (
  <svg viewBox="0 0 110 70" className="decor decor--books" aria-hidden>
    <rect x="8" y="52" width="94" height="16" rx="2" fill="#5a3a2a" />
    <rect x="14" y="38" width="82" height="14" rx="2" fill="#3f4a3a" />
    <rect x="4" y="24" width="88" height="14" rx="2" fill="#71553a" transform="rotate(-2 48 31)" />
    <rect x="18" y="11" width="70" height="13" rx="2" fill="#2f3b4a" />
    <g stroke="rgb(240 220 180 / 0.35)" strokeWidth="1.5">
      <line x1="16" y1="58" x2="40" y2="58" />
      <line x1="22" y1="44" x2="44" y2="44" />
      <line x1="26" y1="17" x2="46" y2="17" />
    </g>
  </svg>
);

const Lamp = () => (
  <div className="decor decor--lamp" aria-hidden>
    <span className="decor__lamp-glow" />
    <svg viewBox="0 0 90 140">
      <ellipse cx="30" cy="134" rx="24" ry="5" fill="#2a1d14" />
      <rect x="27" y="70" width="5" height="64" fill="#3a2a1f" />
      <path d="M30,72 L62,40" stroke="#3a2a1f" strokeWidth="5" strokeLinecap="round" />
      <path d="M46,22 L84,36 L72,62 L36,44 Z" fill="#c9a26b" />
      <path d="M48,46 L72,58" stroke="#ffe0a8" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  </div>
);

const Vinyl = () => (
  <svg viewBox="0 0 120 80" className="decor decor--vinyl" aria-hidden>
    <rect x="4" y="44" width="112" height="32" rx="5" fill="#4a3324" />
    <rect x="4" y="44" width="112" height="6" rx="3" fill="#5c4130" />
    {/* Drawn from above, squashed into perspective; the label's mark shows it turning. */}
    <g transform="translate(54 46) scale(1 0.25)">
      <circle r="40" fill="#141010" />
      <circle r="30" fill="none" stroke="#2c2622" strokeWidth="2" />
      <circle r="20" fill="none" stroke="#2c2622" strokeWidth="2" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.8s" repeatCount="indefinite" />
        <circle r="9" fill="#c98f6a" />
        <circle cx="5" r="2.2" fill="#7a4a2e" />
        <path d="M-36,-6 A37,37 0 0 1 -20,-30" stroke="rgb(255 255 255 / 0.16)" strokeWidth="4" fill="none" />
      </g>
    </g>
    <path d="M104,40 L104,30 L80,44" fill="none" stroke="#b9b2a6" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const Cat = () => (
  <svg viewBox="0 0 130 80" className="decor decor--cat" aria-hidden>
    <g className="decor__cat-body">
      <path d="M20,72 Q14,40 54,34 Q96,30 104,58 Q108,74 90,76 L30,76 Q20,76 20,72 Z" fill="#3b2d26" />
      <path d="M96,70 Q122,70 118,52 Q116,44 110,48" fill="none" stroke="#3b2d26" strokeWidth="9" strokeLinecap="round" className="decor__cat-tail" />
    </g>
    <g>
      <ellipse cx="36" cy="58" rx="20" ry="16" fill="#46362d" />
      <path d="M20,48 L22,32 L32,44 Z" fill="#46362d" />
      <path d="M40,43 L50,30 L52,47 Z" fill="#46362d" />
      <path d="M26,60 Q30,63 34,60 M40,60 Q44,63 48,60" stroke="#1d1512" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
    <text x="60" y="26" className="decor__zzz">z</text>
  </svg>
);

const FairyLights = () => (
  <div className="decor-lights" aria-hidden>
    <svg viewBox="0 0 1200 80" preserveAspectRatio="none">
      <path d="M0,10 Q150,60 300,22 T600,24 T900,20 T1200,14" stroke="#3a2c20" strokeWidth="1.5" fill="none" />
    </svg>
    {Array.from({ length: 18 }, (_, i) => {
      const x = (i + 0.5) / 18;
      const y = 10 + Math.abs(Math.sin(x * Math.PI * 4)) * 24;
      return <i key={i} style={{ left: `${x * 100}%`, top: y, animationDelay: `${(i * 0.53) % 4}s` }} />;
    })}
  </div>
);

const ShootingStars = () => (
  <div className="decor-stars" aria-hidden>
    <i style={{ top: '8%', left: '62%', animationDelay: '3s' }} />
    <i style={{ top: '14%', left: '28%', animationDelay: '11s' }} />
    <i style={{ top: '5%', left: '82%', animationDelay: '19s' }} />
  </div>
);

/** Renders the decorations you've earned and left switched on. */
export function DecorLayer({ active, dark, makeRoomForPlayer }: { active: Set<string>; dark?: boolean; makeRoomForPlayer?: boolean }) {
  if (!active.size) return null;
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  if (active.has('decor-lamp')) left.push(<Lamp key="lamp" />);
  if (active.has('decor-books')) left.push(<Books key="books" />);
  if (active.has('decor-mug')) left.push(<Mug key="mug" />);
  if (active.has('decor-vinyl')) right.push(<Vinyl key="vinyl" />);
  if (active.has('decor-cactus')) right.push(<Cactus key="cactus" />);
  if (active.has('decor-cat')) right.push(<Cat key="cat" />);
  return (
    <div className={`decor-layer ${dark ? 'is-dark' : ''} ${makeRoomForPlayer ? 'has-player' : ''}`} aria-hidden>
      {active.has('decor-golden') && <div className="decor-golden" />}
      {active.has('decor-stars') && <ShootingStars />}
      {active.has('decor-fireflies') && <Particles kind="fireflies" density={0.35} className="decor-fireflies" />}
      {active.has('decor-lights') && <FairyLights />}
      {left.length > 0 && <div className="decor-shelf decor-shelf--left">{left}</div>}
      {right.length > 0 && <div className="decor-shelf decor-shelf--right">{right}</div>}
    </div>
  );
}

/** Small static previews for panels and the rewards gallery. */
export const DECOR_PREVIEW: Record<string, () => ReactNode> = {
  'decor-mug': Mug,
  'decor-cactus': Cactus,
  'decor-books': Books,
  'decor-lamp': Lamp,
  'decor-vinyl': Vinyl,
  'decor-cat': Cat,
};
