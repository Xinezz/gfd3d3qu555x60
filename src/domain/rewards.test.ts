import { describe, expect, it } from 'vitest';
import { achievementById } from './achievements';
import { COMPANION_REWARD, ENV_REWARD, isRewardUnlocked, REWARDS, rewardById, rewardsFor } from './rewards';

describe('rewards', () => {
  it('every reward points at a real achievement and has a unique id', () => {
    expect(new Set(REWARDS.map((r) => r.id)).size).toBe(REWARDS.length);
    for (const r of REWARDS) expect(achievementById(r.requires), r.id).toBeDefined();
  });

  it('gated environments and companions map to existing rewards of the right kind', () => {
    for (const id of Object.values(ENV_REWARD)) expect(rewardById(id)?.kind).toBe('environment');
    for (const id of Object.values(COMPANION_REWARD)) expect(rewardById(id)?.kind).toBe('companion');
  });

  it('unlocks exactly when its achievement is unlocked', () => {
    expect(isRewardUnlocked('decor-mug', new Set())).toBe(false);
    expect(isRewardUnlocked('decor-mug', new Set(['h-1']))).toBe(true);
    expect(isRewardUnlocked(undefined, new Set())).toBe(true); // ungated content is free
    expect(rewardsFor('h-25').map((r) => r.id).sort()).toEqual(['decor-lamp', 'env-mountain-lake']);
  });

  it('reserves the legendary reward for 1,000 hours', () => {
    expect(rewardsFor('h-1000').map((r) => r.id)).toEqual(['decor-golden']);
  });
});
