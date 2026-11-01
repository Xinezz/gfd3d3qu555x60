import { useId } from 'react';
import { Lock } from 'lucide-react';
import type { Achievement, CategoryId, Tier } from '../../domain/achievements';
import { PixelGroup, type SpriteName } from '../../ui/Pixel';

/** Each category has a pixel sprite; a few landmark achievements get their own. */
const CATEGORY_SPRITE: Record<CategoryId, SpriteName> = {
  'getting-started': 'hourglass',
  'long-term': 'star',
  consistency: 'flame',
  sessions: 'target',
  craft: 'quill',
};
const SPRITE_OVERRIDE: Record<string, SpriteName> = { 'h-1000': 'crown', 'deep-90': 'moon', 'day-4h': 'sun' };

/** Light → mid → dark metal for each tier. Platinum leans lavender to match the palette. */
export const TIER_COLORS: Record<Tier, [string, string, string]> = {
  bronze: ['#ecb98f', '#b77a4c', '#6a4126'],
  silver: ['#f4f5f7', '#b9c0c9', '#6b737d'],
  gold: ['#fbe6a8', '#d9ab54', '#8a5e18'],
  platinum: ['#f6f3ff', '#c8c0e8', '#77709f'],
  legendary: ['#fff7dc', '#f0c35a', '#a6651a'],
};

export const TIER_LABEL: Record<Tier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', legendary: 'Legendary' };
const TIER_PIPS: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4, legendary: 5 };

/** Points of a pointy-top hexagon. */
const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

/**
 * A collectible emblem: a bevelled hexagonal medallion in its tier's metal, with a pixel sprite at
 * its heart and tier pips beneath. Locked emblems are a dark, unlit silhouette.
 */
export function Badge({ achievement, unlocked, size = 72 }: { achievement: Achievement; unlocked: boolean; size?: number }) {
  const gid = useId().replace(/:/g, '');
  const sprite = SPRITE_OVERRIDE[achievement.id] ?? CATEGORY_SPRITE[achievement.category];
  const [light, mid, dark] = unlocked ? TIER_COLORS[achievement.tier] : ['#4a3e34', '#2f2620', '#1c1612'];
  const pips = TIER_PIPS[achievement.tier];
  const legendary = achievement.tier === 'legendary' && unlocked;

  return (
    <span className={`badge tier-${achievement.tier} ${unlocked ? 'is-unlocked' : 'is-locked'}`} style={{ width: size, height: size * 1.04 }} aria-hidden>
      <svg viewBox="0 0 100 104">
        <defs>
          <linearGradient id={`${gid}m`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.45" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
          <radialGradient id={`${gid}f`} cx="0.5" cy="0.32" r="0.75">
            <stop offset="0" stopColor={unlocked ? '#33271e' : '#1f1915'} />
            <stop offset="1" stopColor={unlocked ? '#140f0b' : '#110d0a'} />
          </radialGradient>
          <clipPath id={`${gid}c`}>
            <polygon points={hex(50, 52, 47)} />
          </clipPath>
        </defs>
        {/* Metal rim; the matching stroke rounds the corners. */}
        <polygon points={hex(50, 52, 45)} fill={`url(#${gid}m)`} stroke={`url(#${gid}m)`} strokeWidth="5" strokeLinejoin="round" />
        <polygon points={hex(50, 52, 37.5)} fill={`url(#${gid}f)`} stroke={dark} strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points={hex(50, 52, 33)} fill="none" stroke={light} strokeOpacity={unlocked ? 0.22 : 0.08} strokeWidth="0.8" />
        {unlocked && <ellipse cx="50" cy="40" rx="20" ry="13" fill={light} opacity="0.07" />}
        <PixelGroup name={sprite} cx={50} cy={49} size={30} mono={unlocked ? undefined : '#3d3229'} />
        {Array.from({ length: pips }, (_, i) => {
          const x = 50 + (i - (pips - 1) / 2) * 5.5;
          return <rect key={i} x={x - 1.5} y={74.5} width={3} height={3} transform={`rotate(45 ${x} 76)`} fill={unlocked ? light : '#3d3229'} opacity={unlocked ? 0.9 : 1} />;
        })}
        {legendary && (
          <g clipPath={`url(#${gid}c)`}>
            <rect className="badge__sheen" x="-60" y="0" width="40" height="104" fill="#fff6dc" opacity="0.22" transform="skewX(-20)" />
          </g>
        )}
      </svg>
      {!unlocked && (
        <span className="badge__lock">
          <Lock size={Math.max(9, size * 0.14)} strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}
