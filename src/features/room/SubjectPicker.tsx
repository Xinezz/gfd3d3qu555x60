import { useState } from 'react';
import { useSubjects } from '../../data/hooks';
import { newRecord, nextSubjectColor, subjectsRepo } from '../../data/repo';
import { toast } from '../../ui';

const NEW = '__new__';

/** Subject select with inline "create new subject". */
export function SubjectPicker({ value, onChange, id }: { value: string | null; onChange: (id: string | null) => void; id?: string }) {
  const subjects = useSubjects();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    const existing = subjects.find((s) => s.name.toLowerCase() === n.toLowerCase());
    if (existing) {
      onChange(existing.id);
    } else {
      const rec = await subjectsRepo.put(newRecord({ name: n, color: nextSubjectColor(subjects) }));
      onChange(rec.id);
      toast(`Added “${n}”`);
    }
    setName('');
    setCreating(false);
  };

  if (creating)
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={id}
          className="input"
          autoFocus
          placeholder="New subject, e.g. Physics"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void create();
            if (e.key === 'Escape') {
              // Marks the key as handled so page-level Escape handlers (editor, room) ignore it.
              e.preventDefault();
              e.stopPropagation();
              setCreating(false);
            }
          }}
        />
        <button className="btn" onClick={() => void create()} disabled={!name.trim()}>
          Add
        </button>
        <button className="btn btn--ghost" onClick={() => setCreating(false)}>
          Cancel
        </button>
      </div>
    );

  return (
    <select
      id={id}
      className="select"
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === NEW) setCreating(true);
        else onChange(e.target.value || null);
      }}
    >
      <option value="">No subject</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
      <option value={NEW}>+ New subject…</option>
    </select>
  );
}
