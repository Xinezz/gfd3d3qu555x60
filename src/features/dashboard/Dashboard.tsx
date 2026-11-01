import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, Play, SlidersHorizontal } from 'lucide-react';
import type { Session, Subject } from '../../domain/types';
import { BUILT_IN_PRESETS } from '../../domain/presets';
import { currentWeekDays, monthFocusMs, recentSessions, streaks, todayStats, weekFocusMs } from '../../domain/stats';
import { ACHIEVEMENTS, progressLabel, progressOf, unlockTimeline } from '../../domain/achievements';
import { formatClock, formatDuration, formatHours, formatTimeOfDay, MINUTE, relativeDay } from '../../domain/time';
import { remainingMs } from '../../domain/timer';
import { useAllSubjects, useCustomPresets, useNotes, useSessions, useSubjects, useTasks, useUnlocks } from '../../data/hooks';
import { sessionsRepo } from '../../data/repo';
import { updateSettings, useSettings } from '../../data/settings';
import { useNow } from '../../ui';
import { Pixel } from '../../ui/Pixel';
import { Badge } from '../achievements/Badge';
import { environmentById } from '../scenes/catalog';
import { room, useRoom } from '../session/sessionStore';
import { ContinueStudying, UpNext } from './ContinueStudying';
import { describe, isTemplate, startTemplate } from '../room/templates';
import './dashboard.css';

function greeting(h: number) {
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { sessions, loading } = useSessions();
  const subjects = useAllSubjects();
  const liveSubjects = useSubjects();
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const settings = useSettings();
  const now = useNow(true, 60_000);

  const stats = useMemo(() => {
    const today = todayStats(sessions, now);
    const { metrics } = unlockTimeline(sessions);
    return {
      today,
      streak: streaks(sessions, now),
      week: weekFocusMs(sessions, now),
      month: monthFocusMs(sessions, now),
      metrics,
      days: currentWeekDays(sessions, now),
      recent: recentSessions(sessions, 6),
    };
  }, [sessions, now]);

  const goalMs = settings.dailyGoalMin * MINUTE;
  const line =
    stats.today.focusMs >= goalMs
      ? "Today's goal is met. Anything more is a quiet bonus."
      : stats.today.count > 0
        ? `${formatDuration(goalMs - stats.today.focusMs)} to go today. Keep the rhythm.`
        : stats.streak.current > 0
          ? `Your ${stats.streak.current}-day streak is waiting for today's session.`
          : 'The room is quiet and ready when you are.';
  const name = settings.displayName.trim();

  return (
    <div className={`page dash ${loading ? 'is-loading' : ''}`}>
      <section className="dash-hero">
        <div className="dash-hero__intro">
          <p className="eyebrow">{new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="t-display">
            {greeting(new Date(now).getHours())}
            {name ? (
              <>
                , <em>{name}</em>
              </>
            ) : null}
            .
          </h1>
          <p className="dash-hero__line">{line}</p>
          <StartArea />
        </div>
        <TodayDial focusMs={stats.today.focusMs} goalMs={goalMs} count={stats.today.count} />
      </section>

      <section className="dash-strip" aria-label="Your numbers">
        <div className="dash-stat dash-stat--streak">
          <Pixel name="flame" scale={3} mono={stats.streak.current ? undefined : '#3a2f27'} />
          <div>
            <span className="eyebrow">Streak</span>
            <span className="t-stat">
              {stats.streak.current}
              <small>{stats.streak.current === 1 ? 'day' : 'days'}</small>
            </span>
            <span className="faint xsmall">Best {stats.streak.best}</span>
          </div>
        </div>
        <Stat label="This week" value={formatDuration(stats.week)} />
        <Stat label="This month" value={formatDuration(stats.month)} />
        <Stat label="Lifetime" value={formatHours(stats.metrics.focusMs)} unit="h" sub={`${stats.metrics.completedSessions} full sessions`} />
      </section>

      <ContinueStudying subjects={liveSubjects} notes={notes} sessions={sessions} now={now} />

      <div className="dash-row">
        <WeekChart days={stats.days} goalMs={goalMs} total={stats.week} />
        <NextAchievement sessions={sessions} />
      </div>

      <div className="dash-row dash-row--wide">
        <Recent sessions={stats.recent} subjects={subjects} />
        <div className="dash-side">
          <UpNext tasks={tasks} subjects={subjects} sessions={sessions} now={now} />
          <ParkedThoughts sessions={sessions} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="dash-stat">
      <div>
        <span className="eyebrow">{label}</span>
        <span className="t-stat">
          {value}
          {unit && <small>{unit}</small>}
        </span>
        {sub && <span className="faint xsmall">{sub}</span>}
      </div>
    </div>
  );
}

/** The primary call to action: start (or return to) a session. */
function StartArea() {
  const navigate = useNavigate();
  const { timer } = useRoom();
  const settings = useSettings();
  const templates = useCustomPresets().filter(isTemplate);
  useNow(timer.status === 'running', 1000);
  const env = environmentById(settings.environmentId);

  if (timer.status !== 'idle')
    return (
      <Link to="/room" className="dash-live">
        <span className={`live-pill__dot ${timer.status === 'paused' ? 'is-paused' : ''}`} />
        <span className="dash-live__time num">{formatClock(remainingMs(timer, Date.now()))}</span>
        <span className="dash-live__label">
          {timer.status === 'paused' ? 'Paused' : timer.phase === 'focus' ? 'Focusing' : 'On break'}
          <span className="faint"> · return to the room</span>
        </span>
        <ArrowRight size={18} />
      </Link>
    );

  const go = (focusMin: number, breakMin: number, presetId: string | null) => {
    updateSettings({ focusMin, breakMin, presetId });
    room.configure(focusMin, breakMin);
    room.start();
    navigate('/room');
  };

  return (
    <div className="dash-start">
      <button className="dash-start__main" onClick={() => go(settings.focusMin, settings.breakMin, settings.presetId)}>
        <span className="dash-start__icon">
          <Play size={18} fill="currentColor" />
        </span>
        <span className="dash-start__text">
          <strong>Start Lock-In</strong>
          <span>
            {settings.focusMin} min · {env.name}
          </span>
        </span>
      </button>
      <div className="dash-start__quick" role="group" aria-label="Quick start">
        {BUILT_IN_PRESETS.map((p) => (
          <button key={p.id} className="dash-quick" onClick={() => go(p.focusMin, p.breakMin, p.id)} title={`${p.focusMin} min focus, ${p.breakMin} min break`}>
            <span className="num">{p.focusMin}</span>
            <span>min</span>
          </button>
        ))}
        {templates.map((t) => (
          <button
            key={t.id}
            className="dash-quick dash-quick--template"
            title={`Start “${t.name}”: ${describe(t)}${t.lightsOff ? ' · Lights Off' : ''}`}
            onClick={() => {
              if (startTemplate(t, false)) navigate(t.lightsOff ? '/room?lights=off' : '/room');
            }}
          >
            {t.lightsOff && <Moon size={12} />}
            <span>{t.name}</span>
          </button>
        ))}
        <Link to="/room?panel=timer" className="dash-quick" title="Choose your own length">
          <SlidersHorizontal size={15} />
        </Link>
        <Link to="/room" className="link dash-start__enter">
          Enter the room
        </Link>
      </div>
    </div>
  );
}

/** Today's progress toward the daily goal, drawn as a dial with minute ticks. */
function TodayDial({ focusMs, goalMs, count }: { focusMs: number; goalMs: number; count: number }) {
  const ratio = goalMs ? Math.min(1, focusMs / goalMs) : 0;
  const done = focusMs >= goalMs && goalMs > 0;
  const r = 84;
  const c = 2 * Math.PI * r;
  const h = Math.floor(focusMs / 3_600_000);
  const m = Math.floor((focusMs % 3_600_000) / 60_000);
  return (
    <div className={`dial ${done ? 'is-done' : ''}`} role="img" aria-label={`Today: ${formatDuration(focusMs)} of a ${formatDuration(goalMs)} goal`}>
      <svg viewBox="0 0 220 220" aria-hidden>
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const major = i % 5 === 0;
          const r1 = major ? 100 : 102;
          return <line key={i} x1={110 + r1 * Math.cos(a)} y1={110 + r1 * Math.sin(a)} x2={110 + 106 * Math.cos(a)} y2={110 + 106 * Math.sin(a)} className={`dial__tick ${i / 60 < ratio ? 'is-lit' : ''} ${major ? 'is-major' : ''}`} />;
        })}
        <circle cx="110" cy="110" r={r} className="dial__track" />
        <circle cx="110" cy="110" r={r} className="dial__fill" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} transform="rotate(-90 110 110)" />
      </svg>
      <div className="dial__center">
        <span className="eyebrow">Today</span>
        <span className="dial__time num">
          {h}
          <small>h</small> {String(m).padStart(2, '0')}
          <small>m</small>
        </span>
        <span className="dial__goal">{done ? 'Goal reached' : `of ${formatDuration(goalMs)} goal`}</span>
        <span className="faint xsmall">
          {count} {count === 1 ? 'session' : 'sessions'}
        </span>
      </div>
    </div>
  );
}

function WeekChart({ days, goalMs, total }: { days: ReturnType<typeof currentWeekDays>; goalMs: number; total: number }) {
  const max = Math.max(goalMs, ...days.map((d) => d.focusMs), 1);
  return (
    <section className="card dash-week">
      <div className="card__head">
        <div>
          <span className="eyebrow">This week</span>
          <h2>Weekly rhythm</h2>
        </div>
        <span className="num muted">{formatDuration(total)}</span>
      </div>
      <div className="week" role="img" aria-label="Focus time per day this week">
        <span className="week__goal" style={{ bottom: `calc(26px + (100% - 26px) * ${goalMs / max})` }}>
          <em>goal</em>
        </span>
        {days.map((d) => (
          <div key={d.key} className={`week__day ${d.isToday ? 'is-today' : ''} ${d.isFuture ? 'is-future' : ''}`} title={`${new Date(d.t).toLocaleDateString(undefined, { weekday: 'long' })}: ${formatDuration(d.focusMs)}`}>
            <span className="week__val num">{d.focusMs ? formatDuration(d.focusMs) : ''}</span>
            <div className="week__track">
              <span style={{ height: `${(d.focusMs / max) * 100}%` }} />
            </div>
            <small>{new Date(d.t).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The locked achievement you're closest to, with how far there is to go. */
function NextAchievement({ sessions }: { sessions: Session[] }) {
  const { unlocks } = useUnlocks();
  const pick = useMemo(() => {
    const { unlocked, metrics } = unlockTimeline(sessions);
    const have = new Set([...unlocks.map((u) => u.id), ...unlocked.keys()]);
    const locked = ACHIEVEMENTS.filter((a) => !have.has(a.id));
    if (!locked.length) return null;
    const best = locked.reduce((b, a) => (progressOf(a, metrics).ratio > progressOf(b, metrics).ratio ? a : b), locked[0]);
    return { a: best, p: progressOf(best, metrics), label: progressLabel(best, metrics) };
  }, [sessions, unlocks]);

  return (
    <section className="dash-next">
      <span className="eyebrow">Next achievement</span>
      {pick ? (
        <>
          <div className="dash-next__body">
            <Badge achievement={pick.a} unlocked={false} size={76} />
            <div>
              <h2>{pick.a.name}</h2>
              <p className="muted small">{pick.a.description}</p>
            </div>
          </div>
          <div className="dash-next__progress">
            <div className="progress-bar">
              <i style={{ width: `${pick.p.ratio * 100}%` }} />
            </div>
            <div className="dash-next__meta">
              <span className="num">{pick.label}</span>
              <span className="num faint">{Math.round(pick.p.ratio * 100)}%</span>
            </div>
          </div>
          <Link to="/achievements" className="link small">
            See the collection
          </Link>
        </>
      ) : (
        <p className="muted">Every achievement is unlocked. Remarkable.</p>
      )}
    </section>
  );
}

function Recent({ sessions, subjects }: { sessions: Session[]; subjects: Subject[] }) {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return (
    <section className="dash-recent">
      <div className="section__head">
        <div>
          <span className="eyebrow">Recent</span>
          <h2>Latest sessions</h2>
        </div>
        <Link to="/reports" className="link small">
          All history
        </Link>
      </div>
      {sessions.length === 0 ? (
        <p className="empty">Your sessions will gather here. The first one is the hardest; make it a short one.</p>
      ) : (
        <ol className="timeline">
          {sessions.map((s) => {
            const subj = s.subjectId ? byId.get(s.subjectId) : undefined;
            return (
              <li key={s.id}>
                <span className="timeline__when num">
                  {relativeDay(s.startedAt)}
                  <span>{formatTimeOfDay(s.startedAt)}</span>
                </span>
                <span className="timeline__dot" style={{ background: subj?.color ?? 'var(--text-3)' }} />
                <span className="timeline__main">
                  <strong>{subj?.name ?? 'No subject'}</strong>
                  <span className="faint small">{s.task || s.reflection?.accomplished || (s.status === 'ended_early' ? 'Finished early' : 'Focus session')}</span>
                </span>
                <span className="timeline__dur num">{formatDuration(s.focusMs)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ParkedThoughts({ sessions }: { sessions: Session[] }) {
  const open = sessions.flatMap((s) => s.distractions.filter((d) => !d.done).map((d) => ({ d, s }))).sort((a, b) => b.d.createdAt - a.d.createdAt);
  if (!open.length) return null;
  const resolve = (s: Session, id: string) => sessionsRepo.patch(s.id, { distractions: s.distractions.map((d) => (d.id === id ? { ...d, done: true } : d)) });
  return (
    <section className="dash-parked">
      <div className="section__head">
        <div>
          <span className="eyebrow">Parked thoughts</span>
          <h2>{open.length} waiting</h2>
        </div>
      </div>
      <ul className="checklist">
        {open.slice(0, 6).map(({ d, s }) => (
          <li key={d.id}>
            <label>
              <input type="checkbox" onChange={() => void resolve(s, d.id)} />
              <span>{d.text}</span>
              <span className="faint xsmall">{relativeDay(d.createdAt)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
