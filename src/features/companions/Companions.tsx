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

export const COMPANIONS: { id: CompanionId; name: string; blurb: string }[] = [
  { id: 'timer', name: 'Timer', blurb: 'A calm countdown ring' },
  { id: 'candle', name: 'Candle', blurb: 'Burns down as you focus' },
  { id: 'plant', name: 'Plant', blurb: 'Grows with every hour you study' },
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

export function Companion({ id, ...props }: CompanionProps & { id: CompanionId }) {
  if (id === 'candle') return <Candle {...props} />;
  if (id === 'plant') return <Plant {...props} />;
  return <TimerRing {...props} />;
}
