import { describe, expect, it } from 'vitest';
import { noiseSamples, seamlessLoop } from './synth';

/** The biggest jump between neighbouring samples anywhere inside the loop. */
function largestStep(d: Float32Array) {
  let max = 0;
  for (let i = 1; i < d.length; i++) max = Math.max(max, Math.abs(d[i] - d[i - 1]));
  return max;
}

describe('seamlessLoop', () => {
  const rate = 8000;
  const len = rate * 3;
  const fade = rate / 4;

  for (const kind of ['brown', 'pink'] as const) {
    it(`${kind} noise loops without a jump at the join`, () => {
      for (let run = 0; run < 5; run++) {
        const loop = seamlessLoop(noiseSamples(kind, len + fade), len);
        const join = Math.abs(loop[0] - loop[len - 1]);
        // Wrapping from the last sample to the first is no bigger a step than the noise takes anyway.
        expect(join).toBeLessThanOrEqual(largestStep(loop));
      }
    });
  }

  it('keeps the requested length', () => {
    expect(seamlessLoop(noiseSamples('white', 1100), 1000)).toHaveLength(1000);
  });
});
