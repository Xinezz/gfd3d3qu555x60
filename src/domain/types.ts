/**
 * Core data model. Every persisted record carries id + timestamps + a soft-delete marker so a
 * future cloud sync can merge devices with last-write-wins on `updatedAt`.
 */

export type ID = string;

export interface BaseRecord {
  id: ID;
  createdAt: number;
  updatedAt: number;
  /** Soft delete: set instead of removing, so deletions can sync too. */
  deletedAt: number | null;
}

export type SessionStatus = 'completed' | 'ended_early';
export type TaskOutcome = 'yes' | 'partly' | 'no';

export interface Reflection {
  accomplished: string;
  completedTask: TaskOutcome | null;
  nextTime: string;
}

export interface Distraction {
  id: ID;
  text: string;
  createdAt: number;
  done: boolean;
}

export interface Session extends BaseRecord {
  startedAt: number;
  endedAt: number;
  /** Local calendar day (YYYY-MM-DD) the session started on. */
  dayKey: string;
  plannedMs: number;
  /** Actual focused time (excludes pauses). This is what all statistics use. */
  focusMs: number;
  pausedMs: number;
  status: SessionStatus;
  subjectId: ID | null;
  task: string;
  reflection: Reflection | null;
  distractions: Distraction[];
  environmentId: string;
  musicId: string | null;
  companionId: string;
}

export interface Subject extends BaseRecord {
  name: string;
  color: string;
}

export interface Preset extends BaseRecord {
  name: string;
  focusMin: number;
  breakMin: number;
}

export type NoteStatus = 'in_progress' | 'completed';

/** A study-progress entry for one topic/chapter of a subject. */
export interface Note extends BaseRecord {
  subjectId: ID | null;
  topic: string;
  /** Local day (YYYY-MM-DD) this topic was last studied. */
  lastStudied: string;
  whereStopped: string;
  learnt: string;
  confused: string;
  nextSteps: string;
  status: NoteStatus;
}

/** A stored unlock. The id is the achievement id, so each can only be unlocked once. */
export interface AchievementUnlock extends BaseRecord {
  unlockedAt: number;
  /** When the celebration was shown; null = still to celebrate. */
  seenAt: number | null;
}

export type CompanionId = 'timer' | 'candle' | 'plant' | 'hourglass' | 'moon' | 'cat';

export interface Settings {
  dailyGoalMin: number;
  /** Selected preset id (built-in or custom). Null = custom values below. */
  presetId: string | null;
  focusMin: number;
  breakMin: number;
  environmentId: string;
  companionId: CompanionId;
  musicId: string;
  customMusicUrl: string;
  musicVolume: number;
  musicMuted: boolean;
  ambienceOn: boolean;
  ambienceVolume: number;
  ambienceMuted: boolean;
  autoPlayAudio: boolean;
  pauseAudioOnEnd: boolean;
  chime: boolean;
  notifications: boolean;
  lightsOffFullscreen: boolean;
  /** Unlocked decorations you have switched off (everything earned shows by default). */
  decorOff: string[];
  updatedAt: number;
}
