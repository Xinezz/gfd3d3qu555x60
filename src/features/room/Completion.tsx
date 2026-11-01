import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Check, Coffee } from 'lucide-react';
import type { Distraction, Session, TaskOutcome } from '../../domain/types';
import { formatDuration } from '../../domain/time';
import { todayStats } from '../../domain/stats';
import { sessionsRepo } from '../../data/repo';
import { useSessions } from '../../data/hooks';
import { Segmented, toast } from '../../ui';
import { getRoom, room, useRoom } from '../session/sessionStore';
import { SubjectPicker } from './SubjectPicker';

/**
 * Shown after a focus session ends. The session is already saved by this point; the reflection
 * is added to it. Closing without saving keeps the session (just without a reflection).
 */
export function Completion({ sessionId }: { sessionId: string }) {
  const saved = useLiveQuery(() => sessionsRepo.get(sessionId), [sessionId]);
  const pending = getRoom().pendingSave;
  const session: Session | undefined = saved ?? (pending?.id === sessionId ? pending : undefined);
  if (!session) return null;
  return <CompletionForm key={session.id} session={session} />;
}

function CompletionForm({ session }: { session: Session }) {
  const navigate = useNavigate();
  const { timer } = useRoom();
  const { sessions } = useSessions();
  const [step, setStep] = useState<'reflect' | 'next'>('reflect');
  const [subjectId, setSubjectId] = useState(session.subjectId);
  const [task, setTask] = useState(session.task);
  const [accomplished, setAccomplished] = useState(session.reflection?.accomplished ?? '');
  const [completedTask, setCompletedTask] = useState<TaskOutcome | null>(session.reflection?.completedTask ?? null);
  const [nextTime, setNextTime] = useState(session.reflection?.nextTime ?? '');
  const [distractions, setDistractions] = useState<Distraction[]>(session.distractions);
  const [saving, setSaving] = useState(false);
  const today = todayStats(sessions);
  const early = session.status === 'ended_early';

  // Keep the subject chosen here as the default for the next session.
  useEffect(() => room.setContext({ subjectId }), [subjectId]);

  const save = async () => {
    setSaving(true);
    try {
      await room.saveReflection(session.id, {
        subjectId,
        task: task.trim(),
        distractions,
        reflection: { accomplished: accomplished.trim(), completedTask, nextTime: nextTime.trim() },
      });
      toast('Reflection saved');
      setStep('next');
    } catch {
      toast("Couldn't save the reflection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const done = (go?: string) => {
    room.closeReview();
    if (go) navigate(go);
  };

  if (step === 'next')
    return (
      <div className="overlay completion">
        <div className="modal completion__card completion__card--next">
          <Coffee size={30} strokeWidth={1.4} className="completion__icon" />
          <h2>{timer.breakMin > 0 ? `Take a ${timer.breakMin}-minute break?` : 'Ready for the next one?'}</h2>
          <p className="muted">Stand up, stretch, drink some water. Your break timer will call you back.</p>
          <div className="completion__actions">
            {timer.breakMin > 0 && (
              <button className="btn btn--primary btn--lg" onClick={() => room.startBreak()}>
                Start break
              </button>
            )}
            <button className="btn btn--lg" onClick={() => done()}>
              {timer.breakMin > 0 ? 'Skip break' : 'Back to the room'}
            </button>
            <button className="btn btn--ghost" onClick={() => done(`/notes?session=${session.id}`)}>
              <BookOpen size={16} /> Update study notes
            </button>
            <button className="btn btn--ghost" onClick={() => done('/')}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="overlay completion">
      <div className="modal completion__card" role="dialog" aria-modal aria-labelledby="completion-title">
        <div className="completion__hero">
          <span className="completion__badge">
            <Check size={26} strokeWidth={2.2} />
          </span>
          <span className="eyebrow">{early ? 'Session saved' : 'Session complete'}</span>
          <h2 id="completion-title">
            You focused for <em>{formatDuration(session.focusMs)}</em>
          </h2>
          <p className="faint small">
            Today: {formatDuration(today.focusMs)} across {today.count} {today.count === 1 ? 'session' : 'sessions'}
          </p>
        </div>

        <div className="stack">
          <label className="field">
            <span>What did you accomplish this session?</span>
            <textarea className="textarea" autoFocus value={accomplished} onChange={(e) => setAccomplished(e.target.value)} placeholder="e.g. Finished problems 1–8 on integration by parts" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Which subject did you study?</span>
              <SubjectPicker value={subjectId} onChange={setSubjectId} />
            </label>
            <label className="field">
              <span>Task</span>
              <input className="input" value={task} onChange={(e) => setTask(e.target.value)} placeholder="What you set out to do" />
            </label>
          </div>
          <div className="field">
            <span>Did you complete your intended task?</span>
            <Segmented
              label="Completed task"
              value={completedTask}
              onChange={setCompletedTask}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'partly', label: 'Partly' },
                { value: 'no', label: 'Not yet' },
              ]}
            />
          </div>
          <label className="field">
            <span>What should you continue with next time?</span>
            <textarea className="textarea" value={nextTime} onChange={(e) => setNextTime(e.target.value)} placeholder="e.g. Start problem 9, review the chain rule first" />
          </label>

          {distractions.length > 0 && (
            <div className="field">
              <span>Thoughts you parked ({distractions.length}). Tick the ones you've dealt with.</span>
              <ul className="thought-list thought-list--review">
                {distractions.map((d) => (
                  <li key={d.id}>
                    <label>
                      <input type="checkbox" checked={d.done} onChange={() => setDistractions(distractions.map((x) => (x.id === d.id ? { ...x, done: !x.done } : x)))} />
                      <span className={d.done ? 'is-done' : undefined}>{d.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <span className="faint small">Unticked thoughts stay on your dashboard until you deal with them.</span>
            </div>
          )}
        </div>

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => setStep('next')}>
            Skip reflection
          </button>
          <button className="btn btn--primary" onClick={() => void save()} disabled={saving}>
            Save reflection
          </button>
        </div>
      </div>
    </div>
  );
}
