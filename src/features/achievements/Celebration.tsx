import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { achievementById, CATEGORIES, unlockTimeline, type Achievement } from '../../domain/achievements';
import { rewardsFor } from '../../domain/rewards';
import type { AchievementUnlock } from '../../domain/types';
import { formatDate, formatTimeOfDay } from '../../domain/time';
import { useSessions, useUnlocks } from '../../data/hooks';
import { unlocksRepo } from '../../data/repo';
import { getSettings } from '../../data/settings';
import { playUnlock } from '../audio/synth';
import { useRoom } from '../session/sessionStore';
import { Badge, TIER_LABEL } from './Badge';
import './achievements.css';

/**
 * Mounted once in the app shell. Keeps stored unlocks in step with your session history and
 * celebrates new ones — never while a focus session is running.
 */
export function AchievementCenter() {
  const { sessions, loading } = useSessions();
  const { unlocks, loading: unlocksLoading } = useUnlocks();
  // Writes already sent but maybe not yet reflected in `unlocks`, so re-runs don't repeat them.
  const written = useRef(new Set<string>());
  const patched = useRef(new Map<string, number>());

  // Record newly earned achievements with the date they were actually earned. If older history
  // arrives later (an import, or sessions saved out of order), move dates back to the true
  // crossing. Stored unlocks are never removed, even if sessions are later deleted.
  useEffect(() => {
    if (loading || unlocksLoading) return;
    const stored = new Map(unlocks.map((u) => [u.id, u]));
    const now = Date.now();
    for (const [id, unlockedAt] of unlockTimeline(sessions).unlocked) {
      const existing = stored.get(id);
      if (existing) {
        if (unlockedAt < existing.unlockedAt && patched.current.get(id) !== unlockedAt) {
          patched.current.set(id, unlockedAt);
          void unlocksRepo.patch(id, { unlockedAt });
        }
        continue;
      }
      if (written.current.has(id)) continue;
      written.current.add(id);
      // create() never overwrites: if `unlocks` is momentarily stale (e.g. mid-restore), the
      // stored record and its seen state win.
      void unlocksRepo.create({ id, createdAt: now, updatedAt: now, deletedAt: null, unlockedAt, seenAt: null });
    }
  }, [sessions, unlocks, loading, unlocksLoading]);

  const queue = useMemo(
    () => unlocks.filter((u) => u.seenAt == null && achievementById(u.id)).sort((a, b) => a.unlockedAt - b.unlockedAt),
    [unlocks],
  );
  const { timer, reviewId } = useRoom();
  const focusing = timer.phase === 'focus' && timer.status !== 'idle';
  if (!queue.length || focusing) return null;
  // A backlog (first launch, restored history) is summarised instead of shown one by one.
  if (queue.length > 3) return <Summary queue={queue} />;
  return <Unlocked key={queue[0].id} unlock={queue[0]} remaining={queue.length - 1} aboveReview={!!reviewId} />;
}

const KIND_LABEL = { decor: 'decoration', environment: 'environment', companion: 'companion' } as const;

/** "Reward unlocked: Steaming Mug (decoration)" — what these achievements just earned you. */
function RewardLine({ achievementIds }: { achievementIds: string[] }) {
  const rewards = achievementIds.flatMap(rewardsFor);
  if (!rewards.length) return null;
  const shown = rewards.slice(0, 4);
  return (
    <div className="celebration__rewards">
      <span className="eyebrow">{rewards.length === 1 ? 'Reward unlocked' : `${rewards.length} rewards unlocked`}</span>
      <div>
        {shown.map((r) => (
          <span key={r.id} className="chip">
            <Gift size={12} /> {r.name} <span className="faint">· {KIND_LABEL[r.kind]}</span>
          </span>
        ))}
        {rewards.length > shown.length && <span className="chip">+{rewards.length - shown.length} more</span>}
      </div>
    </div>
  );
}

const markSeen = (ids: string[]) => Promise.all(ids.map((id) => unlocksRepo.patch(id, { seenAt: Date.now() })));

function Sparks({ count = 18 }: { count?: number }) {
  return (
    <div className="sparks" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ ['--a' as string]: `${(360 / count) * i + (i % 3) * 7}deg`, ['--d' as string]: `${140 + (i % 4) * 45}px`, animationDelay: `${0.35 + (i % 5) * 0.04}s` }} />
      ))}
    </div>
  );
}

function Unlocked({ unlock, remaining, aboveReview }: { unlock: AchievementUnlock; remaining: number; aboveReview: boolean }) {
  const navigate = useNavigate();
  const a = achievementById(unlock.id)!;
  const legendary = a.tier === 'legendary';
  const category = CATEGORIES.find((c) => c.id === a.category)!;

  useEffect(() => {
    if (getSettings().chime) playUnlock(legendary);
  }, [legendary]);

  const next = (go?: string) => {
    void markSeen([unlock.id]);
    if (go) navigate(go);
  };

  return (
    <div className={`celebration ${legendary ? 'is-legendary' : ''} ${aboveReview ? 'is-above' : ''}`} role="dialog" aria-modal aria-labelledby="unlock-title">
      <div className="celebration__glow" />
      {legendary && <div className="celebration__aurora" />}
      <div className="celebration__card">
        <div className="celebration__badge">
          <div className="celebration__rays" />
          <Sparks count={legendary ? 28 : 18} />
          <Badge achievement={a} unlocked size={legendary ? 168 : 128} />
        </div>
        <p className="eyebrow celebration__eyebrow">{legendary ? 'Legendary achievement' : 'Achievement unlocked'}</p>
        <h2 id="unlock-title" className="celebration__name">
          {a.name}
        </h2>
        <p className="celebration__desc">{a.description}</p>
        <RewardLine achievementIds={[a.id]} />
        <p className="faint small">
          {TIER_LABEL[a.tier]} · {category.name} · {formatDate(unlock.unlockedAt, { day: 'numeric', month: 'long', year: 'numeric' })}, {formatTimeOfDay(unlock.unlockedAt)}
        </p>
        <div className="celebration__actions">
          <button className="btn btn--primary btn--lg" autoFocus onClick={() => next()}>
            {remaining ? `Next (${remaining} more)` : legendary ? 'I did this' : 'Continue'}
          </button>
          <button className="btn btn--ghost" onClick={() => next('/achievements')}>
            View collection
          </button>
        </div>
      </div>
    </div>
  );
}

function Summary({ queue }: { queue: AchievementUnlock[] }) {
  const navigate = useNavigate();
  const list = queue.map((u) => ({ u, a: achievementById(u.id) as Achievement }));
  const hasLegendary = list.some((x) => x.a.tier === 'legendary');
  useEffect(() => {
    if (getSettings().chime) playUnlock(hasLegendary);
  }, [hasLegendary]);
  const done = (go?: string) => {
    void markSeen(queue.map((u) => u.id));
    if (go) navigate(go);
  };
  return (
    <div className="celebration" role="dialog" aria-modal aria-labelledby="unlock-summary-title">
      <div className="celebration__glow" />
      <div className="celebration__card celebration__card--summary">
        <p className="eyebrow celebration__eyebrow">Achievements unlocked</p>
        <h2 id="unlock-summary-title" className="celebration__name">
          {queue.length} achievements earned
        </h2>
        <p className="celebration__desc">Every one of these came from hours you actually put in.</p>
        <RewardLine achievementIds={queue.map((u) => u.id)} />
        <ul className="celebration__list">
          {list.map(({ u, a }, i) => (
            <li key={u.id} style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
              <Badge achievement={a} unlocked size={44} />
              <span>
                <strong>{a.name}</strong>
                <span className="faint small">{formatDate(u.unlockedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="celebration__actions">
          <button className="btn btn--primary btn--lg" autoFocus onClick={() => done()}>
            Wonderful
          </button>
          <button className="btn btn--ghost" onClick={() => done('/achievements')}>
            View collection
          </button>
        </div>
      </div>
    </div>
  );
}
