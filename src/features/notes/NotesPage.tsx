import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, CircleDashed, HelpCircle, Plus, Search } from 'lucide-react';
import type { Note, NoteStatus } from '../../domain/types';
import { filterNotes } from '../../domain/notes';
import { formatDate } from '../../domain/time';
import { useAllSubjects, useNotes, useSubjects } from '../../data/hooks';
import { notesRepo, sessionsRepo } from '../../data/repo';
import { Segmented, toast } from '../../ui';
import { NoteEditor } from './NoteEditor';
import './notes.css';

type Editing = { note: Note | null } | null;

const dateOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return formatDate(new Date(y, m - 1, d).getTime(), { day: 'numeric', month: 'long', year: 'numeric' });
};

export function NotesPage() {
  const { notes, loading } = useNotes();
  const subjects = useSubjects();
  const allSubjects = useAllSubjects();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState(params.get('subject') ?? '');
  const [status, setStatus] = useState<NoteStatus | 'all'>('all');
  const [editing, setEditing] = useState<Editing>(null);

  // Arriving from a finished session (?session=id): pick a topic to update, or start a new one.
  const sessionId = params.get('session');
  const session = useLiveQuery(() => (sessionId ? sessionsRepo.get(sessionId) : undefined), [sessionId]);
  const [choosing, setChoosing] = useState(false);
  useEffect(() => {
    if (!sessionId || !session || loading) return;
    const candidates = notes.filter((n) => n.subjectId === session.subjectId && n.status === 'in_progress');
    if (candidates.length) setChoosing(true);
    else setEditing({ note: null });
    // Runs once on arrival, not on every note edit.
  }, [sessionId, session?.id, loading]);

  const endSessionFlow = () => {
    setChoosing(false);
    setEditing(null);
    if (sessionId) setParams({}, { replace: true });
  };

  const byId = useMemo(() => new Map(allSubjects.map((s) => [s.id, s])), [allSubjects]);
  const visible = useMemo(
    () => filterNotes(notes, { query, subjectId: subjectId || undefined, status: status === 'all' ? undefined : status }, (id) => (id ? byId.get(id)?.name ?? '' : '')),
    [notes, query, subjectId, status, byId],
  );
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.subjectId ?? 'none', (m.get(n.subjectId ?? 'none') ?? 0) + 1);
    return m;
  }, [notes]);

  const toggleStatus = async (n: Note) => {
    const next: NoteStatus = n.status === 'completed' ? 'in_progress' : 'completed';
    await notesRepo.patch(n.id, { status: next });
    toast(next === 'completed' ? `“${n.topic}” marked completed` : `“${n.topic}” back in progress`);
  };

  const sessionCandidates = session ? filterNotes(notes, { subjectId: session.subjectId ?? 'none', status: 'in_progress' }) : [];

  return (
    <div className="page notes">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your learning progress</p>
          <h1>Study Notes</h1>
          <p className="muted">One page per topic: where you stopped, what you've learnt, what's still unclear, and what comes next.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setEditing({ note: null })}>
          <Plus size={16} /> New note
        </button>
      </header>

      <div className="notes__layout">
        <aside className="notes__index" aria-label="Subjects">
          <span className="eyebrow">Subjects</span>
          <div className="subject-chips" role="group" aria-label="Filter by subject">
            <button className={`subject-chip ${!subjectId ? 'is-active' : ''}`} onClick={() => setSubjectId('')} aria-pressed={!subjectId}>
              <span className="subject-chip__name">All topics</span>
              <span className="subject-chip__count num">{notes.length}</span>
            </button>
            {subjects.map((s) => {
              const total = counts.get(s.id) ?? 0;
              const done = notes.filter((n) => n.subjectId === s.id && n.status === 'completed').length;
              return (
                <button key={s.id} className={`subject-chip ${subjectId === s.id ? 'is-active' : ''}`} onClick={() => setSubjectId(s.id)} aria-pressed={subjectId === s.id}>
                  <span className="dot" style={{ background: s.color }} />
                  <span className="subject-chip__name">{s.name}</span>
                  <span className="subject-chip__count num" title={`${done} of ${total} topics completed`}>
                    {done}/{total}
                  </span>
                  {total > 0 && (
                    <span className="subject-chip__bar" aria-hidden>
                      <i style={{ width: `${(done / total) * 100}%`, background: s.color }} />
                    </span>
                  )}
                </button>
              );
            })}
            {counts.has('none') && (
              <button className={`subject-chip ${subjectId === 'none' ? 'is-active' : ''}`} onClick={() => setSubjectId('none')} aria-pressed={subjectId === 'none'}>
                <span className="subject-chip__name">No subject</span>
                <span className="subject-chip__count num">{counts.get('none')}</span>
              </button>
            )}
          </div>
        </aside>

        <div className="notes__main">
          <div className="notes__toolbar">
            <label className="notes__search">
              <Search size={16} aria-hidden />
              <input className="input" type="search" placeholder="Search topics, what you learnt, questions…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search notes" />
            </label>
            <Segmented
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'All' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>

          {!loading && notes.length === 0 ? (
            <section className="card notes__empty">
              <h2>Your study notebook is empty</h2>
              <p className="muted">
                Keep one note per topic or chapter: where you stopped, what you've learnt, what's still unclear, and what to do next. After each session you can update the
                right note in a few seconds.
              </p>
              <button className="btn btn--primary" onClick={() => setEditing({ note: null })}>
                <Plus size={16} /> Write your first note
              </button>
            </section>
          ) : visible.length === 0 && !loading ? (
            <p className="empty">No notes match. Try a different search or filter.</p>
          ) : (
            <div className="note-grid">
              {visible.map((n) => {
                const subj = n.subjectId ? byId.get(n.subjectId) : undefined;
                return (
                  <article key={n.id} className={`note-card ${n.status === 'completed' ? 'is-done' : ''}`} style={{ ['--subject' as string]: subj?.color ?? 'var(--text-3)' }}>
                    <button className="note-card__open" onClick={() => setEditing({ note: n })} aria-label={`Open ${n.topic}`} />
                    <div className="note-card__top">
                      <span className="note-card__subject">{subj?.name ?? 'No subject'}</span>
                      <button className="note-card__status" onClick={() => void toggleStatus(n)} title={n.status === 'completed' ? 'Mark in progress' : 'Mark completed'} aria-pressed={n.status === 'completed'}>
                        {n.status === 'completed' ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                        <span>{n.status === 'completed' ? 'Completed' : 'In progress'}</span>
                      </button>
                    </div>
                    <h3>{n.topic}</h3>
                    <p className="note-card__date num">Last studied {dateOf(n.lastStudied)}</p>
                    {n.whereStopped && (
                      <div className="note-card__field">
                        <span>Where I stopped</span>
                        <p>{n.whereStopped}</p>
                      </div>
                    )}
                    {n.nextSteps && n.status !== 'completed' && (
                      <div className="note-card__field note-card__next">
                        <span>Next time</span>
                        <p>{n.nextSteps}</p>
                      </div>
                    )}
                    {n.confused && (
                      <p className="note-card__confused small">
                        <HelpCircle size={14} /> Open questions
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {choosing && session && (
        <div className="overlay" onClick={endSessionFlow}>
          <div className="modal" role="dialog" aria-modal aria-labelledby="choose-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="choose-title">Which topic did you work on?</h2>
            <p className="muted small" style={{ marginTop: 6 }}>
              Your reflection will be offered as an update to the note you pick.
            </p>
            <ul className="choose-list">
              {sessionCandidates.map((n) => (
                <li key={n.id}>
                  <button
                    className="option option--row"
                    onClick={() => {
                      setChoosing(false);
                      setEditing({ note: n });
                    }}
                  >
                    <span>
                      <span className="option__name">{n.topic}</span>
                      <span className="option__sub">Last studied {dateOf(n.lastStudied)}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  className="option option--row"
                  onClick={() => {
                    setChoosing(false);
                    setEditing({ note: null });
                  }}
                >
                  <Plus size={18} />
                  <span className="option__name">A new topic</span>
                </button>
              </li>
            </ul>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={endSessionFlow}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <NoteEditor
          key={editing.note?.id ?? 'new'}
          note={editing.note}
          session={sessionId ? session : null}
          defaultSubjectId={subjectId && subjectId !== 'none' ? subjectId : null}
          onClose={endSessionFlow}
        />
      )}
    </div>
  );
}
