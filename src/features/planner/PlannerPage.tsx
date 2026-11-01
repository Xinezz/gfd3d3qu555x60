import { useMemo, useState } from 'react';
import { Play, Plus } from 'lucide-react';
import type { Session, Subject, Task } from '../../domain/types';
import { dueInfo, sortTasks, taskProgress } from '../../domain/planner';
import { formatDuration, relativeDay } from '../../domain/time';
import { useAllSubjects, useSessions, useTasks } from '../../data/hooks';
import { newRecord, tasksRepo } from '../../data/repo';
import { Segmented, toast, useNow } from '../../ui';
import { room } from '../session/sessionStore';
import { useStudy } from '../session/useStudy';
import { Goals } from './Goals';
import { TaskEditor } from './TaskEditor';
import './planner.css';

type View = 'open' | 'done';

export function PlannerPage() {
  const { tasks, loading } = useTasks();
  const { sessions } = useSessions();
  const subjects = useAllSubjects();
  const now = useNow(true, 60_000);
  const [view, setView] = useState<View>('open');
  const [editing, setEditing] = useState<{ task: Task | null; title?: string } | null>(null);
  const [quick, setQuick] = useState('');

  const sorted = useMemo(() => sortTasks(tasks), [tasks]);
  const open = sorted.filter((t) => !t.done);
  const done = sorted.filter((t) => t.done);
  const list = view === 'open' ? open : done;
  const urgent = open.filter((t) => ['overdue', 'today'].includes(dueInfo(t.dueDate, now).state)).length;
  const byId = new Map(subjects.map((s) => [s.id, s]));

  const quickAdd = async () => {
    const title = quick.trim();
    if (!title) return;
    setQuick('');
    setView('open');
    await tasksRepo.put(newRecord({ title, subjectId: null, dueDate: null, estimateMin: null, priority: 'medium' as const, done: false, completedAt: null }));
  };

  return (
    <div className={`page planner ${loading ? 'is-loading' : ''}`}>
      <header className="page-head">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>Planner</h1>
          <p className="muted">What you need to study and how much you mean to. Start a session from any task and its time counts toward it.</p>
        </div>
      </header>

      <div className="planner__layout">
        <section className="planner__tasks">
          <div className="section__head">
            <div>
              <span className="eyebrow">{open.length ? `${open.length} to do${urgent ? ` · ${urgent} due now` : ''}` : 'Tasks'}</span>
              <h2>Your tasks</h2>
            </div>
            <Segmented<View>
              label="Show"
              value={view}
              onChange={setView}
              options={[
                { value: 'open', label: `To do${open.length ? ` ${open.length}` : ''}` },
                { value: 'done', label: `Done${done.length ? ` ${done.length}` : ''}` },
              ]}
            />
          </div>

          <div className="task-add">
            <Plus size={16} className="task-add__icon" />
            <input
              className="input"
              placeholder="Add a task and press Enter"
              aria-label="New task"
              maxLength={120}
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void quickAdd()}
            />
            <button className="btn btn--sm" onClick={() => setEditing({ task: null, title: quick.trim() })}>
              Add with details
            </button>
          </div>

          {list.length === 0 ? (
            <p className="empty">
              {view === 'open'
                ? done.length
                  ? 'Everything is done. Add what comes next when you know it.'
                  : 'No tasks yet. Add what you need to study: an assignment, a chapter, revision for a test.'
                : 'Completed tasks will be kept here.'}
            </p>
          ) : (
            <ul className="task-list">
              {list.map((t) => (
                <TaskRow key={t.id} task={t} subject={t.subjectId ? byId.get(t.subjectId) : undefined} sessions={sessions} now={now} onEdit={() => setEditing({ task: t })} />
              ))}
            </ul>
          )}
        </section>

        <aside className="planner__side">
          <Goals sessions={sessions} />
        </aside>
      </div>

      {editing && (
        <TaskEditor
          task={editing.task}
          initialTitle={editing.title}
          onClose={(saved) => {
            if (saved && !editing.task) setQuick('');
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TaskRow({ task, subject, sessions, now, onEdit }: { task: Task; subject?: Subject; sessions: Session[]; now: number; onEdit: () => void }) {
  const study = useStudy();
  const p = useMemo(() => taskProgress(task, sessions), [task, sessions]);
  const due = dueInfo(task.dueDate, now);

  const toggle = async () => {
    const nowDone = !task.done;
    await tasksRepo.patch(task.id, { done: nowDone, completedAt: nowDone ? Date.now() : null });
    if (nowDone) room.releaseTask(task.id, task.title);
    toast(nowDone ? `Completed “${task.title}”` : `“${task.title}” is back on your list`);
  };

  return (
    <li className={`task task--${task.priority} ${task.done ? 'is-done' : ''}`}>
      <input type="checkbox" className="task__check" checked={task.done} onChange={() => void toggle()} aria-label={task.done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`} />
      <button className="task__main" onClick={onEdit} aria-label={`Edit “${task.title}”`}>
        <span className="task__title">{task.title}</span>
        <span className="task__meta">
          {subject && (
            <span className="task__subject">
              <span className="dot" style={{ background: subject.color }} />
              {subject.name}
            </span>
          )}
          {task.done && task.completedAt ? (
            <span>Completed {relativeDay(task.completedAt, now).replace(/^(Today|Yesterday)$/, (m) => m.toLowerCase())}</span>
          ) : (
            task.dueDate && <span className={`task__due is-${due.state}`}>{due.label}</span>
          )}
          {task.priority !== 'medium' && <span className="task__prio">{task.priority === 'high' ? 'High priority' : 'Low priority'}</span>}
        </span>
        {(p.estimateMs || p.spentMs > 0) && (
          <span className="task__progress">
            {p.estimateMs && (
              <span className="progress-bar">
                <i style={{ width: `${(p.ratio ?? 0) * 100}%` }} />
              </span>
            )}
            <span className="num faint xsmall">
              {p.spentMs ? formatDuration(p.spentMs) : '0m'}
              {p.estimateMs ? ` of ${formatDuration(p.estimateMs)}` : ' studied'}
              {p.sessions > 0 && ` · ${p.sessions} ${p.sessions === 1 ? 'session' : 'sessions'}`}
            </span>
          </span>
        )}
      </button>
      {!task.done && (
        <button className="btn btn--sm task__study" onClick={() => study({ subjectId: task.subjectId, task: task.title, taskId: task.id })} aria-label={`Study “${task.title}”`}>
          <Play size={12} fill="currentColor" /> Study
        </button>
      )}
    </li>
  );
}
