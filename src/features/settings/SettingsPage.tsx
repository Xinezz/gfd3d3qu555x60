import { useEffect, useRef, useState } from 'react';
import { Download, FileJson, Trash2, Upload } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDuration, MINUTE, relativeDay } from '../../domain/time';
import { useCustomPresets, useSubjects } from '../../data/hooks';
import { presetsRepo, SUBJECT_COLORS, subjectsRepo } from '../../data/repo';
import { updateSettings, useSettings } from '../../data/settings';
import { db, isStoragePersistent, requestPersistentStorage } from '../../data/db';
import { deleteAllData, downloadBackup, downloadSessionsCsv, importBackup } from '../../data/backup';
import { confirmDialog, Stepper, toast, Toggle } from '../../ui';
import './settings.css';

const LAST_BACKUP_KEY = 'lockin.lastBackup';

export function SettingsPage() {
  const s = useSettings();
  return (
    <div className="page settings">
      <header>
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
      </header>

      <section className="card">
        <h2>Daily goal</h2>
        <p className="muted small">How much focused time you aim for each day. Shown on your dashboard.</p>
        <div className="settings__row">
          <Stepper label="Daily goal" unit="min" value={s.dailyGoalMin} min={10} max={720} onChange={(v) => updateSettings({ dailyGoalMin: v })} />
          <span className="faint">= {formatDuration(s.dailyGoalMin * MINUTE)} a day</span>
        </div>
      </section>

      <section className="card">
        <h2>Sessions</h2>
        <Toggle label="Chime when a session or break ends" checked={s.chime} onChange={(v) => updateSettings({ chime: v })} />
        <NotificationToggle />
        <Toggle label="Go full screen in Lights Off" hint="Esc always turns the lights back on" checked={s.lightsOffFullscreen} onChange={(v) => updateSettings({ lightsOffFullscreen: v })} />
      </section>

      <section className="card">
        <h2>Sound</h2>
        <Toggle label="Play music and room sound when a session starts" checked={s.autoPlayAudio} onChange={(v) => updateSettings({ autoPlayAudio: v })} />
        <Toggle label="Pause sound when a session ends" checked={s.pauseAudioOnEnd} onChange={(v) => updateSettings({ pauseAudioOnEnd: v })} />
        <Toggle label="Include room sound with the timer" hint="The environment's ambience (rain, fire, café…)" checked={s.ambienceOn} onChange={(v) => updateSettings({ ambienceOn: v })} />
      </section>

      <SubjectsSection />
      <PresetsSection />
      <DataSection />
    </div>
  );
}

function NotificationToggle() {
  const s = useSettings();
  const supported = 'Notification' in window;
  const change = async (on: boolean) => {
    if (!on) return updateSettings({ notifications: false });
    const perm = await Notification.requestPermission();
    if (perm === 'granted') updateSettings({ notifications: true });
    else toast('Notifications are blocked for this site in your browser settings.');
  };
  if (!supported) return null;
  return <Toggle label="Notify me when a session ends in another tab" checked={s.notifications && Notification.permission === 'granted'} onChange={(v) => void change(v)} />;
}

function SubjectsSection() {
  const subjects = useSubjects();
  const remove = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: `Delete “${name}”?`,
      body: 'Past sessions keep their time and reflections; they will show as having no subject.',
      confirmLabel: 'Delete subject',
      danger: true,
    });
    if (ok) await subjectsRepo.remove(id);
  };
  return (
    <section className="card">
      <h2>Subjects</h2>
      <p className="muted small">Create subjects when you start or finish a session. Rename or recolour them here.</p>
      {subjects.length === 0 ? (
        <p className="empty">No subjects yet.</p>
      ) : (
        <ul className="settings__list">
          {subjects.map((sub) => (
            <li key={sub.id}>
              <button
                className="swatch"
                style={{ background: sub.color }}
                aria-label={`Change colour of ${sub.name}`}
                onClick={() => subjectsRepo.patch(sub.id, { color: SUBJECT_COLORS[(SUBJECT_COLORS.indexOf(sub.color) + 1) % SUBJECT_COLORS.length] })}
              />
              <input
                className="input input--bare"
                defaultValue={sub.name}
                maxLength={40}
                aria-label="Subject name"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== sub.name) void subjectsRepo.patch(sub.id, { name: v });
                  else e.target.value = sub.name;
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
              <button className="icon-btn icon-btn--ghost" onClick={() => void remove(sub.id, sub.name)} aria-label={`Delete ${sub.name}`}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PresetsSection() {
  const presets = useCustomPresets();
  const s = useSettings();
  if (!presets.length) return null;
  return (
    <section className="card">
      <h2>Your timer presets</h2>
      <ul className="settings__list">
        {presets.map((p) => (
          <li key={p.id}>
            <span className="settings__grow">{p.name}</span>
            <span className="faint num">
              {p.focusMin} / {p.breakMin} min
            </span>
            <button
              className="icon-btn icon-btn--ghost"
              aria-label={`Delete preset ${p.name}`}
              onClick={async () => {
                if (await confirmDialog({ title: `Delete “${p.name}”?`, confirmLabel: 'Delete', danger: true })) {
                  await presetsRepo.remove(p.id);
                  if (s.presetId === p.id) updateSettings({ presetId: null });
                }
              }}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DataSection() {
  const counts = useLiveQuery(async () => ({
    sessions: await db.sessions.filter((r) => !r.deletedAt).count(),
    subjects: await db.subjects.filter((r) => !r.deletedAt).count(),
    notes: await db.notes.filter((r) => !r.deletedAt).count(),
  }));
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [lastBackup, setLastBackup] = useState(() => Number(localStorage.getItem(LAST_BACKUP_KEY)) || 0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void isStoragePersistent().then(setPersistent);
  }, []);

  const exportJson = async () => {
    await downloadBackup();
    const t = Date.now();
    localStorage.setItem(LAST_BACKUP_KEY, String(t));
    setLastBackup(t);
  };

  const onImport = async (file: File) => {
    try {
      const r = await importBackup(await file.text());
      toast(`Imported ${r.sessions} sessions, ${r.notes} notes, ${r.subjects} subjects, ${r.presets} presets`, 4500);
    } catch (e) {
      toast((e as Error).message, 5000);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const wipe = async () => {
    const first = await confirmDialog({
      title: 'Delete all study data?',
      body: 'Every session, reflection, note, achievement, subject and preset in this browser will be permanently removed. Export a backup first if you might want it back.',
      confirmLabel: 'Continue',
      danger: true,
    });
    if (!first) return;
    const second = await confirmDialog({ title: 'Are you completely sure?', body: 'This cannot be undone.', confirmLabel: 'Delete everything', danger: true });
    if (!second) return;
    await deleteAllData();
    toast('All study data deleted');
  };

  return (
    <section className="card">
      <h2>Your data</h2>
      <p className="muted small">
        Everything is stored privately in this browser on this device ({counts?.sessions ?? 0} sessions, {counts?.notes ?? 0} notes, {counts?.subjects ?? 0} subjects). Clearing your browser's site data would erase it, so export a backup now and then.
      </p>
      <div className="settings__status">
        <span>
          Last backup: <strong>{lastBackup ? relativeDay(lastBackup) : 'never'}</strong>
        </span>
        <span>
          Protected from automatic cleanup:{' '}
          <strong>{persistent === null ? '…' : persistent ? 'yes' : 'no'}</strong>
          {persistent === false && (
            <button className="link" style={{ marginLeft: 8 }} onClick={() => void requestPersistentStorage().then(setPersistent)}>
              ask browser
            </button>
          )}
        </span>
      </div>
      <div className="settings__actions">
        <button className="btn btn--primary" onClick={() => void exportJson()}>
          <FileJson size={16} /> Export backup (JSON)
        </button>
        <button className="btn" onClick={() => void downloadSessionsCsv()}>
          <Download size={16} /> Export sessions (CSV)
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void onImport(e.target.files[0])} />
      </div>
      <p className="faint small">Importing merges with what's here: newer versions of a record win and nothing is deleted.</p>
      <div className="settings__danger">
        <button className="btn btn--ghost btn--danger" onClick={() => void wipe()}>
          <Trash2 size={16} /> Delete all data
        </button>
      </div>
    </section>
  );
}
