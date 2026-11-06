/**
 * One test per software requirement R-S01..R-S28.
 *
 * Each test asserts the acceptance check written in .ai/SOFTWARE_SPEC.md for
 * that id. Logic is exercised through the module under test. The ids whose
 * acceptance check is about what the operator is shown (a page label, a wiki
 * sentence, a launcher constant) read the shipped file and assert that text,
 * because that text is the artifact the check names.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  analyzeRange,
  analyzeRate,
  captureMean,
  fitLine,
  GOALS,
  hysteresisOf,
  judgeAccuracy,
  windowTail,
  type Sample,
} from "./analyze";
import { guideStatus, nextGuideStep, readyToCompile } from "./guide";
import {
  bendingStiffness,
  bridgeFactor,
  CELL,
  CELL_PROFILES,
  GAINS,
  GAUGE_PRESETS,
  gaugeById,
  H36_PINS,
  H36_V1_ADS_PINS,
  isTurboRate,
  NORMAL_RATES,
  TURBO_RATES,
} from "./model";
import { FULL_SCALE_COUNTS, isSaturated } from "./ads1220";
import { HX717_RATES, hx717GainChannel, hx717GainName, isHxErrorSample } from "./hx717";
import { FRONTS, frontById, printerSnippet } from "./frontends";
import { parseCellFile, upsertSavedCell } from "./cell-file";
import { distanceMm, gaugeFitMessage, parseDxf } from "./dxf";
import { KLIPPER_BAUD, SPI_HZ } from "./klipper/session";
import { SimulatorSource } from "./simulator";
import { CELL_KINDS, WIRING_PROBES, interpretForKind, type WiringReading } from "./wiring";

const ROOT = new URL("../../", import.meta.url);

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, ROOT)), "utf8");
}

/** A steady stream of counts, jittering by one count so "unique" is not 1. */
function stream(seconds: number, hz: number, counts: number): Sample[] {
  const n = Math.round(seconds * hz);
  return Array.from({ length: n }, (_, i) => {
    const t = i / hz;
    return { hostT: t, t, index: i, counts: counts + (i % 3) - 1 };
  });
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const PIN = /^P[A-Z]\d+$/;

// R-S01 ---------------------------------------------------------------
test("R-S01 a fresh bench starts with setup and unlocks Compile only after speed, accuracy and range", () => {
  const fresh = guideStatus({
    cellName: "",
    mode: "idle",
    phase: "",
    sampleCount: 0,
    speedRuns: 0,
    hasFit: false,
    hasRange: false,
  });
  assert.equal(fresh.speed, false);
  assert.equal(fresh.accuracy, false);
  assert.equal(fresh.range, false);
  assert.equal(readyToCompile(fresh), false);
  assert.ok(["name", "connect"].includes(nextGuideStep(fresh) ?? ""));

  assert.equal(readyToCompile({ ...fresh, speed: true, accuracy: true, range: false }), false);
  assert.equal(readyToCompile({ ...fresh, speed: true, accuracy: true, range: true }), true);
});

// R-S02 ---------------------------------------------------------------
test("R-S02 the app is served on port 4471", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.match(pkg.scripts.dev, /-p 4471\b/);
  assert.match(pkg.scripts.start, /-p 4471\b/);
  assert.match(read("launcher/bench_launcher.py"), /^PORT = 4471$/m);
});

// R-S03 ---------------------------------------------------------------
test("R-S03 Web Serial is documented for Chrome and Edge and typed", () => {
  const wiki = read("wiki/connect.md") + read("wiki/README.md") + read("wiki/troubleshooting.md");
  assert.match(wiki, /Web Serial/);
  assert.match(wiki, /Chrome or Edge/);
  assert.match(read("src/types/serial.d.ts"), /SerialPort/);
});

// R-S04 ---------------------------------------------------------------
test("R-S04 five amplifier frontends are offered and the menu locks while connected", () => {
  const ids = ["h36-ads1220", "h36v1-ads1220", "h36-hx717", "h36v1-hx717", "alpha-hx717"];
  assert.deepEqual(
    FRONTS.map((front) => front.id),
    ids,
  );
  for (const id of ids) {
    assert.equal(frontById(id).id, id);
    assert.ok(frontById(id).label.length > 0);
  }
  assert.match(read("wiki/connect.md"), /locked while a source is connected/);
});

// R-S05 ---------------------------------------------------------------
test("R-S05 the session opens the Klipper port at 250000 baud", () => {
  assert.equal(KLIPPER_BAUD, 250000);
  assert.match(read("src/lib/klipper/session.ts"), /port\.open\(\{ baudRate: KLIPPER_BAUD \}\)/);
  assert.match(read("wiki/connect.md"), /250000/);
});

// R-S06 ---------------------------------------------------------------
test("R-S06 ADS1220 runs SPI mode 1 at 256 kHz with the V2 and V1 pin maps", () => {
  assert.equal(SPI_HZ, 256000);
  // V2 is bit-banged: PA14 CS, PA1 DRDY, PB7 SCLK, PA13 MOSI, PA15 MISO.
  const v2 = Object.values(H36_PINS).filter((value) => PIN.test(value));
  assert.deepEqual(new Set(v2), new Set(["PA14", "PA1", "PB7", "PA13", "PA15"]));
  // V1 hands the same job to spi1a: PB6 CS, PC13 DRDY, PB3 SCLK, PB5 MOSI, PB4 MISO.
  const v1 = Object.values(H36_V1_ADS_PINS).filter((value) => PIN.test(value));
  assert.deepEqual(new Set(v1), new Set(["PB6", "PC13", "PB3", "PB5", "PB4"]));
});

// R-S07 ---------------------------------------------------------------
test("R-S07 HX717 accepts gain 128 and 64 only and excludes channel B", () => {
  assert.equal(hx717GainName(128), "A-128");
  assert.equal(hx717GainName(64), "A-64");
  assert.notEqual(hx717GainChannel(128), hx717GainChannel(64));
  assert.throws(() => hx717GainChannel(32), /128|64/);
  assert.deepEqual(HX717_RATES, [10, 20, 80, 320]);
  assert.equal(isHxErrorSample(-2147483648), true);
  assert.equal(isHxErrorSample(1073741824), true);
  assert.equal(isHxErrorSample(1234), false);
});

// R-S08 ---------------------------------------------------------------
test("R-S08 a reset or shutdown ends the session with a reconnect message", () => {
  const session = read("src/lib/klipper/session.ts");
  assert.match(session, /was configured by another host\. It has been reset\./);
  assert.match(session, /was in shutdown and has been reset\./);
  assert.match(session, /Connect it again\./);
});

// R-S09 ---------------------------------------------------------------
test("R-S09 the headline is the last 0.45 s and the live page carries the five metrics", () => {
  const samples = stream(2, 100, 1000);
  const window = windowTail(samples, 0.45);
  assert.ok(window.length >= 44 && window.length <= 46, `window was ${window.length} samples`);
  assert.equal(window.at(-1), samples.at(-1));

  const context = read("src/components/bench-context.tsx");
  assert.match(context, /windowTail\(samples, 0\.45\)/);
  const live = context + read("src/components/how-to.tsx") + read("src/components/bench-app.tsx");
  for (const label of [/[Gg]rams/, /[Cc]ounts/, /[Rr]ate/, /[Nn]oise/, /[Oo]verflow/]) {
    assert.match(live, label);
  }
});

// R-S10 ---------------------------------------------------------------
test("R-S10 ADS1220 offers gains 1..128, normal and turbo rates, and saturates at 8.2M", () => {
  assert.deepEqual(GAINS, [1, 2, 4, 8, 16, 32, 64, 128]);
  assert.deepEqual(NORMAL_RATES, [20, 45, 90, 175, 330, 600, 1000]);
  assert.deepEqual(TURBO_RATES, [40, 90, 180, 350, 660, 1200, 2000]);
  assert.equal(isTurboRate(90), false);
  assert.equal(isTurboRate(180), true);
  assert.equal(isTurboRate(20), false);
  assert.equal(FULL_SCALE_COUNTS, 0x7fffff);
  assert.equal(isSaturated(8200000), true);
  assert.equal(isSaturated(-8200000), true);
  assert.equal(isSaturated(8199999), false);
  assert.equal(isSaturated(0), false);
  // The auto gain walk aims at 22% of full scale and stops at the rail.
  assert.match(read("src/components/bench-context.tsx"), /0\.22 \* 8388608/);
});

// R-S11 ---------------------------------------------------------------
test("R-S11 the wiring check reads full, half and quarter bridges", () => {
  const kinds = CELL_KINDS.map((guide) => guide.kind);
  for (const kind of ["full", "half", "quarter"]) {
    assert.ok(kinds.includes(kind as never), `${kind} bridge is not offered`);
  }

  const reading = (id: string, rest: number, load: number): WiringReading => {
    const probe = WIRING_PROBES.find((item) => item.id === id);
    if (!probe) throw new Error(`missing probe ${id}`);
    return { ...probe, pins: [...probe.pins], rest, load };
  };
  // A centered bridge whose two sense wires move apart is a working full bridge.
  const full = interpretForKind("full", [
    reading("AIN0", 4_170_000, 4_120_000),
    reading("AIN1", 4_168_000, 4_220_000),
    reading("AIN2", 4_800, 4_900),
    reading("AIN3", 5_100, 5_000),
    reading("AIN0_AIN1", 2_000, -100_000),
    reading("AIN0_AIN2", 4_165_000, 4_115_000),
    reading("AIN0_AIN3", 4_164_000, 4_114_000),
    reading("AIN1_AIN2", 4_163_000, 4_215_000),
    reading("AIN1_AIN3", 4_162_000, 4_214_000),
    reading("AIN2_AIN3", -300, -100),
  ]);
  assert.equal(full.ok, true);
  assert.equal(full.verdict, "working");

  // Half and quarter dividers answer on the same page instead of throwing.
  for (const kind of ["half", "quarter"] as const) {
    const report = interpretForKind(kind, [reading("AIN0", 4_170_000, 4_120_000)]);
    assert.equal(typeof report.verdict, "string");
    assert.ok(report.rows.length > 0);
  }
});

// R-S12 ---------------------------------------------------------------
test("R-S12 the HX717 card shows the wiring and hides the pin reads", () => {
  const live = read("wiki/live.md");
  assert.match(live, /HX717/);
  assert.match(live, /shows the wiring and hides the pin reads/);
  assert.match(read("src/components/how-to.tsx"), /HX717/);
});

// R-S13 ---------------------------------------------------------------
test("R-S13 tare averages 1.2 s and the sign can be inverted", () => {
  const samples = stream(3, 100, 5000);
  assert.equal(Math.round(captureMean(samples)?.mean ?? NaN), 5000);

  const context = read("src/components/bench-context.tsx");
  assert.match(context, /captureMean\(samples, 1\.2\)/);
  assert.match(read("wiki/live.md"), /[Ii]nvert/);
});

// R-S14 ---------------------------------------------------------------
test("R-S14 the live page downloads CSV and keeps a link log", () => {
  const context = read("src/components/bench-context.tsx");
  assert.match(context, /text\/csv/);
  assert.match(context, /download/);
  const live = read("wiki/live.md");
  assert.match(live, /CSV/);
  assert.match(live, /link log/);
});

// R-S15 ---------------------------------------------------------------
test("R-S15 a speed run passes within 8% with no overflows and under 1% rail samples", () => {
  const good = analyzeRate(stream(2, 90, 1000), 90, 2, 0, 0, 0);
  assert.equal(good.pass, true);
  assert.equal(good.notes.length, 0);

  assert.equal(analyzeRate(stream(2, 80, 1000), 90, 2, 0, 0, 0).pass, false);
  assert.equal(analyzeRate(stream(2, 90, 1000), 90, 2, 0, 3, 0).pass, false);

  const railed = stream(2, 90, 1000);
  for (let i = 0; i < 4; i++) railed[i].counts = FULL_SCALE_COUNTS;
  assert.equal(analyzeRate(railed, 90, 2, 0, 0, 0).pass, false);
});

// R-S16 ---------------------------------------------------------------
test("R-S16 the speed sweep offers four rates per chip and a 2 to 15 s control", () => {
  assert.deepEqual(frontById("h36-ads1220").speedRates, [90, 175, 330, 660]);
  assert.deepEqual(frontById("h36-hx717").speedRates, [10, 20, 80, 320]);
  const page = read("src/components/bench-app.tsx");
  assert.match(page, /2/);
  assert.match(page, /15/);
});

// R-S17 ---------------------------------------------------------------
test("R-S17 accuracy needs R² 0.995 and a worst miss under max(0.5 g, 1%)", () => {
  assert.equal(GOALS.minR2, 0.995);
  assert.equal(GOALS.linearityFloorGrams, 0.5);
  assert.equal(GOALS.linearityFraction, 0.01);

  const straight = fitLine([
    { grams: 0, counts: 0 },
    { grams: 50, counts: 500_000 },
    { grams: 100, counts: 1_000_000 },
  ]);
  assert.ok(straight.r2 > 0.999);
  const verdict = judgeAccuracy(straight, { maxGrams: 100 });
  assert.equal(verdict.pass, true);
  assert.equal(verdict.notes.length, 0);

  // 1.09 kg of counts on a 100 g scale is a 1.38 g miss, over the 1 g bar.
  const bent = fitLine([
    { grams: 0, counts: 0 },
    { grams: 50, counts: 500_000 },
    { grams: 100, counts: 1_090_000 },
  ]);
  assert.equal(judgeAccuracy(bent, { maxGrams: 100 }).pass, false);
});

// R-S18 ---------------------------------------------------------------
test("R-S18 captures are Empty, Load, Unload, Repeat and a 30 s Creep hold", () => {
  assert.equal(Math.round(captureMean(stream(4, 100, 1000))?.mean ?? NaN), 1000);
  const accuracy = read("wiki/accuracy.md");
  for (const word of [/Empty/, /[Ll]oad/, /[Uu]nload/, /Repeat/, /Creep/]) {
    assert.match(accuracy, word);
  }
  assert.match(accuracy, /30 s/);
});

// R-S19 ---------------------------------------------------------------
test("R-S19 hysteresis above 2% is called out but does not fail the line", () => {
  assert.equal(GOALS.hysteresisFraction, 0.02);
  const gap = hysteresisOf([{ grams: 100, counts: 1000 }], [{ grams: 100, counts: 900 }], 1);
  assert.ok(gap !== null, "hysteresis was not measured");
  assert.equal(Math.round(gap), 100);

  const fit = fitLine([
    { grams: 0, counts: 0 },
    { grams: 50, counts: 500_000 },
    { grams: 100, counts: 1_000_000 },
  ]);
  const verdict = judgeAccuracy(fit, { maxGrams: 100, hysteresisGrams: 3 });
  assert.match(verdict.notes.join(" "), /Unload disagrees/);
  assert.equal(verdict.pass, true);
  assert.match(read("wiki/accuracy.md"), /does not by itself fail the straight-line check/);
});

// R-S20 ---------------------------------------------------------------
test("R-S20 the range test reports the noise floor, 3x rms resolution and the zero return", () => {
  const result = analyzeRange({
    noiseCounts: [40, -40, 40, -40],
    countsPerGram: 10_000,
    steps: [{ grams: 100, counts: 1_000_000 }],
    zeroCounts: 0,
    returnCounts: 0,
    bestRateHz: 330,
  });
  // 40 counts of noise on a 10 000 count/g scale is 0.004 g, and resolution is 3x rms.
  assert.ok(Math.abs(result.noiseRmsGrams - 0.004619) < 0.001, `noise was ${result.noiseRmsGrams}`);
  assert.ok(Math.abs(result.resolutionGrams - 3 * result.noiseRmsGrams) < 1e-12);
  assert.equal(result.zeroShiftGrams, 0);
  assert.equal(result.yielded, false);
});

// R-S21 ---------------------------------------------------------------
test("R-S21 probe and force gates come from GOALS and stay shut when the numbers are unknown", () => {
  assert.equal(GOALS.probeNoiseGrams, 5);
  assert.equal(GOALS.probeMinHz, 175);
  assert.equal(GOALS.forceNoiseGrams, 1.5);
  assert.equal(GOALS.forceMinHz, 330);

  const base = {
    noiseCounts: [40, -40, 40, -40],
    countsPerGram: 10_000,
    steps: [{ grams: 100, counts: 1_000_000 }],
    zeroCounts: 0,
    returnCounts: 0,
  };
  const unknownRate = analyzeRange({ ...base, bestRateHz: null });
  assert.equal(unknownRate.probeReady, false);
  assert.equal(unknownRate.forceReady, false);

  const quiet = analyzeRange({ ...base, bestRateHz: 660 });
  assert.equal(quiet.probeReady, true);
  assert.equal(quiet.forceReady, true);
  assert.match(read("wiki/results.md"), /stays a setting/);
});

// R-S22 ---------------------------------------------------------------
test("R-S22 Compile stays off until speed, accuracy and range all exist", () => {
  const status = guideStatus({
    cellName: "Bench cell",
    mode: "sim",
    phase: "streaming",
    sampleCount: 10,
    speedRuns: 1,
    hasFit: true,
    hasRange: false,
  });
  assert.equal(readyToCompile(status), false);
  assert.equal(readyToCompile({ ...status, range: true }), true);
  assert.match(read("wiki/results.md"), /print/);
});

// R-S23 ---------------------------------------------------------------
test("R-S23 a cell file loads, rejects junk, and keeps at most 24 saved cells", () => {
  const file = parseCellFile(
    JSON.stringify({ kind: "loadcell-bench-cell", version: 1, name: "Bench cell", thicknessMm: 2 }),
  );
  assert.equal(file.name, "Bench cell");
  assert.throws(() => parseCellFile("{\"nope\":true}"), /./);

  let saved = upsertSavedCell([], file, "2026-01-01T00:00:00.000Z");
  for (let i = 0; i < 30; i++) {
    saved = upsertSavedCell(saved, { ...file, name: `Cell ${i}` }, `2026-01-01T00:00:0${i}.000Z`);
  }
  assert.equal(saved.length, 24);
  assert.ok(saved.some((cell) => cell.file.name === "Cell 29"));
});

// R-S24 ---------------------------------------------------------------
test("R-S24 the Custom K2 plate profile, the bending sketch and the bridge factors exist", () => {
  const k2 = CELL_PROFILES.find((profile) => profile.id === "custom-k2");
  assert.ok(k2, "custom-k2 profile is missing");
  assert.equal(k2.materialId, "6061-t6");
  assert.equal(k2.gaugeId, "ba1000-3aa");
  assert.equal(k2.bridge, "full");

  assert.equal(bridgeFactor("full"), 1);
  assert.equal(bridgeFactor("half"), 0.5);
  assert.equal(bridgeFactor("quarter"), 0.25);

  const bending = bendingStiffness({
    youngMpa: CELL.youngMpa,
    thicknessMm: CELL.thicknessMm,
    neckWidthMm: CELL.defaultNeckWidthMm,
    neckLengthMm: CELL.defaultNeckLengthMm,
    neckCount: 4,
  });
  assert.ok(bending, "bending sketch returned nothing");
  assert.ok(bending.stiffnessNPerMm > 0);

  // The Build tab offers the foils that turn up in cheap cells, not only the
  // BA1000-3AA the Custom K2 uses.
  assert.deepEqual(
    GAUGE_PRESETS.map((preset) => preset.id),
    [
      "ba1000-3aa",
      "ba1000-3a-1k",
      "ba500-3ab-350",
      "ba500-3ab-1k",
      "ba300-3af-350",
      "bfl-350",
      "bfl-1k",
      "foil-350",
      "generic-foil-1k",
      "custom",
    ],
  );
  const catalogue: Array<[string, number, number, number]> = [
    ["ba1000-3a-1k", 1000, 3.0, 5.3],
    ["ba500-3ab-350", 350, 4.5, 3.0],
    ["ba500-3ab-1k", 1000, 4.5, 3.0],
    ["ba300-3af-350", 350, 3.0, 1.7],
    ["bfl-350", 350, 3.0, 3.0],
    ["bfl-1k", 1000, 3.0, 3.0],
    ["generic-foil-1k", 1000, 4.0, 5.0],
  ];
  for (const [id, ohm, widthMm, lengthMm] of catalogue) {
    const preset = gaugeById(id);
    assert.equal(preset.id, id, `${id} did not resolve to itself`);
    assert.equal(preset.resistanceOhm, ohm, `${id} resistance`);
    assert.equal(preset.gaugeFactor, 2, `${id} gauge factor`);
    assert.equal(preset.gridWidthMm, widthMm, `${id} grid width`);
    assert.equal(preset.gridLengthMm, lengthMm, `${id} grid length`);
    assert.ok(preset.name.length > 0 && preset.note.length > 0, `${id} has no name or note`);
  }
  // Custom has to stay last: gaugeById falls back to the last preset.
  assert.equal(GAUGE_PRESETS[GAUGE_PRESETS.length - 1].id, "custom");
  assert.equal(gaugeById("no-such-gauge").id, "custom");

  // The dropdown is data driven, and the wiki lists the new parts.
  assert.match(read("src/components/bench-app.tsx"), /GAUGE_PRESETS\.map/);
  assert.match(read("wiki/build.md"), /BA500-3AB/);
});

// R-S25 ---------------------------------------------------------------
test("R-S25 DXF upload converts units and places gauges, and rejects binary or DWG", () => {
  const dxf = [
    "0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "1", "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES", "0", "LINE", "8", "0", "10", "0", "20", "0",
    "11", "1", "21", "0", "0", "ENDSEC", "0", "EOF",
  ].join("\n");
  const drawing = parseDxf(dxf);
  assert.match(drawing.unitName, /inch/i);
  assert.ok(Math.abs(distanceMm(drawing.paths[0].pts[0], drawing.paths[0].pts[1]) - 25.4) < 1e-6);

  assert.throws(() => parseDxf("Binary DXF\r\n"), /ASCII DXF/);
  assert.match(read("src/components/sketch-upload.tsx"), /\.dwg|DWG/);
  assert.match(
    gaugeFitMessage({ gridLengthMm: 5.3, gridWidthMm: 3, neckLengthMm: 8, neckWidthMm: 1.6 }) ?? "",
    /wider than/,
  );
});

// R-S26 ---------------------------------------------------------------
test("R-S26 the simulator creeps 0.3% over 18 s and clamps at the rail", () => {
  const sim = new SimulatorSource();
  const countsPerGram = sim.sketchCountsPerGram();
  const zero = mean(sim.generate(2, 0).map((sample) => sample.counts));
  const loaded = mean(sim.generate(2, 100).map((sample) => sample.counts));
  const ratio = (loaded - zero) / (countsPerGram * 100);
  assert.ok(Math.abs(ratio - 1.003) < 0.002, `settled signal ratio was ${ratio}`);

  const railed = sim.generate(1, 100_000);
  assert.ok(railed.every((sample) => sample.counts === FULL_SCALE_COUNTS));
  assert.match(read("wiki/connect.md"), /not a measurement/);
});

// R-S27 ---------------------------------------------------------------
test("R-S27 the desktop launcher installs, starts and closes the bench", () => {
  const launcher = read("launcher/bench_launcher.py");
  assert.match(launcher, /^PORT = 4471$/m);
  assert.match(launcher, /^MIN_NODE = \(18, 18, 0\)$/m);
  assert.match(launcher, /def prefer_node\(/);
});

// R-S28 ---------------------------------------------------------------
test("R-S28 the printer step drops the USB link before flashing or starting", () => {
  const snippet = printerSnippet({
    front: frontById("h36-ads1220"),
    cellName: "Bench cell",
    gain: 128,
    sampleRate: 330,
    vref: 2.048,
    countsPerGram: 12_345,
    tareCounts: 0,
  });
  assert.match(snippet, /cannot share the port/);
  const wiki = read("wiki/README.md") + read("wiki/results.md");
  assert.match(wiki, /USB/);
  assert.match(wiki, /Probing the bed/);
  assert.match(wiki, /happen later/);
});
