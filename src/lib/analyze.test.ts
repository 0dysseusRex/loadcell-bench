import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRate, fitLine, hysteresisOf, judgeAccuracy, analyzeRange, rollingRate, windowDrift } from "./analyze.ts";
import { SimulatorSource } from "./simulator.ts";
import { bendingStiffness, estimateScale, rootGridFraction, CELL } from "./model.ts";
import type { Sample } from "./analyze.ts";

test("steel modulus lowers counts in proportion to stiffness", () => {
  const shared = {
    neckWidthMm: 1.6,
    neckLengthMm: 8,
    neckCount: 2,
    gain: 128,
    vref: "internal" as const,
    thicknessMm: 2.54,
    gaugeFactor: 2,
  };
  const aluminum = estimateScale({ ...shared, youngMpa: 68900, yieldMpa: 276 });
  const steel = estimateScale({ ...shared, youngMpa: 200000, yieldMpa: 250 });
  const ratio = steel.countsPerGram / aluminum.countsPerGram;
  assert.ok(Math.abs(ratio - 68900 / 200000) < 1e-9, `ratio ${ratio}`);
  assert.ok(steel.yieldKg != null && aluminum.yieldKg != null);
  assert.ok(Math.abs(steel.yieldKg / aluminum.yieldKg - 250 / 276) < 1e-9);
});

test("bridge arms and the strain fraction scale the output", () => {
  const shared = {
    neckWidthMm: 1.6,
    neckLengthMm: 8,
    neckCount: 2,
    gain: 64,
    vref: "internal" as const,
  };
  const full = estimateScale({ ...shared, bridge: "full", strainFraction: 1 });
  const half = estimateScale({ ...shared, bridge: "half" });
  const quarter = estimateScale({ ...shared, bridge: "quarter", strainFraction: 0.5 });
  assert.ok(Math.abs(half.countsPerGram * 2 - full.countsPerGram) < 1e-6);
  assert.ok(Math.abs(quarter.countsPerGram * 8 - full.countsPerGram) < 1e-6);
  assert.equal(half.yieldKg, full.yieldKg);
});

test("a short grid at the root averages below the peak", () => {
  const fraction = rootGridFraction(2, 8);
  assert.ok(fraction !== null && Math.abs(fraction - 0.75) < 1e-9);
  assert.equal(rootGridFraction(5.3, 8), null);
});

test("four necks are twice as stiff as two of the same width", () => {
  const shared = { youngMpa: 68900, yieldMpa: 276, thicknessMm: 2.54, neckWidthMm: 1.6, neckLengthMm: 8 };
  const two = bendingStiffness({ ...shared, neckCount: 2 });
  const four = bendingStiffness({ ...shared, neckCount: 4 });
  assert.ok(two && four);
  assert.ok(Math.abs(four.stiffnessNPerMm / two.stiffnessNPerMm - 2) < 1e-9);
  assert.ok(Math.abs(four.youngGpa - 68.9) < 1e-9);
  assert.equal(bendingStiffness({ ...shared, neckCount: 2, neckWidthMm: 0 }), null);
});

test("doubling leaf thickness quarters the counts per gram", () => {
  const shared = {
    neckWidthMm: 1.6,
    neckLengthMm: 8,
    neckCount: 2,
    gain: 128,
    vref: "internal" as const,
  };
  const base = estimateScale({ ...shared, thicknessMm: 2.54 });
  const thick = estimateScale({ ...shared, thicknessMm: 5.08 });
  assert.ok(Math.abs(thick.countsPerGram * 4 - base.countsPerGram) / base.countsPerGram < 0.01);
});

test("an entered sensitivity replaces the leaf sketch", () => {
  const sim = new SimulatorSource();
  sim.setSensitivity(10);
  const zero = mean(sim.generate(2, 0));
  const loaded = mean(sim.generate(2, 100));
  const cpg = (loaded - zero) / 100;
  assert.ok(Math.abs(cpg - 10) < 1, `got ${cpg}`);
});

test("a straight calibration fits", () => {
  const points = [0, 100, 200, 500, 1000].map((grams) => ({ grams, counts: 1200 + 40 * grams }));
  const fit = fitLine(points);
  assert.ok(Math.abs(fit.countsPerGram - 40) < 1e-6);
  assert.ok(Math.abs(fit.offsetCounts - 1200) < 1e-6);
  assert.ok(fit.r2 > 0.999999);
  const verdict = judgeAccuracy(fit, { maxGrams: 1000 });
  assert.equal(verdict.pass, true);
});

test("speed report passes a clean 330 Hz capture", () => {
  const samples: Sample[] = [];
  for (let i = 0; i < 1320; i++) {
    samples.push({ hostT: i / 330, t: i / 330, index: i, counts: 1000 + (i % 17) });
  }
  const report = analyzeRate(samples, 330, 4, 0, 0);
  assert.equal(report.pass, true);
  assert.ok(Math.abs(report.measuredHz - 330) < 1);
});

test("speed report fails a stuck count and a slow link", () => {
  const stuck: Sample[] = Array.from({ length: 100 }, (_, i) => ({
    hostT: i / 20,
    t: i / 20,
    index: i,
    counts: 5,
  }));
  const report = analyzeRate(stuck, 330, 4, 2, 1);
  assert.equal(report.pass, false);
  assert.ok(report.notes.length >= 2);
});

test("simulator scale is near the sketch and the rate is exact", () => {
  const sim = new SimulatorSource();
  const opts = {
    gain: 64,
    sampleRate: 330,
    vref: "internal" as const,
    neckWidthMm: CELL.defaultNeckWidthMm,
    neckLengthMm: CELL.defaultNeckLengthMm,
    neckCount: CELL.defaultNeckCount,
  };
  Object.assign(sim, {});
  // start() resets the clock; generate() uses the current options, so set them via start's fields.
  return sim.start(opts).then(async () => {
    await sim.stop();
    const sketch = estimateScale(opts).countsPerGram;
    const zero = sim.generate(2, 0);
    const loaded = sim.generate(2, 500);
    const cpg = (mean(loaded) - mean(zero)) / 500;
    assert.ok(Math.abs(cpg - sketch) / sketch < 0.05, `got ${cpg} vs sketch ${sketch}`);
    assert.equal(zero.length, 660);
    const rate = analyzeRate(zero, 330, 2, 0, 0);
    assert.equal(rate.pass, true);
    const up = [0, 200, 500].map((grams) => ({
      grams,
      counts: mean(sim.generate(0.5, grams)),
    }));
    const fit = fitLine(up);
    assert.ok(fit.r2 > 0.999);
    const down = [{ grams: 200, counts: up[1].counts - fit.countsPerGram * 0.2 }];
    const hyst = hysteresisOf(up, down, fit.countsPerGram);
    assert.ok(hyst !== null && Math.abs(hyst - 0.2) < 0.05);
  });
});

test("a load step settles on the sketch and creep ignores the bridge offset", async () => {
  const sim = new SimulatorSource();
  const opts = {
    gain: 64,
    sampleRate: 330,
    vref: "internal" as const,
    neckWidthMm: CELL.defaultNeckWidthMm,
    neckLengthMm: CELL.defaultNeckLengthMm,
    neckCount: CELL.defaultNeckCount,
  };
  const sketch = estimateScale(opts).countsPerGram;
  await sim.start(opts);
  try {
    const zero = mean(sim.generate(0.4, 0));
    const offset =
      0.0035 * (CELL.assumedExcitationV / CELL.internalRefV) * opts.gain * 8388608;
    assert.ok(Math.abs(zero - offset) / sketch < 1, `zero drifted ${((zero - offset) / sketch).toFixed(2)} g`);
    sim.setLoad(500);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const got: Sample[] = [];
    const unsub = sim.subscribe((batch) => got.push(...batch));
    await new Promise((resolve) => setTimeout(resolve, 400));
    unsub();
    assert.ok(got.length > 20, "expected samples after the step");
    const grams = (mean(got) - zero) / sketch;
    assert.ok(Math.abs(grams - 500) < 3, `read ${grams.toFixed(2)} g`);
  } finally {
    await sim.stop();
  }
});

test("rate ignores a sample-index restart", () => {
  const samples: Sample[] = [];
  for (let i = 0; i < 100; i++) samples.push({ hostT: i / 330, t: i / 330, index: 5000 + i, counts: 1 });
  for (let i = 0; i < 400; i++) samples.push({ hostT: 1 + i / 330, t: 1 + i / 330, index: i, counts: 2 });
  const rate = rollingRate(samples);
  assert.ok(rate !== null && Math.abs(rate - 330) < 5, `rate ${rate}`);
});

test("window drift flags a step and ignores quiet noise", () => {
  const quiet: Sample[] = [];
  for (let i = 0; i < 40; i++) quiet.push({ hostT: i / 20, t: i / 20, index: i, counts: 1000 + (i % 2) });
  const still = windowDrift(quiet, 2);
  assert.ok(still && Math.abs(still.drift) < 5);
  const stepped: Sample[] = [];
  for (let i = 0; i < 40; i++) stepped.push({ hostT: i / 20, t: i / 20, index: i, counts: i < 20 ? 1000 : 5000 });
  const moving = windowDrift(stepped, 2);
  assert.ok(moving && moving.drift > 3000);
});

test("range verdict flags a zero shift", () => {
  const range = analyzeRange({
    noiseCounts: [100, 102, 98, 101, 99, 100],
    countsPerGram: 20,
    steps: [
      { grams: 100, counts: 2000, saturated: false },
      { grams: 500, counts: 10000, saturated: false },
    ],
    zeroCounts: 1000,
    returnCounts: 1400,
    bestRateHz: 330,
  });
  assert.equal(range.yielded, true);
  assert.equal(range.maxUnsaturatedGrams, 500);
  assert.ok((range.noiseRmsGrams ?? 0) < 1);
});

function mean(samples: Sample[]): number {
  let s = 0;
  for (const sample of samples) s += sample.counts;
  return s / samples.length;
}
