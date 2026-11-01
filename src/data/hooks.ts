import { useLiveQuery } from 'dexie-react-hooks';
import type { AchievementUnlock, Note, Preset, Session, Subject } from '../domain/types';
import { db } from './db';
import { notesRepo, presetsRepo, sessionsRepo, subjectsRepo, unlocksRepo } from './repo';

/** Live queries: components re-render automatically whenever the underlying data changes. */

const EMPTY: never[] = [];

export function useSessions(): { sessions: Session[]; loading: boolean } {
  const data = useLiveQuery(() => sessionsRepo.all(), []);
  return { sessions: data ?? EMPTY, loading: data === undefined };
}

export function useSubjects(): Subject[] {
  const data = useLiveQuery(async () => (await subjectsRepo.all()).sort((a, b) => a.name.localeCompare(b.name)), []);
  return data ?? EMPTY;
}

export function useCustomPresets(): Preset[] {
  const data = useLiveQuery(async () => (await presetsRepo.all()).sort((a, b) => a.createdAt - b.createdAt), []);
  return data ?? EMPTY;
}

/** Includes deleted subjects, for labelling past sessions. */
export function useAllSubjects(): Subject[] {
  return useLiveQuery(() => db.subjects.toArray(), []) ?? EMPTY;
}

export function useNotes(): { notes: Note[]; loading: boolean } {
  const data = useLiveQuery(() => notesRepo.all(), []);
  return { notes: data ?? EMPTY, loading: data === undefined };
}

export function useUnlocks(): { unlocks: AchievementUnlock[]; loading: boolean } {
  const data = useLiveQuery(() => unlocksRepo.all(), []);
  return { unlocks: data ?? EMPTY, loading: data === undefined };
}
