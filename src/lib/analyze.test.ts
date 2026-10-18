import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRate, fitLine, hysteresisOf, judgeAccuracy, analyzeRange } from "./analyze.ts";
import { SimulatorSource } from "./simulator.ts";
import { estimateScale, CELL } from "./model.ts";
import type { Sample } from "./analyze.ts";

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
