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
  /** "Did I achieve my intended objective?" */
  completedTask: TaskOutcome | null;
  nextTime: string;
  /** Optional focus-quality answers (absent on reflections written before they existed). */
  focusRating?: number | null;
  distractedBy?: string;
  learnt?: string;
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
  /** Planner task this session worked on (absent on older sessions). */
  taskId?: ID | null;
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
  /* Session template extras. Presets saved before templates existed have none of these and
     only set the timer. */
  environmentId?: string;
  companionId?: CompanionId;
  musicId?: string;
  customMusicUrl?: string;
  musicVolume?: number;
  ambienceVolume?: number;
  ambienceOn?: boolean;
  lightsOff?: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high';

/** A planner task. Sessions linked by `taskId` count toward its progress. */
export interface Task extends BaseRecord {
  title: string;
  subjectId: ID | null;
  /** Local day (YYYY-MM-DD) it's due, or null. */
  dueDate: string | null;
  /** Estimated study time in minutes, or null. */
  estimateMin: number | null;
  priority: TaskPriority;
  done: boolean;
  completedAt: number | null;
}

/** A long-term target on lifetime focus hours, e.g. "300 hours before finals". */
export interface LongTermGoal {
  id: ID;
  label: string;
  targetHours: number;
  createdAt: number;
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
  /** How the dashboard greets you (optional). */
  displayName: string;
  dailyGoalMin: number;
  /** 0 = no goal set. */
  weeklyGoalMin: number;
  monthlyGoalMin: number;
  longTermGoals: LongTermGoal[];
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
  /** Ambience layers you've changed, keyed `${environmentId}:${layerId}`. Anything missing uses the layer's defaults. */
  ambienceMix: Record<string, { on: boolean; volume: number }>;
  /** The study rooms' time of day: follow the local clock, or a fixed atmosphere. */
  timeOfDay: TimeOfDayPref;
  /* Scene effects (Settings → Environment). Each switches off cleanly on its own. */
  sceneAnimations: boolean;
  sceneParticles: boolean;
  sceneLighting: boolean;
  /** 0–1: how strongly lamps, fire and windows light the room. */
  lightingIntensity: number;
  /** Half the particles and gentler movement. */
  calmMotion: boolean;
  /** Turns motion off, on top of the operating system's reduced-motion setting. */
  reduceMotion: boolean;
  updatedAt: number;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'night';
export type TimeOfDayPref = 'auto' | TimeOfDay;
