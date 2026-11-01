import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Task, TaskPriority } from '../../domain/types';
import { dayKey, formatDuration, MINUTE } from '../../domain/time';
import { newRecord, tasksRepo } from '../../data/repo';
import { confirmDialog, Segmented, toast } from '../../ui';
import { SubjectPicker } from '../room/SubjectPicker';

type Draft = Pick<Task, 'title' | 'subjectId' | 'dueDate' | 'estimateMin' | 'priority'>;

const ESTIMATES = [25, 50, 90, 120, 180, 240];

/** Create or edit a planner task. */
export function TaskEditor({ task, initialTitle = '', onClose }: { task: Task | null; initialTitle?: string; onClose: (saved?: boolean) => void }) {
  const initial: Draft = task
    ? { title: task.title, subjectId: task.subjectId, dueDate: task.dueDate, estimateMin: task.estimateMin, priority: task.priority }
    : { title: initialTitle, subjectId: null, dueDate: null, estimateMin: null, priority: 'medium' };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const close = async () => {
    if (dirty && !(await confirmDialog({ title: 'Discard your changes?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return;
    onClose();
  };

  const save = async () => {
    const title = draft.title.trim();
    if (!title) {
      toast('Give the task a name.');
      return;
    }
    setSaving(true);
    try {
      const clean = { ...draft, title };
      if (task) await tasksRepo.put({ ...task, ...clean });
      else await tasksRepo.put(newRecord({ ...clean, done: false, completedAt: null }));
      toast(task ? 'Task updated' : 'Task added');
      onClose(true);
    } catch {
      toast("Couldn't save the task. Please try again.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!task) return;
    const ok = await confirmDialog({
      title: `Delete “${task.title}”?`,
      body: 'Sessions you studied for it keep their time and stay in your history.',
      confirmLabel: 'Delete task',
      danger: true,
    });
    if (ok) {
      await tasksRepo.remove(task.id);
      toast('Task deleted');
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        void close();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="overlay" onClick={() => void close()}>
      <div className="modal task-editor" role="dialog" aria-modal aria-labelledby="task-editor-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="task-editor-title">{task ? 'Edit task' : 'New task'}</h2>
        <div className="stack">
          <label className="field">
            <span>Task</span>
            <input
              className="input"
              autoFocus
              value={draft.title}
              maxLength={120}
              placeholder="e.g. Finish chapter 4 exercises"
              onChange={(e) => set('title', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Subject</span>
              <SubjectPicker value={draft.subjectId} onChange={(id) => set('subjectId', id)} />
            </label>
            <label className="field">
              <span>Deadline</span>
              <div className="row">
                <input type="date" className="input" value={draft.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} />
                {draft.dueDate ? (
                  <button className="btn btn--sm btn--ghost" onClick={() => set('dueDate', null)}>
                    Clear
                  </button>
                ) : (
                  <button className="btn btn--sm" onClick={() => set('dueDate', dayKey(Date.now()))}>
                    Today
                  </button>
                )}
              </div>
            </label>
          </div>
          <div className="field">
            <span>Estimated time</span>
            <div className="task-editor__estimate">
              <div className="row">
                <input
                  type="number"
                  className="input"
                  min={5}
                  max={6000}
                  step={5}
                  placeholder="minutes"
                  aria-label="Estimated minutes"
                  value={draft.estimateMin ?? ''}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value));
                    set('estimateMin', e.target.value && v > 0 ? Math.min(6000, v) : null);
                  }}
                />
                <span className="faint small task-editor__as">{draft.estimateMin ? `min = ${formatDuration(draft.estimateMin * MINUTE)}` : 'min (optional)'}</span>
              </div>
              <div className="task-editor__chips" role="group" aria-label="Common estimates">
                {ESTIMATES.map((m) => (
                  <button key={m} type="button" className="chip" aria-pressed={draft.estimateMin === m} onClick={() => set('estimateMin', m)}>
                    {formatDuration(m * MINUTE)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <span>Priority</span>
            <Segmented<TaskPriority>
              label="Priority"
              value={draft.priority}
              onChange={(v) => set('priority', v)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
        </div>
        <div className="modal__actions task-editor__actions">
          {task && (
            <button className="btn btn--ghost btn--danger" onClick={() => void remove()}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <span className="task-editor__spacer" />
          <button className="btn btn--ghost" onClick={() => void close()}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={() => void save()} disabled={saving}>
            {task ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  );
}
