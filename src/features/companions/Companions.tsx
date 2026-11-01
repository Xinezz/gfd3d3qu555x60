import { useMemo } from 'react';
import type { CompanionId } from '../../domain/types';
import { formatHours } from '../../domain/time';
import { milestoneProgress } from '../../domain/milestones';
import './companions.css';

export interface CompanionProps {
  /** 0..1 through the current phase. */
  progress: number;
  clock: string;
  label: string;
  running: boolean;
  /** Lifetime focus, for the plant's growth. */
  totalFocusMs: number;
  size?: 'normal' | 'large';
}

export const COMPANIONS: { id: CompanionId; name: string; blurb: string; reward?: string }[] = [
  { id: 'timer', name: 'Timer', blurb: 'A calm countdown ring' },
  { id: 'candle', name: 'Candle', blurb: 'Burns down as you focus' },
  { id: 'plant', name: 'Plant', blurb: 'Grows with every hour you study' },
  { id: 'hourglass', name: 'Hourglass', blurb: 'Sand runs down with your session' },
  { id: 'moon', name: 'Moon', blurb: 'Waxes from new to full', reward: 'companion-moon' },
  { id: 'cat', name: 'Cat', blurb: 'Naps while you focus', reward: 'companion-cat' },
];

function Clock({ clock, label }: { clock: string; label: string }) {
  return (
    <div className="companion__clock">
      <span className="companion__time">{clock}</span>
      <span className="companion__label">{label}</span>
    </div>
  );
}

export function TimerRing({ progress, clock, label, running, size }: CompanionProps) {
  const r = 132;
  const c = 2 * Math.PI * r;
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  return (
    <div className={`companion companion--ring ${size === 'large' ? 'is-large' : ''} ${running ? 'is-running' : ''}`}>
      <svg viewBox="0 0 300 300" aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx="150" cy="150" r={r + 14} className="ring__halo" />
        <circle cx="150" cy="150" r={r} className="ring__track" />
        <circle
          cx="150"
          cy="150"
          r={r}
          className="ring__progress"
          stroke="url(#ring-grad)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform="rotate(-90 150 150)"
        />
        {progress > 0.002 && <circle cx={150 + r * Math.cos(angle)} cy={150 + r * Math.sin(angle)} r="5" className="ring__tip" />}
      </svg>
      <Clock clock={clock} label={label} />
    </div>
  );
}

export function Candle({ progress, clock, label, running, size }: CompanionProps) {
  // Wax burns from full height down to a stub over the session.
  const top = 90 + progress * 150;
  return (
    <div className={`companion companion--candle ${size === 'large' ? 'is-large' : ''} ${running ? 'is-running' : ''}`}>
      <svg viewBox="0 0 200 340" aria-hidden>
        <defs>
          <radialGradient id="candle-glow">
            <stop offset="0" stopColor="rgb(255 190 110 / .55)" />
            <stop offset="1" stopColor="rgb(255 190 110 / 0)" />
          </radialGradient>
          <linearGradient id="wax" x1="0" x2="1">
            <stop offset="0" stopColor="#d9c9ae" />
            <stop offset=".45" stopColor="#f3e8d4" />
            <stop offset="1" stopColor="#c7b496" />
          </linearGradient>
        </defs>
        <circle className="candle__glow" cx="100" cy={top - 30} r="95" fill="url(#candle-glow)" />
        <ellipse cx="100" cy="312" rx="70" ry="12" fill="#2a2019" />
        <ellipse cx="100" cy="306" rx="60" ry="9" fill="#3b2d22" />
        <rect x="68" y={top} width="64" height={306 - top} rx="6" fill="url(#wax)" />
        <ellipse cx="100" cy={top} rx="32" ry="6" fill="#efe2cb" />
        <ellipse cx="100" cy={top} rx="18" ry="3" fill="#e6d3b2" />
        <path d={`M70,${top + 4} q-2,18 3,26 q3,4 3,-8 z`} fill="#eadcc2" />
        <line x1="100" y1={top} x2="100" y2={top - 12} stroke="#2a2019" strokeWidth="2" strokeLinecap="round" />
        <g className="candle__flame" style={{ transformOrigin: `100px ${top - 10}px` }}>
          <path d={`M100,${top - 8} C86,${top - 22} 92,${top - 46} 100,${top - 62} C108,${top - 46} 114,${top - 22} 100,${top - 8}Z`} fill="#ffb347" opacity=".9" />
          <path d={`M100,${top - 10} C93,${top - 20} 96,${top - 34} 100,${top - 44} C104,${top - 34} 107,${top - 20} 100,${top - 10}Z`} fill="#fff1c9" />
        </g>
      </svg>
      <Clock clock={clock} label={label} />
    </div>
  );
}

export function Plant({ progress, clock, label, running, totalFocusMs, size }: CompanionProps) {
  const { reachedCount, next } = milestoneProgress(totalFocusMs);
  const growth = reachedCount; // 0..11, one step per hour milestone
  const geo = useMemo(() => {
    const stemH = 70 + growth * 17;
    const baseY = 262;
    const leaves = Array.from({ length: 2 + growth * 2 }, (_, i) => {
      const t = (i + 1) / (2 + growth * 2 + 1);
      return { y: baseY - stemH * t, side: i % 2 ? 1 : -1, s: 0.75 + (1 - t) * 0.6 };
    });
    const flowers = Math.max(0, growth - 5);
    return { stemH, baseY, leaves, flowers };
  }, [growth]);
  const topY = geo.baseY - geo.stemH;
  // The newest leaf unfurls as the current session progresses.
  const sessionLeaf = Math.max(0.05, progress);
  return (
    <div className={`companion companion--plant ${size === 'large' ? 'is-large' : ''} ${running ? 'is-running' : ''}`}>
      <svg viewBox="0 0 240 340" aria-hidden>
        <g className="plant__sway">
          <path d={`M120,${geo.baseY} C112,${geo.baseY - geo.stemH * 0.4} 128,${geo.baseY - geo.stemH * 0.7} 120,${topY}`} stroke="#7f9a68" strokeWidth="4" fill="none" strokeLinecap="round" />
          {geo.leaves.map((l, i) => (
            <path
              key={i}
              d="M0,0 C10,-12 30,-14 42,-4 C30,4 12,6 0,0Z"
              fill={i % 3 ? '#8fb07a' : '#a2c08a'}
              transform={`translate(120 ${l.y}) scale(${l.side * l.s} ${l.s}) rotate(-18)`}
            />
          ))}
          {Array.from({ length: geo.flowers }, (_, i) => {
            const l = geo.leaves[Math.min(geo.leaves.length - 1, geo.leaves.length - 2 - i * 2)];
            const x = 120 + (i % 2 ? 1 : -1) * 34 * l.s;
            return (
              <g key={i} transform={`translate(${x} ${l.y - 8})`}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} rx="5" ry="9" cy="-7" fill="#e7b7a8" transform={`rotate(${a})`} />
                ))}
                <circle r="4" fill="#f2d27a" />
              </g>
            );
          })}
          <path
            className="plant__new-leaf"
            d="M0,0 C8,-14 22,-18 30,-10 C22,0 10,4 0,0Z"
            fill="#b7d49a"
            transform={`translate(120 ${topY}) scale(${sessionLeaf}) rotate(-60)`}
          />
        </g>
        <path d="M78,262 L162,262 L152,318 Q150,326 142,326 L98,326 Q90,326 88,318 Z" fill="#8a5a3c" />
        <rect x="72" y="254" width="96" height="14" rx="4" fill="#9c6845" />
        <ellipse cx="120" cy="256" rx="44" ry="4" fill="#3a2618" />
      </svg>
      <Clock clock={clock} label={label} />
      <p className="plant__caption">
        Grown from {formatHours(totalFocusMs)}h of focus{next ? ` · next growth at ${formatHours(next.thresholdMs)}h` : ' · fully grown'}
      </p>
    </div>
  );
}

export function Hourglass({ progress, clock, label, running, size }: CompanionProps) {
  // Sand drains from the top bulb into a growing mound in the bottom one.
  const topSand = 1 - progress;
  const topY = 46 + (1 - topSand) * 78; // surface drops from 46 to 124
  const pile = progress * 62; // mound height in the bottom bulb
  return (
    <div className={`companion companion--hourglass ${size === 'large' ? 'is-large' : ''} ${running ? 'is-running' : ''}`}>
      <svg viewBox="0 0 160 300" aria-hidden>
        <defs>
          <clipPath id="hg-top">
            <path d="M40,40 L120,40 Q120,100 84,140 L76,140 Q40,100 40,40 Z" />
          </clipPath>
          <clipPath id="hg-bottom">
            <path d="M76,160 L84,160 Q120,200 120,260 L40,260 Q40,200 76,160 Z" />
          </clipPath>
          <linearGradient id="hg-glass" x1="0" x2="1">
            <stop offset="0" stopColor="rgb(255 255 255 / 0.10)" />
            <stop offset="0.4" stopColor="rgb(255 255 255 / 0.02)" />
            <stop offset="1" stopColor="rgb(255 255 255 / 0.08)" />
          </linearGradient>
        </defs>
        <g clipPath="url(#hg-top)">
          <rect x="30" y={topY} width="100" height={140 - topY} fill="#e3b06a" />
        </g>
        <g clipPath="url(#hg-bottom)">
          <path d={`M30,262 L30,${262 - pile * 0.35} Q80,${262 - pile * 1.25} 130,${262 - pile * 0.35} L130,262 Z`} fill="#d9a35c" />
        </g>
        {running && progress < 1 && <line className="hg__stream" x1="80" y1="140" x2="80" y2={258 - pile} stroke="#e8b878" strokeWidth="2" />}
        <path d="M40,40 L120,40 Q120,100 84,140 L84,160 Q120,200 120,260 L40,260 Q40,200 76,160 L76,140 Q40,100 40,40 Z" fill="url(#hg-glass)" stroke="rgb(240 230 215 / 0.35)" strokeWidth="2" />
        <rect x="26" y="26" width="108" height="14" rx="4" fill="#6b4a32" />
        <rect x="26" y="260" width="108" height="14" rx="4" fill="#6b4a32" />
        <rect x="30" y="40" width="5" height="220" fill="#5a3d29" />
        <rect x="125" y="40" width="5" height="220" fill="#5a3d29" />
      </svg>
      <Clock clock={clock} label={label} />
    </div>
  );
}

export function Moon({ progress, clock, label, running, size }: CompanionProps) {
  // Waxing from new (0) to full (1): right half lit, terminator ellipse sweeps across.
  const r = 70;
  const cx = 100;
  const cy = 100;
  const k = Math.min(1, Math.max(0.02, progress));
  const rx = r * Math.abs(1 - 2 * k);
  const sweep = k > 0.5 ? 1 : 0;
  const lit = `M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r} A${rx},${r} 0 0 ${sweep} ${cx},${cy - r} Z`;
  return (
    <div className={`companion companion--moon ${size === 'large' ? 'is-large' : ''} ${running ? 'is-running' : ''}`}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <radialGradient id="moon-lit" cx="0.4" cy="0.38">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset="0.7" stopColor="#efe3c8" />
            <stop offset="1" stopColor="#cfc0a2" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 26} fill="rgb(240 228 200)" opacity={0.04 + k * 0.12} className="moon__halo" />
        <circle cx={cx} cy={cy} r={r} fill="#24222c" />
        <path d={lit} fill="url(#moon-lit)" />
        <g fill="rgb(120 105 85 / 0.22)">
          <circle cx="118" cy="78" r="9" />
          <circle cx="88" cy="122" r="12" />
          <circle cx="126" cy="128" r="6" />
          <circle cx="76" cy="84" r="5" />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(240 230 215 / 0.12)" />
      </svg>
      <Clock clock={clock} label={label} />
    </div>
  );
}

export function Cat({ clock, label, running, size }: CompanionProps) {
  // Sleeps while a session runs; awake (and blinking) otherwise.
  return (
    <div className={`companion companion--cat ${size === 'large' ? 'is-large' : ''} ${running ? 'is-running' : 'is-awake'}`}>
      <svg viewBox="0 0 200 220" aria-hidden>
        <ellipse cx="100" cy="206" rx="70" ry="8" fill="rgb(0 0 0 / 0.35)" />
        <path className="cat__tail" d="M140,196 Q186,196 182,150 Q180,128 166,136" fill="none" stroke="#4a3a30" strokeWidth="12" strokeLinecap="round" />
        <g className="cat__body">
          <path d="M52,204 Q40,120 100,112 Q160,120 148,204 Z" fill="#4a3a30" />
          <path d="M80,204 Q84,170 100,168 Q116,170 120,204 Z" fill="#5c4a3d" />
        </g>
        <g className="cat__head">
          <path d="M56,62 L62,20 L88,46 Z" fill="#4a3a30" />
          <path d="M144,62 L138,20 L112,46 Z" fill="#4a3a30" />
          <path d="M63,52 L66,30 L80,46 Z" fill="#c98f7a" opacity="0.6" />
          <path d="M137,52 L134,30 L120,46 Z" fill="#c98f7a" opacity="0.6" />
          <ellipse cx="100" cy="78" rx="50" ry="42" fill="#4a3a30" />
          <g className="cat__eyes-open">
            <ellipse cx="80" cy="76" rx="8" ry="10" fill="#e3c26a" />
            <ellipse cx="120" cy="76" rx="8" ry="10" fill="#e3c26a" />
            <ellipse cx="80" cy="77" rx="2.5" ry="8" fill="#1b1410" />
            <ellipse cx="120" cy="77" rx="2.5" ry="8" fill="#1b1410" />
          </g>
          <g className="cat__eyes-closed" stroke="#1b1410" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M71,78 Q80,85 89,78" />
            <path d="M111,78 Q120,85 129,78" />
          </g>
          <path d="M96,94 L104,94 L100,99 Z" fill="#d79a8a" />
          <path d="M100,99 Q94,106 88,102 M100,99 Q106,106 112,102" stroke="#1b1410" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
        <text x="150" y="40" className="cat__zzz">z</text>
        <text x="164" y="24" className="cat__zzz cat__zzz--2">z</text>
      </svg>
      <Clock clock={clock} label={label} />
    </div>
  );
}

export function Companion({ id, ...props }: CompanionProps & { id: CompanionId }) {
  if (id === 'candle') return <Candle {...props} />;
  if (id === 'plant') return <Plant {...props} />;
  if (id === 'hourglass') return <Hourglass {...props} />;
  if (id === 'moon') return <Moon {...props} />;
  if (id === 'cat') return <Cat {...props} />;
  return <TimerRing {...props} />;
}
