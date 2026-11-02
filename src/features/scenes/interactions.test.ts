import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Hotspot } from './catalog';
import { hotspotState, pressHotspot, PULSE_MS } from './interactions';

const lamp: Hotspot = { id: 'lamp', kind: 'cycle', label: 'Desk lamp', states: ['warm', 'dim', 'off'], region: [0, 0, 1, 1] };
const cup: Hotspot = { id: 'cup', kind: 'pulse', label: 'Coffee cup', region: [0, 0, 1, 1] };

afterEach(() => vi.useRealTimers());

describe('hotspots', () => {
  it('cycle through their states and wrap around', () => {
    expect(hotspotState('test-a', lamp)).toBe(0);
    pressHotspot('test-a', lamp);
    expect(hotspotState('test-a', lamp)).toBe(1);
    pressHotspot('test-a', lamp);
    pressHotspot('test-a', lamp);
    expect(hotspotState('test-a', lamp)).toBe(0);
  });

  it('are kept per environment', () => {
    pressHotspot('test-b', lamp);
    expect(hotspotState('test-b', lamp)).toBe(1);
    expect(hotspotState('test-c', lamp)).toBe(0);
  });

  it('play a one-off reaction that ends by itself, and ignore presses while it plays', () => {
    vi.useFakeTimers();
    pressHotspot('test-d', cup);
    expect(hotspotState('test-d', cup)).toBe(1);
    pressHotspot('test-d', cup);
    vi.advanceTimersByTime(PULSE_MS - 1);
    expect(hotspotState('test-d', cup)).toBe(1);
    vi.advanceTimersByTime(1);
    expect(hotspotState('test-d', cup)).toBe(0);
  });
});
