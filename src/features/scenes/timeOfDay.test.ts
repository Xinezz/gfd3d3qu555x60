import { describe, expect, it } from 'vitest';
import { resolveTimeOfDay, timeOfDayAt } from './timeOfDay';

const at = (h: number, m = 0) => new Date(2026, 10, 2, h, m);

describe('timeOfDayAt', () => {
  it('splits the day into morning, afternoon and night', () => {
    expect(timeOfDayAt(at(5, 59))).toBe('night');
    expect(timeOfDayAt(at(6))).toBe('morning');
    expect(timeOfDayAt(at(11, 59))).toBe('morning');
    expect(timeOfDayAt(at(12))).toBe('afternoon');
    expect(timeOfDayAt(at(17, 59))).toBe('afternoon');
    expect(timeOfDayAt(at(18))).toBe('night');
    expect(timeOfDayAt(at(0, 30))).toBe('night');
  });
});

describe('resolveTimeOfDay', () => {
  it('uses a fixed choice straight away, even mid-session', () => {
    expect(resolveTimeOfDay('morning', at(23), { pref: 'auto', tod: 'night' }, true)).toBe('morning');
  });

  it('follows the clock in auto mode', () => {
    expect(resolveTimeOfDay('auto', at(9), null, false)).toBe('morning');
    expect(resolveTimeOfDay('auto', at(19), { pref: 'auto', tod: 'afternoon' }, false)).toBe('night');
  });

  it('never moves the room on by itself in the middle of a focus session', () => {
    // 17:59 → 18:00 while focusing: still afternoon until the break.
    expect(resolveTimeOfDay('auto', at(18), { pref: 'auto', tod: 'afternoon' }, true)).toBe('afternoon');
    expect(resolveTimeOfDay('auto', at(18), { pref: 'auto', tod: 'afternoon' }, false)).toBe('night');
  });

  it('applies switching to Auto straight away, even mid-session', () => {
    expect(resolveTimeOfDay('auto', at(21), { pref: 'morning', tod: 'morning' }, true)).toBe('night');
  });

  it('takes the clock when nothing is on screen yet', () => {
    expect(resolveTimeOfDay('auto', at(14), null, true)).toBe('afternoon');
  });
});
