import { isSaturated } from "./ads1220";

export type Sample = {
  /** performance.now()/1000 when this USB batch arrived. */
  hostT: number;
  /** Display time. Samples inside one USB batch are spread by the configured period. */
  t: number;
  counts: number;
  index: number;
};

export type StreamOptions = {
  gain: number;
  sampleRate: number;
  vref: "internal" | "analog_supply";
  /** ADS1220 input pair. Omitted on the HX717. */
  mux?: number;
};

export const GOALS = {
  rateTolerance: 0.08,
  probeNoiseGrams: 5,
  probeMinHz: 175,
  forceNoiseGrams: 1.5,
  forceMinHz: 330,
  linearityFraction: 0.01,
  linearityFloorGrams: 0.5,
  minR2: 0.995,
  hysteresisFraction: 0.02,
};

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let a = 0;
  for (const x of xs) {
    const d = x - m;
    a += d * d;
  }
  return Math.sqrt(a / (xs.length - 1));
}

export function windowTail(samples: Sample[], seconds: number): Sample[] {
  if (!samples.length) return [];
  const end = samples[samples.length - 1].t;
  const start = end - seconds;
  let i = samples.length - 1;
  while (i > 0 && samples[i - 1].t >= start) i--;
  return samples.slice(i);
}

export function rollingRate(samples: Sample[]): number | null {
  if (samples.length < 20) return null;
  const newest = samples[samples.length - 1];
  const target = newest.hostT - 2;
  let older = newest;
  for (let i = samples.length - 1; i >= 0; i--) {
    const sample = samples[i];
    // A stream restart sets the sample index back to zero.
    if (sample.index > newest.index) break;
    if (sample.hostT < target) break;
    older = sample;
  }
  const dt = newest.hostT - older.hostT;
  if (dt < 0.5) return null;
  return (newest.index - older.index) / dt;
}

/** Second-half mean minus first-half mean. A step that is still arriving shows up here. */
export function windowDrift(samples: Sample[], seconds = 1.2): { drift: number; stdev: number; n: number } | null {
  const window = windowTail(samples, seconds);
  if (window.length < 16) return null;
  const mid = Math.floor(window.length / 2);
  const first = mean(window.slice(0, mid).map((s) => s.counts));
  const second = mean(window.slice(mid).map((s) => s.counts));
  return { drift: second - first, stdev: stdev(window.map((s) => s.counts)), n: window.length };
}

export type SpeedResult = {
  configuredHz: number;
  measuredHz: number;
  samples: number;
  durationSec: number;
  saturated: number;
  unique: number;
  gaps: number;
  overflows: number;
  pass: boolean;
  notes: string[];
};

export function analyzeRate(
  samples: Sample[],
  configuredHz: number,
  durationSec: number,
  gaps: number,
  overflows: number,
  errors = 0,
): SpeedResult {
  const measuredHz = durationSec > 0 ? samples.length / durationSec : 0;
  let saturated = 0;
  const uniq = new Set<number>();
  for (const sample of samples) {
    uniq.add(sample.counts);
    if (isSaturated(sample.counts)) saturated++;
  }
  const notes: string[] = [];
  const ratio = configuredHz > 0 ? measuredHz / configuredHz : 0;
  if (samples.length < configuredHz * durationSec * 0.5) {
    notes.push("Far fewer samples than the ADS1220 was asked for.");
  }
  if (Math.abs(ratio - 1) > GOALS.rateTolerance) {
    notes.push(
      `Delivered ${measuredHz.toFixed(1)} Hz against a ${configuredHz} Hz setting (${((ratio - 1) * 100).toFixed(1)}%).`,
    );
  }
  if (overflows > 0) notes.push(`${overflows} MCU buffer overflows. The host is not keeping up, or DRDY is stuck.`);
  if (gaps > 0) notes.push(`${gaps} missing bulk-data blocks on the USB link.`);
  if (errors > 0) {
    notes.push(
      `${errors} HX717 reads failed. The bit-bang transfer desynced or ran long, which is what the alpha board's internal clock is known for.`,
    );
  }
  if (saturated > samples.length * 0.01) {
    notes.push("The ADC is against the rail. Lower the gain before trusting this rate.");
  }
  if (samples.length > 50 && uniq.size === 1) {
    notes.push("Every sample is the same count. That is a wiring or SPI problem, not a quiet cell.");
  }
  const pass =
    samples.length > 0 &&
    Math.abs(ratio - 1) <= GOALS.rateTolerance &&
    overflows === 0 &&
    gaps === 0 &&
    errors === 0 &&
    saturated <= samples.length * 0.01 &&
    uniq.size > 1;
  return {
    configuredHz,
    measuredHz,
    samples: samples.length,
    durationSec,
    saturated,
    unique: uniq.size,
    gaps,
    overflows,
    pass,
    notes,
  };
}

export type Fit = {
  countsPerGram: number;
  offsetCounts: number;
  r2: number;
  maxAbsErrorGrams: number;
  points: { grams: number; counts: number; predicted: number; errorGrams: number }[];
};

/** y = offset + countsPerGram * grams. */
export function fitLine(points: { grams: number; counts: number }[]): Fit {
  if (points.length < 2) throw new Error("Need at least two captures to fit a scale");
  const n = points.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sx += p.grams;
    sy += p.counts;
    sxx += p.grams * p.grams;
    sxy += p.grams * p.counts;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) throw new Error("The captures are all at the same mass");
  const countsPerGram = (n * sxy - sx * sy) / denom;
  const offsetCounts = (sy - countsPerGram * sx) / n;
  let ssTot = 0;
  let ssRes = 0;
  const meanY = sy / n;
  const fitted = points.map((p) => {
    const predicted = offsetCounts + countsPerGram * p.grams;
    const errorGrams = countsPerGram !== 0 ? (p.counts - predicted) / countsPerGram : 0;
    ssTot += (p.counts - meanY) ** 2;
    ssRes += (p.counts - predicted) ** 2;
    return { grams: p.grams, counts: p.counts, predicted, errorGrams };
  });
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const maxAbsErrorGrams = fitted.reduce((m, p) => Math.max(m, Math.abs(p.errorGrams)), 0);
  return { countsPerGram, offsetCounts, r2, maxAbsErrorGrams, points: fitted };
}

export type AccuracyVerdict = {
  pass: boolean;
  notes: string[];
  hysteresisGrams: number | null;
  repeatabilityGrams: number | null;
  creepGrams: number | null;
};

export function judgeAccuracy(
  fit: Fit,
  extras: {
    hysteresisGrams?: number | null;
    repeatabilityGrams?: number | null;
    creepGrams?: number | null;
    maxGrams: number;
  },
): AccuracyVerdict {
  const allowance = Math.max(GOALS.linearityFloorGrams, GOALS.linearityFraction * extras.maxGrams);
  const notes: string[] = [];
  if (fit.r2 < GOALS.minR2) notes.push(`R² is ${fit.r2.toFixed(4)}. The captures are not sitting on a straight line.`);
  if (fit.maxAbsErrorGrams > allowance) {
    notes.push(
      `Largest miss is ${fit.maxAbsErrorGrams.toFixed(2)} g. The bar for this set of masses is ${allowance.toFixed(2)} g.`,
    );
  }
  if (fit.countsPerGram <= 0) notes.push("The scale came out negative. Pressing on the cell may be wired backwards. Invert the sign and capture again.");
  const hyst = extras.hysteresisGrams ?? null;
  if (hyst !== null && hyst > GOALS.hysteresisFraction * extras.maxGrams) {
    notes.push(`Unload disagrees with load by ${hyst.toFixed(2)} g. Loctite 401 and a thick 9460 coat both do this.`);
  }
  const pass = notes.length === 0 && fit.countsPerGram > 0;
  return {
    pass,
    notes,
    hysteresisGrams: hyst,
    repeatabilityGrams: extras.repeatabilityGrams ?? null,
    creepGrams: extras.creepGrams ?? null,
  };
}

export function hysteresisOf(
  up: { grams: number; counts: number }[],
  down: { grams: number; counts: number }[],
  countsPerGram: number,
): number | null {
  if (!down.length || countsPerGram === 0) return null;
  let worst = 0;
  let found = false;
  for (const a of up) {
    const b = down.find((d) => Math.abs(d.grams - a.grams) < 1e-6);
    if (!b || a.grams === 0) continue;
    found = true;
    worst = Math.max(worst, Math.abs(a.counts - b.counts) / Math.abs(countsPerGram));
  }
  return found ? worst : null;
}

export type RangeResult = {
  noiseRmsCounts: number;
  noiseRmsGrams: number | null;
  resolutionGrams: number | null;
  maxUnsaturatedGrams: number | null;
  saturated: boolean;
  zeroReturnCounts: number | null;
  zeroShiftGrams: number | null;
  yielded: boolean;
  probeReady: boolean;
  forceReady: boolean;
  notes: string[];
};

export function analyzeRange(input: {
  noiseCounts: number[];
  countsPerGram: number | null;
  steps: { grams: number; counts: number; saturated: boolean }[];
  zeroCounts: number | null;
  returnCounts: number | null;
  bestRateHz: number | null;
  /** A noise figure typed in, instead of a captured trace. */
  noiseRmsCounts?: number | null;
}): RangeResult {
  const noiseRmsCounts =
    input.noiseRmsCounts != null && Number.isFinite(input.noiseRmsCounts)
      ? input.noiseRmsCounts
      : stdev(input.noiseCounts);
  const cpg = input.countsPerGram;
  const noiseRmsGrams = cpg && cpg > 0 ? noiseRmsCounts / cpg : null;
  const resolutionGrams = noiseRmsGrams === null ? null : 3 * noiseRmsGrams;
  let maxUnsaturatedGrams: number | null = null;
  let saturated = false;
  for (const step of input.steps) {
    if (step.saturated) {
      saturated = true;
      break;
    }
    maxUnsaturatedGrams = step.grams;
  }
  const zeroReturnCounts =
    input.zeroCounts !== null && input.returnCounts !== null ? input.returnCounts - input.zeroCounts : null;
  const zeroShiftGrams =
    zeroReturnCounts !== null && cpg && cpg > 0 ? Math.abs(zeroReturnCounts) / cpg : null;
  const yielded = zeroShiftGrams !== null && noiseRmsGrams !== null && zeroShiftGrams > Math.max(5 * noiseRmsGrams, 1);
  const notes: string[] = [];
  if (noiseRmsGrams === null) notes.push("Calibrate on the Accuracy tab to turn the noise into grams.");
  if (saturated) notes.push("The ADC hit the rail. That load is past this gain. Drop the gain, or stop there.");
  if (yielded) notes.push("Zero did not come back. The aluminum or the Loctite 401 took a set. Do not use a higher load.");
  const probeReady =
    (noiseRmsGrams === null || noiseRmsGrams * 3 <= GOALS.probeNoiseGrams) &&
    (input.bestRateHz === null || input.bestRateHz >= GOALS.probeMinHz) &&
    !yielded;
  const forceReady =
    noiseRmsGrams !== null &&
    noiseRmsGrams * 3 <= GOALS.forceNoiseGrams &&
    (input.bestRateHz === null || input.bestRateHz >= GOALS.forceMinHz) &&
    !yielded;
  if (probeReady && noiseRmsGrams !== null) {
    notes.push("Noise and rate are in the range Klipper probing can use.");
  }
  if (forceReady) notes.push("Quiet enough, and fast enough, to try an extrusion force trace for pressure advance.");
  return {
    noiseRmsCounts,
    noiseRmsGrams,
    resolutionGrams,
    maxUnsaturatedGrams,
    saturated,
    zeroReturnCounts,
    zeroShiftGrams,
    yielded,
    probeReady,
    forceReady,
    notes,
  };
}

export async function collectSamples(
  subscribe: (cb: (batch: Sample[]) => void) => () => void,
  seconds: number,
  onProgress?: (fraction: number) => void,
  shouldAbort?: () => boolean,
): Promise<{ samples: Sample[]; durationSec: number }> {
  const early: Sample[] = [];
  let unsub = subscribe((batch) => early.push(...batch));
  const armStart = nowSec();
  while (early.length === 0 && nowSec() - armStart < 2) {
    if (shouldAbort?.()) {
      unsub();
      return { samples: [], durationSec: 0.001 };
    }
    await delay(20);
  }
  unsub();
  const samples: Sample[] = [];
  unsub = subscribe((batch) => samples.push(...batch));
  const t0 = nowSec();
  while (nowSec() - t0 < seconds) {
    if (shouldAbort?.()) break;
    onProgress?.(Math.min(1, (nowSec() - t0) / seconds));
    await delay(40);
  }
  unsub();
  onProgress?.(1);
  return { samples, durationSec: Math.max(0.001, nowSec() - t0) };
}

export function captureMean(samples: Sample[], seconds = 1.2): { mean: number; stdev: number; n: number } | null {
  const window = windowTail(samples, seconds);
  if (window.length < 8) return null;
  const xs = window.map((s) => s.counts);
  return { mean: mean(xs), stdev: stdev(xs), n: xs.length };
}

function nowSec(): number {
  return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
