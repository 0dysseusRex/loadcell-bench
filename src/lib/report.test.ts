import assert from "node:assert/strict";
import test from "node:test";
import type { SpeedResult } from "./analyze.ts";
import { compileReport, type ReportModel } from "./report.ts";

function speed(configuredHz: number, measuredHz: number, pass: boolean): SpeedResult {
  return {
    configuredHz,
    measuredHz,
    samples: Math.round(measuredHz * 4),
    durationSec: 4,
    saturated: 0,
    unique: pass ? 80 : 1,
    gaps: 0,
    overflows: 0,
    pass,
    notes: pass ? [] : ["Every sample is the same count. That is a wiring or SPI problem, not a quiet cell."],
  };
}

function model(overrides: Partial<ReportModel> = {}): ReportModel {
  return {
    cellName: "K2 redesign",
    materialName: "6061-T6 aluminum",
    thicknessMm: 2.54,
    neckCount: 4,
    neckWidthMm: 1.6,
    neckLengthMm: 8,
    gaugeName: "BA1000-3AA",
    gaugeFactor: 2,
    resistanceOhm: 1000,
    bridge: "full",
    gaugeMount: "same-face",
    frontLabel: "H36 + mini ADS1220",
    gain: 64,
    sampleRate: 330,
    mode: "sim",
    scaleSource: "calibration",
    countsPerGram: 40,
    tare: 1_000_000,
    ratedGrams: 5000,
    speed: [speed(175, 174, true), speed(330, 328, true)],
    fit: {
      countsPerGram: 40,
      offsetCounts: 1_000_000,
      r2: 0.9999,
      maxAbsErrorGrams: 0.12,
      points: [],
    },
    verdict: {
      pass: true,
      notes: [],
      hysteresisGrams: 0.4,
      repeatabilityGrams: null,
      creepGrams: null,
    },
    range: {
      noiseRmsCounts: 1.2,
      noiseRmsGrams: 0.03,
      resolutionGrams: 0.09,
      maxUnsaturatedGrams: 2000,
      saturated: false,
      zeroReturnCounts: 2,
      zeroShiftGrams: 0.05,
      yielded: false,
      probeReady: true,
      forceReady: true,
      notes: ["Noise and rate are in the range Klipper probing can use."],
    },
    ...overrides,
  };
}

test("a finished simulator run reads as a plain summary", () => {
  const report = compileReport(model());
  assert.equal(report.title, "K2 redesign");
  assert.match(report.lede, /built-in simulator/);
  assert.match(report.lede, /328 readings a second/);
  assert.match(report.lede, /40\.0 counts/);
  assert.match(report.lede, /0\.09 g/);
  const speed = report.sections.find((section) => section.id === "speed");
  assert.ok(speed);
  assert.match(speed.paragraphs[0], /328 readings a second/);
  const accuracy = report.sections.find((section) => section.id === "accuracy");
  assert.match(accuracy?.rows.find((row) => row.label === "Unload gap")?.value ?? "", /0\.40 g/);
  const printer = report.sections.find((section) => section.id === "printer");
  assert.match(printer?.paragraphs.join(" ") ?? "", /LOAD_CELL_TEST_TAP/);
  assert.match(printer?.paragraphs.join(" ") ?? "", /Pressure advance stays a setting you choose/);
});

test("a blank OEM neck is left blank", () => {
  const report = compileReport(
    model({
      cellName: "OEM K2",
      neckCount: 2,
      neckWidthMm: null,
      neckLengthMm: null,
      gaugeMount: "back-to-back",
      materialName: "Alloy steel",
    }),
  );
  const necks = report.sections.find((section) => section.id === "cell")?.rows.find((row) => row.label === "Necks");
  assert.match(necks?.value ?? "", /2 necks/);
  assert.match(necks?.value ?? "", /blank/);
  assert.doesNotMatch(necks?.value ?? "", /1\.60/);
});

test("a failed sweep is described as a miss", () => {
  const report = compileReport(model({ speed: [speed(320, 40, false)], mode: "mcu" }));
  assert.match(report.lede, /No requested speed passed/);
  assert.match(report.lede, /over USB/);
  const speedSection = report.sections.find((section) => section.id === "speed");
  assert.match(speedSection?.paragraphs[0] ?? "", /missed the pass bar/);
  assert.match(speedSection?.rows[0]?.value ?? "", /Fail/);
});
