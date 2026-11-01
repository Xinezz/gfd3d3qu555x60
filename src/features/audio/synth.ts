/**
 * Procedural ambience with the Web Audio API. Nothing is downloaded, so every sound here works
 * offline and can never "go missing". Continuous beds are looped noise through filters and slow
 * LFOs; discrete events (crackles, drops, chirps, ticks) are scheduled ahead on the audio clock,
 * which keeps them steady even when the browser throttles timers in a background tab.
 */

export type RecipeId =
  | 'rain' | 'rain-window' | 'brown' | 'fire' | 'bedroom' | 'city' | 'forest' | 'nature'
  | 'ocean' | 'library' | 'cafe' | 'snow' | 'garden';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers: Partial<Record<'white' | 'pink' | 'brown', AudioBuffer>> = {};

export function audioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Must be called from a user gesture at least once (browser autoplay policy). */
export function unlockAudio() {
  const c = audioContext();
  if (c.state === 'suspended') void c.resume();
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function noiseBuffer(c: AudioContext, kind: 'white' | 'pink' | 'brown'): AudioBuffer {
  const cached = buffers[kind];
  if (cached) return cached;
  const len = c.sampleRate * 6;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.5;
      else if (kind === 'pink') {
        // Paul Kellet's refined pink noise filter
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Crossfade the loop seam so there's no click every 6 seconds.
    const fade = Math.floor(c.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
    }
  }
  buffers[kind] = buf;
  return buf;
}

/** A tiny graph-building kit shared by the recipes. */
class Kit {
  private stops: (() => void)[] = [];
  constructor(readonly c: AudioContext, readonly out: AudioNode) {}

  gain(value: number, to: AudioNode = this.out) {
    const g = this.c.createGain();
    g.gain.value = value;
    g.connect(to);
    return g;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.7, to: AudioNode) {
    const f = this.c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(to);
    return f;
  }

  noise(kind: 'white' | 'pink' | 'brown', to: AudioNode) {
    const src = this.c.createBufferSource();
    src.buffer = noiseBuffer(this.c, kind);
    src.loop = true;
    src.connect(to);
    src.start(0, rand(0, 5));
    this.stops.push(() => src.stop());
    return src;
  }

  lfo(freq: number, depth: number, param: AudioParam) {
    const o = this.c.createOscillator();
    o.frequency.value = freq;
    const g = this.c.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
    this.stops.push(() => o.stop());
  }

  /** Continuous noise bed: noise -> filter -> gain. Returns the gain for modulation. */
  bed(kind: 'white' | 'pink' | 'brown', type: BiquadFilterType, freq: number, level: number, q = 0.7) {
    const g = this.gain(level);
    const f = this.filter(type, freq, q, g);
    this.noise(kind, f);
    return { gain: g, filter: f };
  }

  /** Schedules `fire(time)` at random gaps, looking ahead on the audio clock. */
  every(minGap: number, maxGap: number, fire: (t: number) => void, startDelay = 0) {
    let next = this.c.currentTime + startDelay + rand(0, maxGap);
    const pump = () => {
      while (next < this.c.currentTime + 1.5) {
        if (next >= this.c.currentTime) fire(next);
        next += rand(minGap, maxGap);
      }
    };
    pump();
    const id = setInterval(pump, 300);
    this.stops.push(() => clearInterval(id));
  }

  pan(value: number, to: AudioNode = this.out) {
    const p = this.c.createStereoPanner();
    p.pan.value = value;
    p.connect(to);
    return p;
  }

  /** A short filtered noise hit (crackle, drop, tick, page turn). */
  burst(t: number, o: { dur: number; type: BiquadFilterType; freq: number; q?: number; level: number; attack?: number; pan?: number; kind?: 'white' | 'pink' | 'brown' }) {
    const src = this.c.createBufferSource();
    src.buffer = noiseBuffer(this.c, o.kind ?? 'white');
    const f = this.c.createBiquadFilter();
    f.type = o.type;
    f.frequency.value = o.freq;
    f.Q.value = o.q ?? 1;
    const g = this.c.createGain();
    const a = o.attack ?? 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.level, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
    src.connect(f).connect(g).connect(this.pan(o.pan ?? 0));
    src.start(t, rand(0, 5), a + o.dur + 0.05);
  }

  /** A sine sweep (bird chirp, water bubble). */
  chirp(t: number, f0: number, f1: number, dur: number, level: number, pan = 0) {
    const o = this.c.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.pan(pan));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** A soft bell made of inharmonic partials. */
  bell(t: number, freq: number, level: number, decay: number, to: AudioNode = this.out) {
    for (const [ratio, amp] of [[1, 1], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]]) {
      const o = this.c.createOscillator();
      o.frequency.value = freq * ratio;
      const g = this.c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level * amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / ratio);
      o.connect(g).connect(to);
      o.start(t);
      o.stop(t + decay + 0.1);
    }
  }

  stop() {
    this.stops.forEach((s) => {
      try { s(); } catch { /* already stopped */ }
    });
    this.stops = [];
  }
}

function rain(k: Kit, muffled = false) {
  k.bed('pink', 'bandpass', muffled ? 1400 : 2600, 0.55, 0.35);
  k.bed('brown', 'lowpass', 300, 0.22);
  k.every(0.03, 0.14, (t) =>
    k.burst(t, { dur: rand(0.015, 0.05), type: 'bandpass', freq: rand(muffled ? 1200 : 2500, muffled ? 2500 : 6000), q: 2, level: rand(0.02, 0.07), pan: rand(-0.8, 0.8) }),
  );
}

function wind(k: Kit, level: number, center = 450, q = 0.9) {
  const { gain, filter } = k.bed('pink', 'bandpass', center, level, q);
  k.lfo(0.045, center * 0.5, filter.frequency);
  k.lfo(0.07, level * 0.45, gain.gain);
}

function crackles(k: Kit, level: number) {
  k.every(0.02, 0.28, (t) =>
    k.burst(t, { dur: rand(0.004, 0.025), type: 'highpass', freq: rand(1500, 4500), level: rand(0.04, 0.3) * level, pan: rand(-0.4, 0.4) }),
  );
  k.every(1.5, 6, (t) => k.burst(t, { dur: rand(0.03, 0.08), type: 'bandpass', freq: rand(600, 1400), q: 1.5, level: 0.35 * level }));
}

function tick(k: Kit, level: number) {
  k.every(1, 1, (t) => k.burst(t, { dur: 0.006, type: 'highpass', freq: 3500, level }));
}

function water(k: Kit, level: number) {
  k.bed('pink', 'bandpass', 1400, 0.22 * level, 0.6);
  k.every(0.04, 0.16, (t) => k.chirp(t, rand(300, 700), rand(800, 1600), rand(0.03, 0.07), 0.025 * level, rand(-0.6, 0.6)));
}

function birds(k: Kit) {
  k.every(2, 7, (t) => {
    const base = rand(2400, 4800);
    const n = Math.floor(rand(2, 6));
    const pan = rand(-0.8, 0.8);
    for (let i = 0; i < n; i++) k.chirp(t + i * rand(0.09, 0.16), base * rand(0.85, 1), base * rand(1.05, 1.4), rand(0.06, 0.12), 0.035, pan);
  }, 1);
}

const RECIPES: Record<RecipeId, (k: Kit) => void> = {
  brown: (k) => k.bed('brown', 'lowpass', 900, 0.9),
  rain: (k) => rain(k),
  'rain-window': (k) => {
    rain(k);
    // Distant thunder, rarely.
    k.every(30, 80, (t) => k.burst(t, { kind: 'brown', dur: rand(3, 5), attack: 0.8, type: 'lowpass', freq: 140, level: 0.6 }), 20);
  },
  bedroom: (k) => {
    rain(k, true);
    tick(k, 0.025);
  },
  fire: (k) => {
    const { gain } = k.bed('brown', 'lowpass', 500, 0.55);
    k.lfo(0.3, 0.12, gain.gain);
    crackles(k, 1);
  },
  snow: (k) => {
    wind(k, 0.32, 380, 2.2);
    k.bed('brown', 'lowpass', 200, 0.18);
    crackles(k, 0.25);
  },
  city: (k) => {
    k.bed('brown', 'lowpass', 220, 0.5);
    k.bed('pink', 'lowpass', 900, 0.06);
    // A car passing in the distance.
    k.every(5, 14, (t) => k.burst(t, { kind: 'pink', dur: rand(2.5, 4.5), attack: rand(1.2, 2), type: 'bandpass', freq: rand(350, 700), q: 0.8, level: 0.14, pan: rand(-0.7, 0.7) }));
  },
  forest: (k) => {
    wind(k, 0.22, 600);
    birds(k);
  },
  nature: (k) => {
    wind(k, 0.15, 600);
    water(k, 0.8);
    birds(k);
  },
  ocean: (k) => {
    for (const [rate, phase] of [[0.085, 0], [0.061, 2]]) {
      const { gain, filter } = k.bed('pink', 'lowpass', 650, 0.32);
      k.lfo(rate, 420, filter.frequency);
      k.lfo(rate, 0.26, gain.gain);
      filter.frequency.value += phase * 40;
    }
    k.bed('brown', 'lowpass', 180, 0.3);
  },
  library: (k) => {
    k.bed('brown', 'lowpass', 160, 0.16);
    tick(k, 0.028);
    // A page turning nearby now and then.
    k.every(14, 40, (t) => k.burst(t, { dur: rand(0.25, 0.4), attack: 0.06, type: 'bandpass', freq: rand(2200, 3500), q: 0.8, level: 0.05, pan: rand(-0.5, 0.5) }), 5);
  },
  cafe: (k) => {
    // Murmur: band-limited voices whose loudness wanders like conversation.
    for (let i = 0; i < 4; i++) {
      const { gain } = k.bed('pink', 'bandpass', rand(320, 900), 0.08, 1.4);
      k.every(0.15, 0.45, (t) => gain.gain.setTargetAtTime(rand(0.02, 0.14), t, 0.08));
    }
    k.bed('brown', 'lowpass', 250, 0.2);
    k.every(2.5, 8, (t) => k.bell(t, rand(2600, 4200), rand(0.012, 0.03), 0.35, k.pan(rand(-0.7, 0.7))));
  },
  garden: (k) => {
    water(k, 1);
    wind(k, 0.1, 700);
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880];
    k.every(18, 45, (t) => k.bell(t, pentatonic[Math.floor(Math.random() * pentatonic.length)], 0.04, 4), 6);
  },
};

/** One independently controlled output (music or ambience) with smooth volume changes. */
export class SynthChannel {
  private out: GainNode | null = null;
  private kit: Kit | null = null;
  private recipe: RecipeId | null = null;

  private ensureOut() {
    const c = audioContext();
    if (!this.out) {
      this.out = c.createGain();
      this.out.gain.value = 0;
      this.out.connect(master!);
    }
    return this.out;
  }

  get playingRecipe() {
    return this.kit ? this.recipe : null;
  }

  play(recipe: RecipeId, volume: number) {
    const c = audioContext();
    const out = this.ensureOut();
    if (this.kit && this.recipe === recipe) return this.setVolume(volume);
    this.stopNow();
    this.recipe = recipe;
    this.kit = new Kit(c, out);
    RECIPES[recipe](this.kit);
    out.gain.cancelScheduledValues(c.currentTime);
    out.gain.setValueAtTime(0, c.currentTime);
    out.gain.linearRampToValueAtTime(volume, c.currentTime + 1.2);
  }

  setVolume(volume: number) {
    if (!this.out || !this.kit) return;
    this.out.gain.setTargetAtTime(volume, audioContext().currentTime, 0.08);
  }

  /** Fades out, then frees the graph. */
  stop() {
    if (!this.kit || !this.out) return;
    const c = audioContext();
    const kit = this.kit;
    this.kit = null;
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setTargetAtTime(0, c.currentTime, 0.25);
    setTimeout(() => kit.stop(), 1200);
  }

  private stopNow() {
    this.kit?.stop();
    this.kit = null;
  }
}

/** Gentle two-note chime for session end. Plays even when channels are muted. */
export function playChime() {
  const c = audioContext();
  if (c.state === 'suspended') void c.resume();
  const k = new Kit(c, master!);
  const t = c.currentTime + 0.05;
  k.bell(t, 659.25, 0.12, 3);
  k.bell(t + 0.45, 987.77, 0.1, 3.5);
}

/** Rising bell arpeggio for an achievement; the legendary one is longer and fuller. */
export function playUnlock(legendary = false) {
  const c = audioContext();
  if (c.state === 'suspended') void c.resume();
  const k = new Kit(c, master!);
  const t = c.currentTime + 0.05;
  const notes = legendary ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] : [659.25, 783.99, 987.77];
  notes.forEach((f, i) => k.bell(t + i * (legendary ? 0.22 : 0.14), f, legendary ? 0.09 : 0.08, legendary ? 4.5 : 2.8));
  if (legendary) k.bell(t + notes.length * 0.22 + 0.2, 523.25, 0.1, 6);
}
