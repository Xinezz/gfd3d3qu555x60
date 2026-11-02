import { useRef } from 'react';
import type { TimeOfDay, TimeOfDayPref } from '../../domain/types';
import { useSettings } from '../../data/settings';
import { useNow } from '../../ui';
import { useRoom } from '../session/sessionStore';

export const TIMES_OF_DAY: { value: TimeOfDayPref; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'night', label: 'Night' },
];

/** Morning 6:00–11:59, afternoon 12:00–17:59, night from 18:00. */
export function timeOfDayAt(date: Date): TimeOfDay {
  const h = date.getHours();
  return h >= 6 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'night';
}

/** What's on screen now, and the setting it came from. */
export interface ShownTime {
  pref: TimeOfDayPref;
  tod: TimeOfDay;
}

/**
 * The time of day to show. Anything you choose applies straight away, Auto included. While Auto is
 * on, the clock moves the room on by itself, except in the middle of a focus session: then the
 * change waits for the break.
 */
export function resolveTimeOfDay(pref: TimeOfDayPref, now: Date, shown: ShownTime | null, focusing: boolean): TimeOfDay {
  if (pref !== 'auto') return pref;
  if (focusing && shown?.pref === 'auto') return shown.tod;
  return timeOfDayAt(now);
}

export function useTimeOfDay(): TimeOfDay {
  const { timeOfDay } = useSettings();
  const { timer } = useRoom();
  // Re-check the clock once a minute; the room re-renders more often during a session anyway.
  const now = useNow(timeOfDay === 'auto', 60_000);
  const shown = useRef<ShownTime | null>(null);
  const focusing = timer.status !== 'idle' && timer.phase === 'focus';
  const tod = resolveTimeOfDay(timeOfDay, new Date(now), shown.current, focusing);
  shown.current = { pref: timeOfDay, tod };
  return tod;
}
