import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Session } from '../../domain/types';
import { goalProgress, type GoalProgress } from '../../domain/planner';
import { formatDuration, formatHours, uid } from '../../domain/time';
import { updateSettings, useSettings } from '../../data/settings';
import { Stepper, toast, useNow } from '../../ui';

/**
 * Daily, weekly, monthly and long-term targets. Goals are only targets: progress is always
 * computed from your saved sessions, so changing or removing a goal never touches your history.
 */
export function Goals({ sessions }: { sessions: Session[] }) {
  const s = useSettings();
  const now = useNow(true, 60_000);
  const [editing, setEditing] = useState(false);
  const g = useMemo(() => goalProgress(sessions, s, now), [sessions, s, now]);

  return (
    <section className="card goals">
      <div className="card__head">
        <div>
          <span className="eyebrow">Targets</span>
          <h2>Study goals</h2>
        </div>
        <button className="btn btn--sm" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          {editing ? 'Done' : 'Adjust'}
        </button>
      </div>

      {editing ? (
        <GoalEditor />
      ) : (
        <>
          <div className="goals__rings">
            <Ring goal={g.daily} label="Today" onSet={() => setEditing(true)} />
            <Ring goal={g.weekly} label="This week" onSet={() => setEditing(true)} />
            <Ring goal={g.monthly} label="This month" onSet={() => setEditing(true)} />
          </div>
          <div className="goals__long">
            <span className="eyebrow">Long-term</span>
            {g.longTerm.length === 0 ? (
              <p className="faint small">
                Set a milestone like 100 hours of study.{' '}
                <button className="link" onClick={() => setEditing(true)}>
                  Add one
                </button>
              </p>
            ) : (
              g.longTerm.map((l) => <LongBar key={l.id} goal={l} />)
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Ring({ goal, label, onSet }: { goal: GoalProgress | null; label: string; onSet: () => void }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  if (!goal)
    return (
      <div className="ring is-off">
        <svg viewBox="0 0 72 72" aria-hidden>
          <circle cx="36" cy="36" r={r} className="ring__track" />
        </svg>
        <span className="ring__label">{label}</span>
        <button className="link xsmall" onClick={onSet}>
          Set a goal
        </button>
      </div>
    );
  const done = goal.ratio >= 1;
  return (
    <div className={`ring ${done ? 'is-done' : ''}`} role="img" aria-label={`${label}: ${formatDuration(goal.doneMs)} of ${formatDuration(goal.targetMs)}`}>
      <svg viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r={r} className="ring__track" />
        <circle cx="36" cy="36" r={r} className="ring__fill" strokeDasharray={c} strokeDashoffset={c * (1 - goal.ratio)} transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" className="ring__pct">
          {Math.floor(goal.ratio * 100)}%
        </text>
      </svg>
      <span className="ring__label">{label}</span>
      <span className="ring__value num">
        {formatDuration(goal.doneMs)}
        <span className="faint"> / {formatDuration(goal.targetMs)}</span>
      </span>
    </div>
  );
}

function LongBar({ goal }: { goal: GoalProgress }) {
  const done = goal.ratio >= 1;
  return (
    <div className={`goal-bar ${done ? 'is-done' : ''}`}>
      <div className="goal-bar__head">
        <strong>{goal.label}</strong>
        <span className="num faint small">
          {formatHours(goal.doneMs)}h / {formatHours(goal.targetMs)}h
        </span>
      </div>
      <div className="progress-bar">
        <i style={{ width: `${goal.ratio * 100}%` }} />
      </div>
      <span className="faint xsmall">{done ? 'Reached. Well earned.' : `${Math.floor(goal.ratio * 100)}% · ${formatHours(goal.targetMs - goal.doneMs)}h to go`}</span>
    </div>
  );
}

function GoalEditor() {
  const s = useSettings();
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState('');

  const add = () => {
    const h = Math.round(Number(hours));
    if (!(h > 0)) {
      toast('Enter how many hours the goal is.');
      return;
    }
    const name = label.trim() || `${h.toLocaleString()} hours of study`;
    updateSettings({ longTermGoals: [...s.longTermGoals, { id: uid(), label: name, targetHours: Math.min(100_000, h), createdAt: Date.now() }] });
    setLabel('');
    setHours('');
  };

  const remove = (id: string) => {
    updateSettings({ longTermGoals: s.longTermGoals.filter((g) => g.id !== id) });
    toast('Goal removed. Your study hours are untouched.');
  };

  return (
    <div className="goals__edit">
      <div className="goals__field">
        <span>Daily</span>
        <Stepper label="Daily goal" unit="min" value={s.dailyGoalMin} min={10} max={720} onChange={(v) => updateSettings({ dailyGoalMin: v })} />
      </div>
      <div className="goals__field">
        <span>
          Weekly <small className="faint">0 = off</small>
        </span>
        <Stepper label="Weekly goal" unit="h" value={Math.round(s.weeklyGoalMin / 60)} min={0} max={100} onChange={(v) => updateSettings({ weeklyGoalMin: v * 60 })} />
      </div>
      <div className="goals__field">
        <span>
          Monthly <small className="faint">0 = off</small>
        </span>
        <Stepper label="Monthly goal" unit="h" value={Math.round(s.monthlyGoalMin / 60)} min={0} max={400} onChange={(v) => updateSettings({ monthlyGoalMin: v * 60 })} />
      </div>

      <div className="goals__field">
        <span>Long-term milestones</span>
        {s.longTermGoals.length > 0 && (
          <ul className="goals__list">
            {s.longTermGoals.map((g) => (
              <li key={g.id}>
                <span>{g.label}</span>
                <span className="num faint small">{g.targetHours.toLocaleString()}h</span>
                <button className="icon-btn icon-btn--ghost" onClick={() => remove(g.id)} aria-label={`Remove goal ${g.label}`}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="goals__add">
          <input className="input" placeholder="Name (optional)" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="input goals__hours" type="number" min={1} placeholder="Hours" aria-label="Target hours" value={hours} onChange={(e) => setHours(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn" onClick={add} aria-label="Add long-term goal">
            <Plus size={15} /> Add
          </button>
        </div>
        <p className="faint xsmall">Measured against all the focus time you've ever logged.</p>
      </div>
    </div>
  );
}
