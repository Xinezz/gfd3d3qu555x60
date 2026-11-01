import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Flame, Play, SlidersHorizontal, Target } from 'lucide-react';
import type { Note, Session, Subject } from '../../domain/types';
import { filterNotes } from '../../domain/notes';
import { BUILT_IN_PRESETS } from '../../domain/presets';
import { currentWeekDays, monthFocusMs, recentSessions, streaks, todayStats, totalFocusMs, weekFocusMs } from '../../domain/stats';
import { milestoneProgress } from '../../domain/milestones';
import { formatClock, formatDuration, formatHours, formatTimeOfDay, MINUTE, relativeDay } from '../../domain/time';
import { remainingMs } from '../../domain/timer';
import { useAllSubjects, useNotes, useSessions } from '../../data/hooks';
import { sessionsRepo } from '../../data/repo';
import { updateSettings, useSettings } from '../../data/settings';
import { useNow } from '../../ui';
import { room, useRoom } from '../session/sessionStore';
import './dashboard.css';

function greeting(h: number) {
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { sessions, loading } = useSessions();
  const subjects = useAllSubjects();
  const { notes } = useNotes();
  const settings = useSettings();
  const now = useNow(true, 60_000);

  const stats = useMemo(() => {
    const today = todayStats(sessions, now);
    return {
      today,
      streak: streaks(sessions, now),
      week: weekFocusMs(sessions, now),
      month: monthFocusMs(sessions, now),
      total: totalFocusMs(sessions),
      days: currentWeekDays(sessions, now),
      recent: recentSessions(sessions, 5),
    };
  }, [sessions, now]);

  const goalMs = settings.dailyGoalMin * MINUTE;
  const line =
    stats.today.focusMs >= goalMs
      ? 'Daily goal reached. Anything more is a bonus.'
      : stats.today.count > 0
        ? 'Good momentum today. Keep the rhythm going.'
        : stats.streak.current > 0
          ? `Keep your ${stats.streak.current}-day streak alive today.`
          : 'A quiet room is waiting for you.';

  return (
    <div className="page dashboard">
      <header className="dash-hero">
        <div>
          <p className="eyebrow">{new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting(new Date(now).getHours())}</h1>
          <p className="muted">{line}</p>
        </div>
        <LiveOrEnter />
      </header>

      <div className={`dash-grid ${loading ? 'is-loading' : ''}`}>
        <TodayCard focusMs={stats.today.focusMs} count={stats.today.count} goalMs={goalMs} streak={stats.streak} />
        <QuickStart />
        <ProgressCard week={stats.week} month={stats.month} total={stats.total} days={stats.days} goalMs={goalMs} />
        <RecentCard sessions={stats.recent} subjects={subjects} />
        <ContinueCard notes={notes} subjects={subjects} />
        <ParkedThoughts sessions={sessions} />
      </div>
    </div>
  );
}

function LiveOrEnter() {
  const { timer } = useRoom();
  useNow(timer.status === 'running', 1000);
  if (timer.status === 'idle')
    return (
      <Link to="/room" className="btn btn--primary btn--lg">
        Enter the Lock-In Room <ArrowRight size={18} />
      </Link>
    );
  return (
    <Link to="/room" className="dash-live">
      <span className={`live-pill__dot ${timer.status === 'paused' ? 'is-paused' : ''}`} />
      <span className="dash-live__time num">{formatClock(remainingMs(timer, Date.now()))}</span>
      <span className="faint small">{timer.status === 'paused' ? 'Paused' : timer.phase === 'focus' ? 'Focusing' : 'On break'} · return to room</span>
    </Link>
  );
}

function GoalRing({ ratio }: { ratio: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const done = ratio >= 1;
  return (
    <svg viewBox="0 0 132 132" className={`goal-ring ${done ? 'is-done' : ''}`} aria-hidden>
      <circle cx="66" cy="66" r={r} className="goal-ring__track" />
      <circle cx="66" cy="66" r={r} className="goal-ring__fill" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, ratio))} transform="rotate(-90 66 66)" />
    </svg>
  );
}

function TodayCard({ focusMs, count, goalMs, streak }: { focusMs: number; count: number; goalMs: number; streak: { current: number; best: number } }) {
  const ratio = goalMs ? focusMs / goalMs : 0;
  const left = goalMs - focusMs;
  return (
    <section className="card today-card">
      <div className="card__head">
        <h2>Today</h2>
        <Link to="/settings" className="small faint">
          Goal {formatDuration(goalMs)}
        </Link>
      </div>
      <div className="today-card__body">
        <div className="today-card__ring">
          <GoalRing ratio={ratio} />
          <div className="today-card__ring-text">
            <span className="today-card__time num">{formatDuration(focusMs)}</span>
            <span className="faint small">{Math.round(Math.min(ratio, 9.99) * 100)}% of goal</span>
          </div>
        </div>
        <dl className="today-card__stats">
          <div>
            <dt><Target size={15} /> Sessions</dt>
            <dd className="num">{count}</dd>
          </div>
          <div>
            <dt><Flame size={15} /> Streak</dt>
            <dd className="num">
              {streak.current} {streak.current === 1 ? 'day' : 'days'}
              <small className="faint"> · best {streak.best}</small>
            </dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{left > 0 ? `${formatDuration(left)} to go` : 'Reached ✓'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function QuickStart() {
  const navigate = useNavigate();
  const { timer } = useRoom();
  const busy = timer.status !== 'idle';
  const go = (focusMin: number, breakMin: number, presetId: string) => {
    updateSettings({ focusMin, breakMin, presetId });
    room.configure(focusMin, breakMin);
    room.start();
    navigate('/room');
  };
  return (
    <section className="card quick-card">
      <div className="card__head">
        <h2>Quick start</h2>
        {busy && <span className="small faint">A session is in progress</span>}
      </div>
      <div className="quick-grid">
        {BUILT_IN_PRESETS.map((p) => (
          <button key={p.id} className="quick" disabled={busy} onClick={() => go(p.focusMin, p.breakMin, p.id)}>
            <span className="quick__min num">{p.focusMin}</span>
            <span className="quick__unit">min focus</span>
            <span className="quick__sub">
              {p.breakMin} min break <Play size={12} />
            </span>
          </button>
        ))}
        <Link to="/room?panel=timer" className="quick quick--custom">
          <SlidersHorizontal size={22} strokeWidth={1.6} />
          <span className="quick__unit">Custom</span>
          <span className="quick__sub">Your own length</span>
        </Link>
      </div>
    </section>
  );
}

function ProgressCard({ week, month, total, days, goalMs }: { week: number; month: number; total: number; days: ReturnType<typeof currentWeekDays>; goalMs: number }) {
  const max = Math.max(goalMs, ...days.map((d) => d.focusMs), 1);
  const m = milestoneProgress(total);
  return (
    <section className="card progress-card">
      <div className="card__head">
        <h2>Progress</h2>
      </div>
      <div className="progress-card__totals">
        <div>
          <span className="eyebrow">This week</span>
          <strong className="num">{formatDuration(week)}</strong>
        </div>
        <div>
          <span className="eyebrow">This month</span>
          <strong className="num">{formatDuration(month)}</strong>
        </div>
        <div>
          <span className="eyebrow">All time</span>
          <strong className="num">{formatHours(total)}h</strong>
        </div>
      </div>
      <div className="week-bars" role="img" aria-label="Focus time per day this week">
        <i className="week-bars__goal" style={{ bottom: `calc(22px + (100% - 22px) * ${goalMs / max})` }} title="Daily goal" />
        {days.map((d) => (
          <div key={d.key} className={`week-bars__day ${d.isToday ? 'is-today' : ''}`} title={`${formatDuration(d.focusMs)}`}>
            <div className="week-bars__track">
              <span style={{ height: `${(d.focusMs / max) * 100}%` }} />
            </div>
            <small>{new Date(d.t).toLocaleDateString(undefined, { weekday: 'narrow' })}</small>
          </div>
        ))}
      </div>
      <div className="milestone">
        {m.next ? (
          <>
            <div className="milestone__row">
              <span>
                <span className="faint small">Next milestone · </span>
                <Link to="/achievements">{m.next.name}</Link>
              </span>
              <span className="small faint num">
                {formatHours(total)} / {formatHours(m.next.thresholdMs)}h
              </span>
            </div>
            <div className="progress-bar">
              <i style={{ width: `${m.ratio * 100}%` }} />
            </div>
          </>
        ) : (
          <p>All hour milestones reached. 1,000 hours. Extraordinary.</p>
        )}
      </div>
    </section>
  );
}

function RecentCard({ sessions, subjects }: { sessions: Session[]; subjects: Subject[] }) {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return (
    <section className="card recent-card">
      <div className="card__head">
        <h2>Recent activity</h2>
      </div>
      {sessions.length === 0 ? (
        <p className="empty">Your completed sessions will appear here. The first one is the hardest. Start small.</p>
      ) : (
        <ul className="recent">
          {sessions.map((s) => {
            const subj = s.subjectId ? byId.get(s.subjectId) : undefined;
            return (
              <li key={s.id}>
                <span className="dot" style={{ background: subj?.color ?? 'var(--text-3)' }} />
                <div className="recent__main">
                  <span className="recent__title">{subj?.name ?? 'No subject'}</span>
                  <span className="recent__task faint small">{s.task || s.reflection?.accomplished || (s.status === 'ended_early' ? 'Finished early' : 'Focus session')}</span>
                </div>
                <div className="recent__meta">
                  <span className="num">{formatDuration(s.focusMs)}</span>
                  <span className="faint small">
                    {relativeDay(s.startedAt)} · {formatTimeOfDay(s.startedAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The latest in-progress topics, so you can see where you stopped before you start. */
function ContinueCard({ notes, subjects }: { notes: Note[]; subjects: Subject[] }) {
  const open = filterNotes(notes, { status: 'in_progress' }).slice(0, 3);
  if (!open.length) return null;
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return (
    <section className="card continue-card">
      <div className="card__head">
        <h2>Pick up where you left off</h2>
        <Link to="/notes" className="small faint">
          All notes
        </Link>
      </div>
      <div className="continue">
        {open.map((n) => {
          const subj = n.subjectId ? byId.get(n.subjectId) : undefined;
          return (
            <Link key={n.id} to={`/notes?subject=${n.subjectId ?? 'none'}`} className="continue__item">
              <span className="chip">
                <span className="dot" style={{ background: subj?.color ?? 'var(--text-3)' }} />
                {subj?.name ?? 'No subject'}
              </span>
              <strong>{n.topic}</strong>
              <span className="muted small">{n.nextSteps || n.whereStopped || 'No next step written yet'}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ParkedThoughts({ sessions }: { sessions: Session[] }) {
  const open = sessions.flatMap((s) => s.distractions.filter((d) => !d.done).map((d) => ({ d, s }))).sort((a, b) => b.d.createdAt - a.d.createdAt);
  if (!open.length) return null;
  const resolve = (s: Session, id: string) => sessionsRepo.patch(s.id, { distractions: s.distractions.map((d) => (d.id === id ? { ...d, done: true } : d)) });
  return (
    <section className="card parked-card">
      <div className="card__head">
        <h2>Parked thoughts</h2>
        <span className="small faint">{open.length} waiting</span>
      </div>
      <ul className="thought-list thought-list--review">
        {open.slice(0, 8).map(({ d, s }) => (
          <li key={d.id}>
            <label>
              <input type="checkbox" onChange={() => void resolve(s, d.id)} />
              <span>{d.text}</span>
              <span className="faint small" style={{ marginLeft: 'auto' }}>{relativeDay(d.createdAt)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
