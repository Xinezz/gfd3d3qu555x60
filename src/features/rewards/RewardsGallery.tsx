import { Cat, Hourglass, Lock, Moon, Sparkles, Star, Sun, type LucideIcon } from 'lucide-react';
import { achievementById, progressLabel, progressOf, type Metrics } from '../../domain/achievements';
import { REWARDS, type Reward, type RewardKind } from '../../domain/rewards';
import { formatDate } from '../../domain/time';
import { ENVIRONMENTS } from '../scenes/catalog';
import { DECOR_PREVIEW } from './Decor';
import './decor.css';

const SECTIONS: { kind: RewardKind; title: string; blurb: string }[] = [
  { kind: 'decor', title: 'Room decorations', blurb: 'They appear in your Lock-In Room once earned. Switch them on or off from the Decor panel.' },
  { kind: 'environment', title: 'Environments', blurb: 'New places to study, with their own sound.' },
  { kind: 'companion', title: 'Companions', blurb: 'New friends for your focus sessions.' },
];

const ICONS: Record<string, LucideIcon> = {
  'decor-lights': Sparkles,
  'decor-fireflies': Sparkles,
  'decor-stars': Star,
  'decor-golden': Sun,
  'companion-moon': Moon,
  'companion-cat': Cat,
};

function Preview({ reward, unlocked }: { reward: Reward; unlocked: boolean }) {
  const env = reward.kind === 'environment' ? ENVIRONMENTS.find((e) => e.reward === reward.id) : undefined;
  if (env)
    return (
      <span className="reward__preview reward__preview--env" style={{ ['--glow' as string]: env.glow }}>
        {!unlocked && <Lock size={16} />}
      </span>
    );
  const Drawing = DECOR_PREVIEW[reward.id];
  const Icon = ICONS[reward.id] ?? Hourglass;
  return (
    <span className="reward__preview">
      {Drawing ? <Drawing /> : <Icon size={30} strokeWidth={1.5} />}
      {!unlocked && (
        <span className="reward__lock">
          <Lock size={12} />
        </span>
      )}
    </span>
  );
}

export function RewardsGallery({ unlockedAt, metrics }: { unlockedAt: Map<string, number>; metrics: Metrics }) {
  const earned = REWARDS.filter((r) => unlockedAt.has(r.requires)).length;
  return (
    <div className="stack">
      <p className="muted">
        {earned} of {REWARDS.length} rewards earned. There's nothing to buy: every reward unlocks with an achievement.
      </p>
      {SECTIONS.map((sec) => (
        <section key={sec.kind} className="ach-category">
          <div className="ach-category__head">
            <div>
              <h2>{sec.title}</h2>
              <p className="faint small">{sec.blurb}</p>
            </div>
          </div>
          <div className="ach-grid">
            {REWARDS.filter((r) => r.kind === sec.kind).map((r) => {
              const a = achievementById(r.requires)!;
              const at = unlockedAt.get(r.requires);
              const unlocked = at != null;
              const p = progressOf(a, metrics);
              return (
                <article key={r.id} className={`ach-card reward ${unlocked ? 'is-unlocked' : 'is-locked'} ${r.id === 'decor-golden' ? 'tier-legendary' : ''}`}>
                  <Preview reward={r} unlocked={unlocked} />
                  <div className="ach-card__body">
                    <span className="ach-card__name">{r.name}</span>
                    <span className="ach-card__desc">{r.description}</span>
                    <div className="ach-card__meta">
                      {unlocked ? (
                        <span className="ach-card__date">
                          Earned with {a.name} · {formatDate(at, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <>
                          <span className="progress-bar" aria-hidden>
                            <i style={{ width: `${p.ratio * 100}%` }} />
                          </span>
                          <span className="num">
                            {a.name} · {progressLabel(a, metrics)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
