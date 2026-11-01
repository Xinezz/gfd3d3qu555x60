import { useId } from 'react';
import { Anchor, Crown, Flame, Hourglass, Lock, Mountain, PenLine, Sun, Target, type LucideIcon } from 'lucide-react';
import type { Achievement, CategoryId, Tier } from '../../domain/achievements';

const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  'getting-started': Hourglass,
  'long-term': Mountain,
  consistency: Flame,
  sessions: Target,
  craft: PenLine,
};
const ICON_OVERRIDE: Record<string, LucideIcon> = { 'h-1000': Crown, 'deep-90': Anchor, 'day-4h': Sun };

/** Light → dark stops for each tier's medallion. */
export const TIER_COLORS: Record<Tier, [string, string, string]> = {
  bronze: ['#e7b48a', '#b57846', '#7a4a28'],
  silver: ['#f1f3f6', '#b9c1cb', '#7b8590'],
  gold: ['#fbe3a1', '#e0b155', '#9c6c1f'],
  radiant: ['#ffd9c2', '#e8957a', '#a84f5e'],
  legendary: ['#fff4d6', '#f2c35e', '#b9741c'],
};

export const TIER_LABEL: Record<Tier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', radiant: 'Radiant', legendary: 'Legendary' };

/** Scalloped medallion: 24-point rosette edge, tier gradient ring, dark face with the icon. */
export function Badge({ achievement, unlocked, size = 72 }: { achievement: Achievement; unlocked: boolean; size?: number }) {
  const gid = useId();
  const Icon = ICON_OVERRIDE[achievement.id] ?? CATEGORY_ICON[achievement.category];
  const [light, mid, dark] = TIER_COLORS[achievement.tier];
  const points = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 44 : 48;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <span className={`badge tier-${achievement.tier} ${unlocked ? 'is-unlocked' : 'is-locked'}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`${gid}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.5" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
          <radialGradient id={`${gid}-face`} cx="0.4" cy="0.35">
            <stop offset="0" stopColor="#3a2f26" />
            <stop offset="1" stopColor="#15110e" />
          </radialGradient>
        </defs>
        <polygon points={points} fill={`url(#${gid}-ring)`} />
        <circle cx="50" cy="50" r="36" fill={`url(#${gid}-face)`} stroke={dark} strokeWidth="1.5" />
        <circle cx="50" cy="50" r="31" fill="none" stroke={light} strokeOpacity="0.25" strokeWidth="1" />
      </svg>
      <span className="badge__icon" style={{ color: unlocked ? light : undefined }}>
        <Icon size={size * 0.32} strokeWidth={1.7} />
      </span>
      {!unlocked && (
        <span className="badge__lock">
          <Lock size={Math.max(10, size * 0.17)} strokeWidth={2.2} />
        </span>
      )}
    </span>
  );
}
