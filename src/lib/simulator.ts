import { estimateScale, CELL } from "./model";
import { isSaturated, FULL_SCALE_COUNTS } from "./ads1220";
import type { Sample, StreamOptions } from "./analyze";

export type SimOptions = StreamOptions & {
  neckWidthMm: number;
  neckLengthMm: number;
  neckCount: number;
  /** Bridge imbalance as a fraction of excitation. Real CA bonds are rarely zero. */
  offsetRatio?: number;
};

type Listener = (batch: Sample[]) => void;

/**
 * A stand-in for the H36 path. The mechanics are the sketch in model.ts,
 * plus ADC quantization, a fixed bridge offset, a little creep, and noise.
 */
export class SimulatorSource {
  readonly kind = "simulator" as const;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private index = 0;
  private origin = 0;
  private nextAt = 0;
  private opts: SimOptions = {
    gain: 64,
    sampleRate: 330,
    vref: "internal",
    neckWidthMm: CELL.defaultNeckWidthMm,
    neckLengthMm: CELL.defaultNeckLengthMm,
    neckCount: CELL.defaultNeckCount,
    offsetRatio: 0.0035,
  };
  private grams = 0;
  private appliedAt = 0;
  /** Mechanical counts at the moment the load last changed. */
  private creepFrom = 0;
  /** Adhesive creep, in counts, already present when the load last changed. */
  private creepCarry = 0;
  private rng = mulberry32(0x4b32);
  overflows = 0;
  gaps = 0;

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async start(opts: StreamOptions): Promise<void> {
    this.opts = { ...this.opts, ...opts };
    this.stopClock();
    this.index = 0;
    this.origin = now();
    this.nextAt = this.origin;
    this.rng = mulberry32(0x4b32 ^ (opts.gain * 1000 + opts.sampleRate));
    // First start sits on the offset. A ramp up from zero counts would look like a load.
    if (this.appliedAt === 0) {
      this.creepFrom = this.elasticCounts(this.grams);
      this.creepCarry = this.creepTarget(this.grams);
      this.appliedAt = now();
    }
    const periodMs = 1000 / opts.sampleRate;
    this.timer = setInterval(() => this.tick(periodMs), Math.min(50, periodMs));
  }

  async stop(): Promise<void> {
    this.stopClock();
  }

  setGeometry(neckWidthMm: number, neckLengthMm: number, neckCount: number) {
    this.opts = { ...this.opts, neckWidthMm, neckLengthMm, neckCount };
  }

  setLoad(grams: number) {
    if (grams === this.grams) return;
    const t = now();
    const age = Math.max(0, t - this.appliedAt);
    const previous = this.elasticCounts(this.grams);
    this.creepFrom = this.creepFrom + (previous - this.creepFrom) * (1 - Math.exp(-age / 0.08));
    const previousCreep = this.creepTarget(this.grams);
    this.creepCarry = this.creepCarry + (previousCreep - this.creepCarry) * (1 - Math.exp(-age / 18));
    this.appliedAt = t;
    this.grams = grams;
  }

  getLoad(): number {
    return this.grams;
  }

  sketchCountsPerGram(): number {
    return estimateScale(this.opts).countsPerGram;
  }

  /** Synchronous samples for tests. Load is constant and already settled. */
  generate(seconds: number, grams: number): Sample[] {
    const prev = {
      grams: this.grams,
      appliedAt: this.appliedAt,
      creepFrom: this.creepFrom,
      creepCarry: this.creepCarry,
    };
    this.grams = grams;
    this.appliedAt = -1000;
    this.creepFrom = this.elasticCounts(grams);
    this.creepCarry = this.creepTarget(grams);
    const sps = this.opts.sampleRate;
    const n = Math.round(seconds * sps);
    const out: Sample[] = [];
    const t0 = 10_000;
    for (let i = 0; i < n; i++) {
      const t = t0 + i / sps;
      out.push({
        hostT: t,
        t,
        index: i,
        counts: this.countsAt(t, i),
      });
    }
    this.grams = prev.grams;
    this.appliedAt = prev.appliedAt;
    this.creepFrom = prev.creepFrom;
    this.creepCarry = prev.creepCarry;
    return out;
  }

  private stopClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(periodMs: number) {
    const t = now();
    const batch: Sample[] = [];
    let guard = 0;
    while (this.nextAt <= t && guard < 500) {
      const sampleT = this.nextAt;
      const index = this.index++;
      batch.push({
        hostT: t,
        t: sampleT,
        index,
        counts: this.countsAt(sampleT, index),
      });
      this.nextAt += periodMs / 1000;
      guard++;
    }
    if (!batch.length) return;
    for (const cb of this.listeners) cb(batch);
  }

  private elasticCounts(grams: number): number {
    const scale = estimateScale(this.opts);
    const ratio = this.bridgeRatio(grams, scale.countsPerGram);
    return ratio;
  }

  private offsetCounts(): number {
    return (
      (this.opts.offsetRatio ?? 0.0035) *
      (this.opts.vref === "analog_supply" ? 1 : CELL.assumedExcitationV / CELL.internalRefV) *
      this.opts.gain *
      8388608
    );
  }

  /** Creep is a fraction of the load signal. The bridge offset is not a load. */
  private creepTarget(grams: number): number {
    return (this.elasticCounts(grams) - this.offsetCounts()) * 0.003;
  }

  private bridgeRatio(grams: number, countsPerGram: number): number {
    const offset = this.offsetCounts();
    // A small stiffening at high load, about 0.4% at 1 kg.
    const stiff = 1 - 0.000004 * grams;
    return offset + countsPerGram * grams * stiff;
  }

  private countsAt(t: number, index: number): number {
    const target = this.elasticCounts(this.grams);
    const age = Math.max(0, t - this.appliedAt);
    // The aluminum step is quick. Loctite 401 then creeps a few tenths of a
    // percent of the load, over ~20 s. Creep does not scale with the offset.
    const settled = this.creepFrom + (target - this.creepFrom) * (1 - Math.exp(-age / 0.08));
    const creepTarget = this.creepTarget(this.grams);
    const creep = this.creepCarry + (creepTarget - this.creepCarry) * (1 - Math.exp(-age / 18));
    const noise = gauss(this.rng) * this.noiseCounts();
    const hum = Math.sin(2 * Math.PI * 60 * t + (index % 7)) * this.noiseCounts() * 0.25;
    let counts = settled + creep + noise + hum;
    if (counts > FULL_SCALE_COUNTS) counts = FULL_SCALE_COUNTS;
    if (counts < -FULL_SCALE_COUNTS - 1) counts = -FULL_SCALE_COUNTS - 1;
    return Math.round(counts);
  }

  private noiseCounts(): number {
    // Input-referred, so grams of noise stay put when gain changes.
    const ratio = 4.5e-7;
    const front =
      this.opts.vref === "analog_supply" ? 1 : CELL.assumedExcitationV / CELL.internalRefV;
    return ratio * front * this.opts.gain * 8388608;
  }
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function now(): number {
  return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
}

export function saturatedFraction(samples: Sample[]): number {
  if (!samples.length) return 0;
  let n = 0;
  for (const s of samples) if (isSaturated(s.counts)) n++;
  return n / samples.length;
}
