import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, Gift } from 'lucide-react';
import { ACHIEVEMENTS, achievementById, CATEGORIES, progressLabel, progressOf, unlockTimeline } from '../../domain/achievements';
import { REWARDS, rewardsFor } from '../../domain/rewards';
import { Segmented } from '../../ui';
import { RewardsGallery } from '../rewards/RewardsGallery';
import { HOUR_MILESTONES, milestoneProgress } from '../../domain/milestones';
import { formatDate, formatHours, HOUR } from '../../domain/time';
import { useSessions, useUnlocks } from '../../data/hooks';
import { Badge, TIER_LABEL } from './Badge';
import './achievements.css';

const JOURNEY = HOUR_MILESTONES.filter((m) => m.thresholdMs >= HOUR);
const FINAL_HOURS = 1000;
/** Log scale so the early milestones aren't crushed against the start of a 1,000-hour line. */
const pos = (hours: number) => Math.min(1, Math.log10(1 + Math.max(0, hours)) / Math.log10(1 + FINAL_HOURS));

export function AchievementsPage() {
  const { sessions, loading } = useSessions();
  const { unlocks } = useUnlocks();
  const { unlocked: earned, metrics } = useMemo(() => unlockTimeline(sessions), [sessions]);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'rewards' ? 'rewards' : 'achievements';

  // Stored unlocks are permanent; freshly earned ones show immediately while they're being saved.
  const unlockedAt = useMemo(() => {
    const m = new Map(earned);
    for (const u of unlocks) m.set(u.id, u.unlockedAt);
    return m;
  }, [earned, unlocks]);

  const count = ACHIEVEMENTS.filter((a) => unlockedAt.has(a.id)).length;
  const hours = metrics.focusMs / HOUR;
  const next = milestoneProgress(metrics.focusMs);
  const history = [...unlockedAt.entries()].filter(([id]) => achievementById(id)).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`page achievements ${loading ? 'is-loading' : ''}`}>
      <header className="page-head">
        <div>
          <p className="eyebrow">Your progress</p>
          <h1>Achievements</h1>
          <p className="muted">
            {count} of {ACHIEVEMENTS.length} emblems collected. Every one is earned from your recorded sessions.
          </p>
        </div>
      </header>

      <section className="ach-hero">
        <div>
          <span className="eyebrow">Lifetime focus</span>
          <div className="ach-hero__hours">
            <span className="ach-hero__value num">{formatHours(metrics.focusMs)}</span>
            <span className="ach-hero__unit">hours</span>
          </div>
          <div className="ach-tally" aria-label="Emblems by tier">
            {(['bronze', 'silver', 'gold', 'platinum', 'legendary'] as const).map((t) => {
              const all = ACHIEVEMENTS.filter((a) => a.tier === t);
              const got = all.filter((a) => unlockedAt.has(a.id)).length;
              return (
                <span key={t} className={`ach-tally__item tier-${t} ${got ? 'has-some' : ''}`} title={`${TIER_LABEL[t]}: ${got} of ${all.length}`}>
                  <i />
                  <span className="num">
                    {got}/{all.length}
                  </span>
                  <span>{TIER_LABEL[t]}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="ach-hero__next">
          {next.next ? (
            <>
              <div className="ach-hero__next-row">
                <span>
                  <span className="faint small">Next · </span>
                  {next.next.name}
                </span>
                <span className="faint small num">
                  {formatHours(next.next.thresholdMs - metrics.focusMs)}h to go
                </span>
              </div>
              <div className="progress-bar">
                <i style={{ width: `${next.ratio * 100}%` }} />
              </div>
            </>
          ) : (
            <p>All hour milestones reached. You walked the whole road.</p>
          )}
        </div>
      </section>

      <section className="card journey" aria-label="The road to 1,000 hours">
        <div className="card__head">
          <h2>The road to 1,000 hours</h2>
          <span className="faint small num">{Math.min(100, (hours / FINAL_HOURS) * 100).toFixed(hours < 10 ? 2 : 1)}%</span>
        </div>
        <div className="journey__track">
          <div className="journey__line" />
          <div className="journey__fill" style={{ width: `${pos(hours) * 100}%` }} />
          {JOURNEY.map((m, i) => {
            const h = m.thresholdMs / HOUR;
            const final = h === FINAL_HOURS;
            return (
              <div
                key={m.id}
                className={`journey__node ${hours >= h ? 'is-reached' : ''} ${final ? 'is-final' : ''} ${i % 2 && !final ? 'is-up' : ''} ${h === 750 ? 'is-minor' : ''}`}
                style={{ left: `${pos(h) * 100}%` }}
                title={`${m.name} · ${h.toLocaleString()} hours`}
              >
                <span className="journey__dot">{final && <Crown size={14} />}</span>
                <span className="journey__label">{h.toLocaleString()}h</span>
              </div>
            );
          })}
          {hours > 0 && hours < FINAL_HOURS && (
            <div className="journey__you" style={{ left: `${pos(hours) * 100}%` }}>
              You
            </div>
          )}
        </div>
        <p className="journey__caption faint small">
          {hours >= FINAL_HOURS ? 'A thousand hours. Mastery.' : `${formatHours(FINAL_HOURS * HOUR - metrics.focusMs)} hours to mastery. One session at a time.`}
        </p>
      </section>

      <Segmented
        label="Show"
        value={tab}
        onChange={(v) => setParams(v === 'rewards' ? { tab: 'rewards' } : {}, { replace: true })}
        options={[
          { value: 'achievements', label: `Achievements · ${count}/${ACHIEVEMENTS.length}` },
          { value: 'rewards', label: `Rewards · ${REWARDS.filter((r) => unlockedAt.has(r.requires)).length}/${REWARDS.length}` },
        ]}
      />

      {tab === 'rewards' && <RewardsGallery unlockedAt={unlockedAt} metrics={metrics} />}

      {tab === 'achievements' && CATEGORIES.map((c) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === c.id);
        const done = items.filter((a) => unlockedAt.has(a.id)).length;
        return (
          <section key={c.id} className="ach-category">
            <div className="ach-category__head">
              <div>
                <h2>{c.name}</h2>
                <p className="faint small">{c.blurb}</p>
              </div>
              <span className="faint small num">
                {done} / {items.length}
              </span>
            </div>
            <div className="ach-grid">
              {items.map((a, i) => {
                const at = unlockedAt.get(a.id);
                const isUnlocked = at != null;
                const p = progressOf(a, metrics);
                const legend = a.tier === 'legendary';
                return (
                  <article
                    key={a.id}
                    className={`ach-card tier-${a.tier} ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${legend ? 'ach-card--legend' : ''}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Badge achievement={a} unlocked={isUnlocked} size={legend ? 132 : 84} />
                    <div className="ach-card__body">
                      {legend && <span className="eyebrow ach-card__legend-label">The summit</span>}
                      <span className="ach-card__name">{a.name}</span>
                      <span className={`ach-card__tier tier-${a.tier}`}>{TIER_LABEL[a.tier]}</span>
                      <span className="ach-card__desc">{a.description}</span>
                      {rewardsFor(a.id).length > 0 && (
                        <span className="ach-card__reward">
                          <Gift size={12} /> {isUnlocked ? 'Unlocked' : 'Unlocks'} {rewardsFor(a.id).map((r) => r.name).join(', ')}
                        </span>
                      )}
                      <div className="ach-card__meta">
                        {isUnlocked ? (
                          <span className="ach-card__date num">Earned {formatDate(at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        ) : (
                          <>
                            <span className="progress-bar" aria-hidden>
                              <i style={{ width: `${p.ratio * 100}%` }} />
                            </span>
                            <span className="num">{progressLabel(a, metrics)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {tab === 'achievements' && <section className="ach-log">
        <div className="section__head">
          <h2>Unlock history</h2>
          <span className="faint small">{history.length} unlocked</span>
        </div>
        {history.length ? (
          <ul className="ach-history">
            {history.map(([id, at]) => {
              const a = achievementById(id)!;
              return (
                <li key={id}>
                  <Badge achievement={a} unlocked size={36} />
                  <span className="ach-history__main">
                    <strong>{a.name}</strong>
                    <span className="faint small">{CATEGORIES.find((c) => c.id === a.category)?.name}</span>
                  </span>
                  <span className="faint small num">{formatDate(at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">Your first achievement unlocks after your first focused minute. The Lock-In Room is waiting.</p>
        )}
      </section>}
    </div>
  );
}
