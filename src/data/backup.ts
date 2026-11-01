import type { AchievementUnlock, Note, Preset, Session, Subject } from '../domain/types';
import { dayKey } from '../domain/time';
import { db } from './db';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, recordsToWrite, type BackupFile } from './merge';
import { getSettings, replaceSettings } from './settings';

/** Full export, including soft-deleted rows so a restore reproduces the exact state. */
export async function exportBackup(): Promise<BackupFile> {
  const [sessions, subjects, presets, notes, achievements] = await Promise.all([
    db.sessions.toArray(),
    db.subjects.toArray(),
    db.presets.toArray(),
    db.notes.toArray(),
    db.achievements.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions,
    subjects,
    presets,
    notes,
    achievements,
    settings: { ...getSettings() },
  };
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadBackup() {
  const data = await exportBackup();
  download(`lock-in-backup-${dayKey(Date.now())}.json`, JSON.stringify(data, null, 2), 'application/json');
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function downloadSessionsCsv() {
  const [sessions, subjects] = await Promise.all([db.sessions.toArray(), db.subjects.toArray()]);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const header = ['date', 'start', 'end', 'focus_minutes', 'planned_minutes', 'status', 'subject', 'task', 'accomplished', 'completed_task', 'next_time'];
  const rows = sessions
    .filter((s) => !s.deletedAt)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) =>
      [
        s.dayKey,
        new Date(s.startedAt).toISOString(),
        new Date(s.endedAt).toISOString(),
        (s.focusMs / 60000).toFixed(1),
        Math.round(s.plannedMs / 60000),
        s.status,
        s.subjectId ? subjectName.get(s.subjectId) ?? '' : '',
        s.task,
        s.reflection?.accomplished,
        s.reflection?.completedTask,
        s.reflection?.nextTime,
      ]
        .map(csvCell)
        .join(','),
    );
  download(`lock-in-sessions-${dayKey(Date.now())}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv');
}

export interface ImportResult {
  sessions: number;
  subjects: number;
  presets: number;
  notes: number;
  achievements: number;
}

/** Merges a backup into current data; newer records win, nothing is deleted. */
export async function importBackup(text: string): Promise<ImportResult> {
  const backup = parseBackup(text);
  return db.transaction('rw', [db.sessions, db.subjects, db.presets, db.notes, db.achievements], async () => {
    const sessions = recordsToWrite(await db.sessions.toArray(), backup.sessions as Session[]);
    const subjects = recordsToWrite(await db.subjects.toArray(), backup.subjects as Subject[]);
    const presets = recordsToWrite(await db.presets.toArray(), backup.presets as Preset[]);
    const notes = recordsToWrite(await db.notes.toArray(), backup.notes as Note[]);
    // Restored unlocks keep their dates and are not re-celebrated.
    const achievements = recordsToWrite(await db.achievements.toArray(), backup.achievements as AchievementUnlock[]).map((a) => ({ ...a, seenAt: a.seenAt ?? Date.now() }));
    await db.sessions.bulkPut(sessions);
    await db.subjects.bulkPut(subjects);
    await db.presets.bulkPut(presets);
    await db.notes.bulkPut(notes);
    await db.achievements.bulkPut(achievements);
    const s = backup.settings as { updatedAt?: number } | null;
    if (s && (s.updatedAt ?? 0) > getSettings().updatedAt) replaceSettings(s);
    return { sessions: sessions.length, subjects: subjects.length, presets: presets.length, notes: notes.length, achievements: achievements.length };
  });
}

export async function deleteAllData() {
  await db.transaction('rw', [db.sessions, db.subjects, db.presets, db.notes, db.achievements], async () => {
    await Promise.all([db.sessions.clear(), db.subjects.clear(), db.presets.clear(), db.notes.clear(), db.achievements.clear()]);
  });
}
