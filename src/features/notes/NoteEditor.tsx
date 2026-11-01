import { useEffect, useState } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import type { Note, NoteStatus, Session } from '../../domain/types';
import { emptyNote, suggestionsFromSession } from '../../domain/notes';
import { dayKey, formatDuration, relativeDay } from '../../domain/time';
import { newRecord, notesRepo } from '../../data/repo';
import { confirmDialog, Segmented, toast } from '../../ui';
import { SubjectPicker } from '../room/SubjectPicker';

type Draft = Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

const toDraft = (n: Note): Draft => ({
  subjectId: n.subjectId,
  topic: n.topic,
  lastStudied: n.lastStudied,
  whereStopped: n.whereStopped,
  learnt: n.learnt,
  confused: n.confused,
  nextSteps: n.nextSteps,
  status: n.status,
});

/**
 * Create or edit a note. When opened from a just-finished session, empty fields are pre-filled
 * from the reflection; fields you've already written are never overwritten silently: the
 * suggestion is offered with an "Apply" button instead.
 */
export function NoteEditor({ note, session, defaultSubjectId, onClose }: { note: Note | null; session?: Session | null; defaultSubjectId?: string | null; onClose: () => void }) {
  const initial: Draft = note ? toDraft(note) : emptyNote(session?.subjectId ?? defaultSubjectId ?? null);
  const suggestion = session ? suggestionsFromSession(session) : null;

  const [draft, setDraft] = useState<Draft>(() => {
    if (!suggestion) return initial;
    return {
      ...initial,
      lastStudied: suggestion.lastStudied > initial.lastStudied ? suggestion.lastStudied : initial.lastStudied,
      whereStopped: initial.whereStopped || suggestion.whereStopped,
      nextSteps: initial.nextSteps || suggestion.nextSteps,
    };
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const pendingSuggestion =
    suggestion &&
    ((suggestion.whereStopped && draft.whereStopped !== suggestion.whereStopped) || (suggestion.nextSteps && draft.nextSteps !== suggestion.nextSteps));

  const close = async () => {
    if (dirty && !(await confirmDialog({ title: 'Discard your changes?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return;
    onClose();
  };

  const save = async () => {
    if (!draft.topic.trim()) {
      toast('Give the note a topic or chapter name.');
      return;
    }
    setSaving(true);
    try {
      const clean = { ...draft, topic: draft.topic.trim() };
      if (note) await notesRepo.put({ ...note, ...clean });
      else await notesRepo.put(newRecord(clean));
      toast(note ? 'Note updated' : 'Note created');
      onClose();
    } catch {
      toast("Couldn't save the note. Please try again.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note) return;
    if (await confirmDialog({ title: `Delete “${note.topic}”?`, body: 'This note will be removed.', confirmLabel: 'Delete note', danger: true })) {
      await notesRepo.remove(note.id);
      toast('Note deleted');
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
      <div className="modal note-editor" role="dialog" aria-modal aria-labelledby="note-editor-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="note-editor-title">{note ? 'Update note' : 'New study note'}</h2>

        {session && pendingSuggestion && (
          <div className="note-editor__suggest">
            <Sparkles size={16} />
            <div>
              <strong>From your session {relativeDay(session.startedAt).toLowerCase()} ({formatDuration(session.focusMs)})</strong>
              {suggestion!.whereStopped && <p className="small muted">Where you stopped: “{suggestion!.whereStopped}”</p>}
              {suggestion!.nextSteps && <p className="small muted">Next time: “{suggestion!.nextSteps}”</p>}
            </div>
            <button
              className="btn btn--sm"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  whereStopped: suggestion!.whereStopped || d.whereStopped,
                  nextSteps: suggestion!.nextSteps || d.nextSteps,
                  lastStudied: suggestion!.lastStudied,
                }))
              }
            >
              Apply
            </button>
          </div>
        )}

        <div className="stack">
          <div className="grid-2">
            <label className="field">
              <span>Subject</span>
              <SubjectPicker value={draft.subjectId} onChange={(id) => set('subjectId', id)} />
            </label>
            <label className="field">
              <span>Topic or chapter</span>
              <input className="input" autoFocus={!note} value={draft.topic} maxLength={120} placeholder="e.g. Functions" onChange={(e) => set('topic', e.target.value)} />
            </label>
          </div>
          <div className="note-editor__row">
            <label className="field">
              <span>Last studied</span>
              <div className="row">
                <input type="date" className="input" value={draft.lastStudied} max={dayKey(Date.now())} onChange={(e) => set('lastStudied', e.target.value || dayKey(Date.now()))} />
                <button className="btn btn--sm" onClick={() => set('lastStudied', dayKey(Date.now()))}>
                  Today
                </button>
              </div>
            </label>
            <div className="field">
              <span>Status</span>
              <Segmented<NoteStatus>
                label="Status"
                value={draft.status}
                onChange={(v) => set('status', v)}
                options={[
                  { value: 'in_progress', label: 'In progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
          </div>
          <label className="field">
            <span>Where I stopped</span>
            <textarea className="textarea" value={draft.whereStopped} onChange={(e) => set('whereStopped', e.target.value)} placeholder="e.g. Function parameters and return values" />
          </label>
          <label className="field">
            <span>What I've learnt</span>
            <textarea className="textarea" value={draft.learnt} onChange={(e) => set('learnt', e.target.value)} placeholder="e.g. How functions receive information and return results" />
          </label>
          <label className="field">
            <span>What I still don't understand</span>
            <textarea className="textarea" value={draft.confused} onChange={(e) => set('confused', e.target.value)} placeholder="Questions to ask, things to revisit" />
          </label>
          <label className="field">
            <span>Next time</span>
            <textarea className="textarea" value={draft.nextSteps} onChange={(e) => set('nextSteps', e.target.value)} placeholder="e.g. Combine multiple functions" />
          </label>
        </div>

        <div className="modal__actions note-editor__actions">
          {note && (
            <button className="btn btn--ghost btn--danger" onClick={() => void remove()}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <span className="faint small note-editor__hint">Ctrl+Enter to save</span>
          <button className="btn btn--ghost" onClick={() => void close()}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={() => void save()} disabled={saving}>
            {note ? 'Save changes' : 'Create note'}
          </button>
        </div>
      </div>
    </div>
  );
}
