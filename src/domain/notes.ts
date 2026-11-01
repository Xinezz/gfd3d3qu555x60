import type { Note, NoteStatus, Session } from './types';
import { dayKey } from './time';

export interface NoteFilter {
  query?: string;
  subjectId?: string;
  status?: NoteStatus;
}

const TEXT_FIELDS = ['topic', 'whereStopped', 'learnt', 'confused', 'nextSteps'] as const;

/** Case-insensitive search across every text field; all words must match somewhere. */
export function filterNotes(notes: Note[], f: NoteFilter, subjectName: (id: string | null) => string = () => ''): Note[] {
  const words = (f.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return notes
    .filter((n) => !n.deletedAt)
    .filter((n) => !f.subjectId || (f.subjectId === 'none' ? !n.subjectId : n.subjectId === f.subjectId))
    .filter((n) => !f.status || n.status === f.status)
    .filter((n) => {
      if (!words.length) return true;
      const hay = [...TEXT_FIELDS.map((k) => n[k]), subjectName(n.subjectId)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => (a.status === b.status ? b.lastStudied.localeCompare(a.lastStudied) || b.updatedAt - a.updatedAt : a.status === 'in_progress' ? -1 : 1));
}

export const emptyNote = (subjectId: string | null): Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> => ({
  subjectId,
  topic: '',
  lastStudied: dayKey(Date.now()),
  whereStopped: '',
  learnt: '',
  confused: '',
  nextSteps: '',
  status: 'in_progress',
});

/**
 * Suggestions for updating a note right after a session: what you accomplished becomes
 * "where I stopped", and what to continue with becomes "next time". Existing text is kept;
 * suggestions only fill empty fields or are offered for the user to apply.
 */
export function suggestionsFromSession(s: Session) {
  return {
    lastStudied: s.dayKey,
    whereStopped: s.reflection?.accomplished || s.task || '',
    learnt: s.reflection?.learnt ?? '',
    nextSteps: s.reflection?.nextTime ?? '',
  };
}
