import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, X } from 'lucide-react';
import { dueInfo, sortTasks, taskProgress } from '../../domain/planner';
import { formatDuration } from '../../domain/time';
import { useAllSubjects, useSessions, useTasks } from '../../data/hooks';
import { room } from '../session/sessionStore';

/** Button + popover in the room's context bar: pick one of your open planner tasks. */
export function TaskPickerButton({ taskId }: { taskId: string | null }) {
  const { tasks } = useTasks();
  const subjects = useAllSubjects();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(() => sortTasks(tasks).filter((t) => !t.done), [tasks]);
  const byId = new Map(subjects.map((s) => [s.id, s]));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Handled here so the room's own Escape shortcuts ignore it.
      e.preventDefault();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className="task-pick" ref={ref}>
      <button className={`task-pick__btn ${taskId ? 'is-linked' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox" title="Choose a planner task" aria-label="Choose a planner task">
        <ListChecks size={17} />
      </button>
      {open && (
        <div className="task-pick__pop" role="listbox" aria-label="Planner tasks">
          <span className="eyebrow">From your planner</span>
          {list.length === 0 ? (
            <p className="faint small">
              No open tasks.{' '}
              <Link to="/planner" className="link">
                Add some in the Planner
              </Link>
            </p>
          ) : (
            <ul>
              {list.map((t) => {
                const subj = t.subjectId ? byId.get(t.subjectId) : undefined;
                const due = dueInfo(t.dueDate);
                return (
                  <li key={t.id}>
                    <button
                      role="option"
                      aria-selected={t.id === taskId}
                      onClick={() => {
                        room.setContext({ subjectId: t.subjectId, task: t.title, taskId: t.id });
                        setOpen(false);
                      }}
                    >
                      <strong>{t.title}</strong>
                      <span className="task-pick__meta">
                        {subj && (
                          <span>
                            <span className="dot" style={{ background: subj.color }} />
                            {subj.name}
                          </span>
                        )}
                        {t.dueDate && <span className={`task__due is-${due.state}`}>{due.label}</span>}
                        {t.priority === 'high' && <span className="task-pick__high">High priority</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** "Counts toward …" line under the context bar, with the task's progress so far. */
export function LinkedTask({ taskId, editable }: { taskId: string | null; editable: boolean }) {
  const { tasks } = useTasks();
  const { sessions } = useSessions();
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  if (!task) return null;
  const p = taskProgress(task, sessions);
  return (
    <p className="room__linked">
      <ListChecks size={14} />
      <span>
        Counts toward <strong>{task.title}</strong>
        <span className="num">
          {' '}
          · {formatDuration(p.spentMs)}
          {p.estimateMs ? ` of ${formatDuration(p.estimateMs)}` : ' so far'}
        </span>
      </span>
      {editable && (
        <button className="room__unlink" onClick={() => room.setContext({ taskId: null })} aria-label="Don't count this session toward the task" title="Unlink task">
          <X size={13} />
        </button>
      )}
    </p>
  );
}
