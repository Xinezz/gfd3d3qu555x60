import { achievementById } from './achievements';

/**
 * Rewards are earned, never bought: each one unlocks when a specific achievement does. There is
 * no currency. Unlocks are permanent because achievement unlocks are permanent.
 */
export type RewardKind = 'decor' | 'environment' | 'companion';

export interface Reward {
  id: string;
  kind: RewardKind;
  name: string;
  description: string;
  /** Achievement that unlocks it. */
  requires: string;
}

export const REWARDS: Reward[] = [
  // Room decorations
  { id: 'decor-mug', kind: 'decor', name: 'Steaming Mug', description: 'A warm drink on the desk, steam curling up.', requires: 'h-1' },
  { id: 'decor-cactus', kind: 'decor', name: 'Little Cactus', description: 'A small, sturdy desk companion.', requires: 'h-5' },
  { id: 'decor-books', kind: 'decor', name: 'Book Stack', description: 'A pile of well-loved books.', requires: 'h-10' },
  { id: 'decor-lights', kind: 'decor', name: 'Fairy Lights', description: 'A string of soft lights along the top of the room.', requires: 'streak-3' },
  { id: 'decor-vinyl', kind: 'decor', name: 'Record Player', description: 'A turntable, quietly spinning.', requires: 'sessions-10' },
  { id: 'decor-lamp', kind: 'decor', name: 'Desk Lamp', description: 'A pool of warm lamplight.', requires: 'h-25' },
  { id: 'decor-fireflies', kind: 'decor', name: 'Fireflies', description: 'A few slow, glowing fireflies drift through the room.', requires: 'streak-7' },
  { id: 'decor-cat', kind: 'decor', name: 'Sleeping Cat', description: 'A cat curled up beside you, breathing softly.', requires: 'sessions-50' },
  { id: 'decor-stars', kind: 'decor', name: 'Shooting Stars', description: 'Now and then, a star streaks across the top of the room.', requires: 'h-50' },
  { id: 'decor-golden', kind: 'decor', name: 'Golden Hour', description: 'A faint golden light around your companion. Earned once, at 1,000 hours.', requires: 'h-1000' },
  // Environments
  { id: 'env-mountain-lake', kind: 'environment', name: 'Mountain Lake', description: 'Dawn over still water and distant peaks.', requires: 'h-25' },
  { id: 'env-aurora', kind: 'environment', name: 'Aurora Night', description: 'Northern lights over a snowy forest.', requires: 'streak-7' },
  { id: 'env-desert', kind: 'environment', name: 'Desert Night', description: 'Moonlit dunes under a sky full of stars.', requires: 'h-100' },
  { id: 'env-starfield', kind: 'environment', name: 'Starfield', description: 'Drifting through deep space and nebulae.', requires: 'sessions-100' },
  // Companions
  { id: 'companion-moon', kind: 'companion', name: 'Moon', description: 'Waxes from new to full as your session goes on.', requires: 'h-10' },
  { id: 'companion-cat', kind: 'companion', name: 'Cat', description: 'Naps through your session and wakes when you finish.', requires: 'sessions-10' },
];

export const rewardById = (id: string) => REWARDS.find((r) => r.id === id);
export const rewardsFor = (achievementId: string) => REWARDS.filter((r) => r.requires === achievementId);

/** Environments/companions that need unlocking map to these reward ids. Anything not listed is free. */
export const ENV_REWARD: Record<string, string> = {
  'mountain-lake': 'env-mountain-lake',
  aurora: 'env-aurora',
  desert: 'env-desert',
  starfield: 'env-starfield',
};
export const COMPANION_REWARD: Record<string, string> = { moon: 'companion-moon', cat: 'companion-cat' };

export function isRewardUnlocked(rewardId: string | undefined, unlockedAchievements: Set<string>): boolean {
  if (!rewardId) return true;
  const r = rewardById(rewardId);
  return !!r && unlockedAchievements.has(r.requires);
}

export const requirementName = (r: Reward) => achievementById(r.requires)?.name ?? r.requires;

/** Name of the achievement that unlocks a reward, for "Unlocks with …" labels ('' when it's free). */
export const unlockName = (rewardId?: string) => {
  const r = rewardId ? rewardById(rewardId) : undefined;
  return r ? requirementName(r) : '';
};
