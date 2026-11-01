import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Play } from 'lucide-react';
import type { Note, Session, Subject, Task } from '../../domain/types';
import { dueInfo, ongoingSubjects, sortTasks, taskProgress } from '../../domain/planner';
import { formatDuration } from '../../domain/time';
import { useStudy } from '../session/useStudy';

const dayLabel = (key: string, now: number) => {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(y, m - 1, d).getTime();
  const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - t) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** One card per subject you're in the middle of, with a button straight back into the room. */
export function ContinueStudying({ subjects, notes, sessions, now }: { subjects: Subject[]; notes: Note[]; sessions: Session[]; now: number }) {
  const study = useStudy();
  const list = useMemo(() => ongoingSubjects(subjects, notes, sessions, now, 3), [subjects, notes, sessions, now]);
  if (!list.length) return null;
  return (
    <section className="dash-continue">
      <div className="section__head">
        <div>
          <span className="eyebrow">Continue where you left off</span>
          <h2>Pick it back up</h2>
        </div>
        <Link to="/notes" className="link small">
          Study notes
        </Link>
      </div>
      <div className="dash-continue__grid">
        {list.map((o) => (
          <article key={o.subject.id} className="cont-card" style={{ '--subject': o.subject.color } as CSSProperties}>
            <header className="cont-card__head">
              <span className="cont-card__subject">
                <span className="dot" style={{ background: o.subject.color }} />
                {o.subject.name}
              </span>
              {o.lastStudied && <span className="faint xsmall">{dayLabel(o.lastStudied, now)}</span>}
            </header>
            <h3 className="cont-card__topic">{o.topic || <span className="faint">No topic yet</span>}</h3>
            <dl className="cont-card__rows">
              {o.whereStopped && (
                <div>
                  <dt>Stopped at</dt>
                  <dd>{o.whereStopped}</dd>
                </div>
              )}
              {o.learnt && (
                <div>
                  <dt>Learnt</dt>
                  <dd>{o.learnt}</dd>
                </div>
              )}
              <div className="cont-card__next">
                <dt>Next</dt>
                <dd>{o.next || <span className="faint">Not written yet</span>}</dd>
              </div>
            </dl>
            <footer className="cont-card__foot">
              <button className="btn btn--sm btn--primary" onClick={() => study({ subjectId: o.subject.id, task: o.topic, taskId: null })}>
                <Play size={12} fill="currentColor" /> Continue studying
              </button>
              <Link to={`/notes?subject=${o.subject.id}`} className="cont-card__notes" aria-label={`${o.subject.name} notes`}>
                Notes <ArrowUpRight size={13} />
              </Link>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The next few planner tasks, so you can start one from home. */
export function UpNext({ tasks, subjects, sessions, now }: { tasks: Task[]; subjects: Subject[]; sessions: Session[]; now: number }) {
  const study = useStudy();
  const open = useMemo(() => sortTasks(tasks).filter((t) => !t.done), [tasks]);
  if (!open.length) return null;
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return (
    <section className="dash-upnext">
      <div className="section__head">
        <div>
          <span className="eyebrow">Planner</span>
          <h2>Up next</h2>
        </div>
        <Link to="/planner" className="link small">
          {open.length > 3 ? `All ${open.length} tasks` : 'Planner'}
        </Link>
      </div>
      <ul className="upnext">
        {open.slice(0, 3).map((t) => {
          const subj = t.subjectId ? byId.get(t.subjectId) : undefined;
          const due = dueInfo(t.dueDate, now);
          const p = taskProgress(t, sessions);
          return (
            <li key={t.id}>
              <span className="dot" style={{ background: subj?.color ?? 'var(--text-3)' }} />
              <span className="upnext__main">
                <strong>{t.title}</strong>
                <span className="faint xsmall">
                  {t.dueDate && <span className={`task__due is-${due.state}`}>{due.label}</span>}
                  {t.dueDate && (p.spentMs > 0 || p.estimateMs) ? ' · ' : ''}
                  {p.estimateMs ? `${formatDuration(p.spentMs)} of ${formatDuration(p.estimateMs)}` : p.spentMs > 0 ? `${formatDuration(p.spentMs)} so far` : ''}
                </span>
              </span>
              <button className="icon-btn icon-btn--ghost" onClick={() => study({ subjectId: t.subjectId, task: t.title, taskId: t.id })} aria-label={`Study “${t.title}”`} title="Study this">
                <Play size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
