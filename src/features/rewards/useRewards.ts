import { useMemo } from 'react';
import { isRewardUnlocked, REWARDS } from '../../domain/rewards';
import { useUnlocks } from '../../data/hooks';
import { useSettings } from '../../data/settings';

/** Achievement ids you've unlocked (stored unlocks are permanent). */
export function useUnlockedAchievements(): { unlocked: Set<string>; ready: boolean } {
  const { unlocks, loading } = useUnlocks();
  return useMemo(() => ({ unlocked: new Set(unlocks.map((u) => u.id)), ready: !loading }), [unlocks, loading]);
}

export function useRewards() {
  const { unlocked, ready } = useUnlockedAchievements();
  const settings = useSettings();
  return useMemo(() => {
    const isUnlocked = (rewardId?: string) => isRewardUnlocked(rewardId, unlocked);
    const off = new Set(settings.decorOff);
    // New decorations appear automatically once earned; you can switch any of them off.
    const activeDecor = new Set(REWARDS.filter((r) => r.kind === 'decor' && isUnlocked(r.id) && !off.has(r.id)).map((r) => r.id));
    return { isUnlocked, activeDecor, unlockedAchievements: unlocked, ready };
  }, [unlocked, ready, settings.decorOff]);
}
