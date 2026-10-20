import { GOALS, type AccuracyVerdict, type Fit, type RangeResult, type SpeedResult } from "./analyze";
import type { BridgeKind, GaugeMount } from "./model";

export type ReportModel = {
  cellName: string;
  materialName: string;
  thicknessMm: number | null;
  neckCount: number | null;
  neckWidthMm: number | null;
  neckLengthMm: number | null;
  gaugeName: string;
  gaugeFactor: number | null;
  resistanceOhm: number | null;
  bridge: BridgeKind | null;
  gaugeMount: GaugeMount | null;
  frontLabel: string;
  gain: number;
  sampleRate: number;
  mode: "idle" | "sim" | "mcu";
  scaleSource: "none" | "sketch" | "calibration" | "entered";
  countsPerGram: number | null;
  tare: number | null;
  ratedGrams: number | null;
  speed: SpeedResult[];
  fit: Fit | null;
  verdict: AccuracyVerdict | null;
  range: RangeResult | null;
};

export type ReportRow = { label: string; value: string };

export type ReportSection = {
  id: string;
  title: string;
  paragraphs: string[];
  rows: ReportRow[];
};

export type CompiledReport = {
  title: string;
  lede: string;
  sections: ReportSection[];
};

const BRIDGE_LABEL: Record<BridgeKind, string> = {
  full: "Full bridge. Four gauges change with the load.",
  half: "Half bridge. Two gauges change with the load. The other two are fixed resistors.",
  quarter: "Quarter bridge. One gauge changes with the load. The other three are fixed resistors.",
};

const MOUNT_LABEL: Record<GaugeMount, string> = {
  "same-face": "On one face of the flexure",
  "back-to-back": "Back to back, one gauge on each face of a neck",
};

function bestPassing(speed: SpeedResult[]): SpeedResult | undefined {
  return speed.filter((row) => row.pass).sort((a, b) => b.measuredHz - a.measuredHz)[0];
}

function scaleSentence(model: ReportModel): string {
  const cpg = model.countsPerGram;
  if (cpg == null || cpg === 0) {
    return "No counts-per-gram is saved yet. Wherever this page needs grams, it says so and leaves the figure in counts.";
  }
  const figure = `${Math.abs(cpg).toFixed(2)} counts per gram`;
  if (model.scaleSource === "calibration") return `Grams use the line fitted from your weights, ${figure}.`;
  if (model.scaleSource === "entered") return `Grams use the scale you typed, ${figure}.`;
  if (model.scaleSource === "sketch") {
    return `Grams use the stiffness sketch, ${figure}. A weight you measure, or a scale you type, replaces that sketch.`;
  }
  return `The live screen is using ${figure}.`;
}

function sourceSentence(model: ReportModel): string {
  if (model.mode === "sim") return "The readings came from the built-in simulator.";
  if (model.mode === "mcu") return `The readings came from ${model.frontLabel} over USB.`;
  return "The board is disconnected. These are the numbers still held on the bench.";
}

function neckValue(model: ReportModel): string {
  if (model.neckCount == null) return "Not entered.";
  const count = `${model.neckCount} ${model.neckCount === 1 ? "neck" : "necks"}`;
  if (model.neckWidthMm == null || model.neckLengthMm == null) {
    return `${count}. Width and length are blank on this run.`;
  }
  return `${count}, each ${model.neckWidthMm.toFixed(2)} mm wide and ${model.neckLengthMm.toFixed(1)} mm long.`;
}

function speedSection(model: ReportModel): ReportSection {
  const best = bestPassing(model.speed);
  let lead: string;
  if (best) {
    lead = `The fastest speed that passed was ${best.measuredHz.toFixed(0)} readings a second, asked for as ${best.configuredHz} Hz. A pass stays within ${(GOALS.rateTolerance * 100).toFixed(0)}% of the request, keeps every USB block, and the counts are not frozen on one value.`;
  } else if (model.speed.length > 0) {
    lead = `Every requested speed missed the pass bar. That bar is within ${(GOALS.rateTolerance * 100).toFixed(0)}% of the setting, with the USB link intact and the counts changing.`;
  } else {
    lead = "The speed sweep has not been run.";
  }
  return {
    id: "speed",
    title: "How fast readings arrived",
    paragraphs: [lead],
    rows: model.speed.map((row) => ({
      label: `${row.configuredHz} Hz asked`,
      value: row.pass
        ? `${row.measuredHz.toFixed(1)} Hz arrived · Pass · ${row.samples.toLocaleString("en-US")} samples`
        : `${row.measuredHz.toFixed(1)} Hz arrived · Fail. ${row.notes.join(" ")}`.trim(),
    })),
  };
}

function accuracySection(model: ReportModel): ReportSection {
  const fit = model.fit;
  const verdict = model.verdict;
  if (!fit || !verdict) {
    return {
      id: "accuracy",
      title: "How close the known weights were",
      paragraphs: ["The known-weight check has not been run. Capture the empty cell, then at least one weight you trust."],
      rows: [],
    };
  }
  const lead = verdict.pass
    ? `The weights sit on a straight line. The largest miss is ${fit.maxAbsErrorGrams.toFixed(2)} g.`
    : `The weight line still misses the bar. The largest miss is ${fit.maxAbsErrorGrams.toFixed(2)} g.`;
  const optional = (value: number | null, digits = 2) => (value == null ? "Not measured" : `${value.toFixed(digits)} g`);
  return {
    id: "accuracy",
    title: "How close the known weights were",
    paragraphs: [lead, ...verdict.notes],
    rows: [
      { label: "Counts per gram", value: fit.countsPerGram.toFixed(2) },
      { label: "Empty-cell count", value: Math.round(fit.offsetCounts).toLocaleString("en-US") },
      { label: "Straightness, R²", value: fit.r2.toFixed(5) },
      { label: "Largest miss", value: `${fit.maxAbsErrorGrams.toFixed(2)} g` },
      { label: "Unload gap", value: optional(verdict.hysteresisGrams) },
      { label: "Same weight, scatter", value: optional(verdict.repeatabilityGrams) },
      { label: "Hold drift", value: optional(verdict.creepGrams) },
      { label: "Result", value: verdict.pass ? "Pass" : "Needs another look" },
    ],
  };
}

function rangeSection(model: ReportModel): ReportSection {
  const range = model.range;
  if (!range) {
    return {
      id: "range",
      title: "Lightest change and heaviest load",
      paragraphs: ["The noise and load-range check has not been run. Measure the cell while it sits empty, then step the load up."],
      rows: [],
    };
  }
  const noise =
    range.noiseRmsGrams != null && range.resolutionGrams != null
      ? `With the cell sitting still, the reading wandered by ${range.noiseRmsGrams.toFixed(3)} g rms. Three times that, ${range.resolutionGrams.toFixed(2)} g, is a cautious smallest change to trust.`
      : `With the cell sitting still, the reading wandered by ${range.noiseRmsCounts.toFixed(1)} counts rms. Apply a gram scale and this becomes a weight.`;
  const heavy =
    range.maxUnsaturatedGrams != null
      ? `The heaviest load that stayed inside the chip was ${range.maxUnsaturatedGrams.toLocaleString("en-US")} g.`
      : "No loaded steps were recorded, so the heaviest safe load is still open.";
  const zero =
    range.zeroShiftGrams != null
      ? `After unloading, zero had moved ${range.zeroShiftGrams.toFixed(2)} g.`
      : "A return to zero was not recorded. Unload the cell and capture that reading before calling the metal safe.";
  const extra = range.notes.filter((note) => !noise.includes("gram scale") || !note.startsWith("Calibrate"));
  return {
    id: "range",
    title: "Lightest change and heaviest load",
    paragraphs: [noise, heavy, zero, ...extra],
    rows: [
      {
        label: "Noise",
        value: range.noiseRmsGrams != null ? `${range.noiseRmsGrams.toFixed(3)} g rms` : `${range.noiseRmsCounts.toFixed(1)} counts rms`,
      },
      {
        label: "Smallest change to trust",
        value: range.resolutionGrams != null ? `${range.resolutionGrams.toFixed(2)} g` : "Needs a gram scale",
      },
      {
        label: "Heaviest load inside the chip",
        value: range.maxUnsaturatedGrams == null ? "Not recorded" : `${range.maxUnsaturatedGrams.toLocaleString("en-US")} g`,
      },
      {
        label: "Zero shift",
        value: range.zeroShiftGrams == null ? "Not recorded" : `${range.zeroShiftGrams.toFixed(2)} g`,
      },
    ],
  };
}

function printerSection(model: ReportModel): ReportSection {
  const range = model.range;
  if (!range) {
    return {
      id: "printer",
      title: "What this means on a printer",
      paragraphs: [
        "A nozzle probe and an extrusion force trace both need the noise check first. Those checks happen on the printer, after this bench.",
      ],
      rows: [],
    };
  }
  const probe = range.probeReady
    ? `Noise and speed are in the band a nozzle probe can use: jitter under ${GOALS.probeNoiseGrams} g and at least ${GOALS.probeMinHz} readings a second. On the printer the matching commands are LOAD_CELL_DIAGNOSTIC, LOAD_CELL_CALIBRATE, and LOAD_CELL_TEST_TAP.`
    : `A nozzle probe wants jitter under ${GOALS.probeNoiseGrams} g and at least ${GOALS.probeMinHz} readings a second. This run is outside that band, so leave the probe test until the bench clears it.`;
  const force = range.forceReady
    ? `It is also quiet enough for an extrusion force trace: jitter under ${GOALS.forceNoiseGrams} g and at least ${GOALS.forceMinHz} readings a second. Mainline Klipper stores that trace. Pressure advance stays a setting you choose.`
    : `An extrusion force trace wants jitter under ${GOALS.forceNoiseGrams} g and at least ${GOALS.forceMinHz} readings a second. This run is outside that band, so pressure advance stays a later test.`;
  const scaleCaveat =
    range.resolutionGrams == null
      ? " The probe line above still needs a gram scale before the jitter is a real weight."
      : "";
  return {
    id: "printer",
    title: "What this means on a printer",
    paragraphs: [`${probe}${scaleCaveat}`, force, "Keep the nozzle near 140°C during a tap so plastic ooze is not the thing you touch."],
    rows: [],
  };
}

export function compileReport(model: ReportModel): CompiledReport {
  const title = model.cellName.trim() || "Unnamed load cell";
  const best = bestPassing(model.speed);
  const speedBit = best
    ? ` The fastest passing speed was ${best.measuredHz.toFixed(0)} readings a second.`
    : model.speed.length > 0
      ? " No requested speed passed."
      : "";
  const scaleBit =
    model.countsPerGram != null && model.countsPerGram !== 0
      ? ` One gram moves the reading by ${Math.abs(model.countsPerGram).toFixed(1)} counts.`
      : "";
  const noiseBit =
    model.range?.resolutionGrams != null
      ? ` The smallest change worth trusting is about ${model.range.resolutionGrams.toFixed(2)} g.`
      : "";
  const lede = `${title} was checked on ${model.frontLabel} at gain ${model.gain}× and a live setting of ${model.sampleRate} Hz. ${sourceSentence(model)}${speedBit}${scaleBit}${noiseBit}`;

  const cellRows: ReportRow[] = [
    { label: "Metal", value: model.materialName },
    { label: "Thickness", value: model.thicknessMm == null ? "Not entered" : `${model.thicknessMm.toFixed(2)} mm` },
    { label: "Necks", value: neckValue(model) },
    { label: "Gauge", value: model.gaugeFactor == null ? model.gaugeName : `${model.gaugeName}, factor ${model.gaugeFactor.toFixed(2)}` },
    {
      label: "Gauge resistance",
      value: model.resistanceOhm == null ? "Not entered" : `${model.resistanceOhm.toLocaleString("en-US")} Ω`,
    },
    { label: "Bridge", value: model.bridge ? BRIDGE_LABEL[model.bridge] : "Not chosen" },
    { label: "Gauge placement", value: model.gaugeMount ? MOUNT_LABEL[model.gaugeMount] : "Not chosen" },
    { label: "Board", value: model.frontLabel },
    { label: "Gain", value: `${model.gain}×` },
    { label: "Live sample rate", value: `${model.sampleRate} Hz` },
  ];
  if (model.ratedGrams != null) {
    cellRows.push({ label: "Rated capacity you entered", value: `${model.ratedGrams.toLocaleString("en-US")} g` });
  }
  if (model.tare != null) {
    cellRows.push({ label: "Tare count", value: Math.round(model.tare).toLocaleString("en-US") });
  }

  return {
    title,
    lede,
    sections: [
      {
        id: "cell",
        title: "The cell and the board",
        paragraphs: [scaleSentence(model)],
        rows: cellRows,
      },
      speedSection(model),
      accuracySection(model),
      rangeSection(model),
      printerSection(model),
      {
        id: "words",
        title: "Words on this page",
        paragraphs: [],
        rows: [
          { label: "Count", value: "The raw number from the chip. It becomes grams once a scale is applied." },
          { label: "Counts per gram", value: "How far that number moves when you add one gram." },
          { label: "Noise", value: "How much the reading wanders while the cell sits still." },
          { label: "Hysteresis", value: "The gap between a weight sitting on the cell and the same weight on the way off." },
        ],
      },
    ],
  };
}
