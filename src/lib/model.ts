// First-order sketch of a leaf flexure. The K2 plate is the default alloy and
// gauge. Other alloys and foils fill the same fields. The gauges sit on the
// face, so the load that matters is a force normal to the plate, bending the
// necks as leaf springs. This is a starting scale and a yield ceiling, not a
// calibration.

export const CELL = {
  name: "Custom K2 Loadcell",
  alloy: "6061-T6",
  thicknessIn: 0.1,
  thicknessMm: 2.54,
  widthMm: 38,
  heightMm: 24,
  youngMpa: 68900,
  yieldMpa: 276,
  densityGPerCm3: 2.7,
  gauge: {
    model: "BA1000-3AA",
    resistanceOhm: 1000,
    gaugeFactor: 2.0,
    gaugeFactorRange: [1.8, 2.2] as const,
    gridMm: [3.0, 5.3] as const,
    carrierMm: [6.7, 6.5] as const,
    count: 4,
    bridge: "full" as const,
  },
  adhesive: "Loctite 401",
  coating: "Loctite 9460",
  // Four necks on the redesign, starting sizes from the cut file. Adjustable in the bench.
  defaultNeckWidthMm: 1.6,
  defaultNeckLengthMm: 8,
  defaultNeckCount: 4,
  // Plimsoll mini ADS1220 analog rail. Replaced by a real calibration.
  assumedExcitationV: 3.3,
  internalRefV: 2.048,
};

export type MaterialPreset = {
  id: string;
  name: string;
  youngMpa: number | null;
  yieldMpa: number | null;
  note: string;
};

/** Alloys load cells are usually cut from. Handbook typicals, not a certificate. */
export const MATERIALS: MaterialPreset[] = [
  {
    id: "6061-t6",
    name: "6061-T6 aluminum",
    youngMpa: 68900,
    yieldMpa: 276,
    note: "Common for DIY flexures, and the alloy of the Custom K2 Loadcell. 68.9 GPa, yield 276 MPa.",
  },
  {
    id: "2024-t3",
    name: "2024-T3 aluminum",
    youngMpa: 73100,
    yieldMpa: 345,
    note: "The usual alloy in aluminum single-point load cells. About 73.1 GPa, yield 345 MPa.",
  },
  {
    id: "7075-t6",
    name: "7075-T6 aluminum",
    youngMpa: 71700,
    yieldMpa: 503,
    note: "Higher-strength aluminum flexures. About 71.7 GPa, yield 503 MPa.",
  },
  {
    id: "17-4-h900",
    name: "17-4 PH H900",
    youngMpa: 197000,
    yieldMpa: 1170,
    note: "The stainless most commercial load cells are cut from. About 197 GPa. This yield is the H900 temper.",
  },
  {
    id: "alloy-steel",
    name: "Alloy steel",
    youngMpa: 200000,
    yieldMpa: null,
    note: "Steels used in load cells sit near 200 GPa. The grade and the yield come from the alloy sheet.",
  },
  {
    id: "custom",
    name: "Custom material",
    youngMpa: null,
    yieldMpa: null,
    note: "Type the modulus and yield from the alloy sheet.",
  },
];

export function materialById(id: string): MaterialPreset {
  return MATERIALS.find((material) => material.id === id) ?? MATERIALS[MATERIALS.length - 1];
}

export type GaugePreset = {
  id: string;
  name: string;
  resistanceOhm: number | null;
  gaugeFactor: number | null;
  /** Active grid length along the neck, in millimeters. */
  gridLengthMm: number | null;
  gridWidthMm: number | null;
  note: string;
};

export const GAUGE_PRESETS: GaugePreset[] = [
  {
    id: "ba1000-3aa",
    name: "BA1000-3AA",
    resistanceOhm: 1000,
    gaugeFactor: 2.0,
    gridLengthMm: 5.3,
    gridWidthMm: 3.0,
    note: "1000 Ω, gauge factor about 2.0, grid 3.0 × 5.3 mm. The package range is about 1.8 to 2.2.",
  },
  {
    id: "foil-350",
    name: "350 Ω foil",
    resistanceOhm: 350,
    gaugeFactor: 2.0,
    gridLengthMm: null,
    gridWidthMm: null,
    note: "A common foil gauge. The factor is usually near 2. Type the grid length from the package.",
  },
  {
    id: "custom",
    name: "Custom gauge",
    resistanceOhm: null,
    gaugeFactor: null,
    gridLengthMm: null,
    gridWidthMm: null,
    note: "Type the gauge factor from the package. Resistance does not change counts per gram.",
  },
];

export function gaugeById(id: string): GaugePreset {
  return GAUGE_PRESETS.find((gauge) => gauge.id === id) ?? GAUGE_PRESETS[GAUGE_PRESETS.length - 1];
}

export type GaugeMount = "same-face" | "back-to-back";

export type CellProfile = {
  id: string;
  name: string;
  note: string;
  materialId: string | null;
  thicknessMm: number | null;
  neckCount: number | null;
  neckWidthMm: number | null;
  neckLengthMm: number | null;
  gaugeId: string | null;
  gaugeFactor: number | null;
  resistanceOhm: number | null;
  gridLengthMm: number | null;
  gridWidthMm: number | null;
  bridge: BridgeKind | null;
  gaugeMount: GaugeMount | null;
  yieldMpa: number | null;
};

export const CELL_PROFILES: CellProfile[] = [
  {
    id: "custom-k2",
    name: "Custom K2 Loadcell",
    note: "The worked example: 6061-T6, 0.100 in, four necks, four BA1000-3AA gauges on one face. Neck width and length start from the cut file.",
    materialId: "6061-t6",
    thicknessMm: CELL.thicknessMm,
    neckCount: 4,
    neckWidthMm: CELL.defaultNeckWidthMm,
    neckLengthMm: CELL.defaultNeckLengthMm,
    gaugeId: "ba1000-3aa",
    gaugeFactor: CELL.gauge.gaugeFactor,
    resistanceOhm: CELL.gauge.resistanceOhm,
    gridLengthMm: CELL.gauge.gridMm[1],
    gridWidthMm: CELL.gauge.gridMm[0],
    bridge: "full",
    gaugeMount: "same-face",
    yieldMpa: CELL.yieldMpa,
  },
  {
    id: "custom-loadcell",
    name: "CUSTOM LOADCELL",
    note: "A blank cell. Choose the alloy, the thickness, and the neck size, or upload a cell file you saved earlier. Nothing here is filled in.",
    materialId: null,
    thicknessMm: null,
    neckCount: null,
    neckWidthMm: null,
    neckLengthMm: null,
    gaugeId: null,
    gaugeFactor: null,
    resistanceOhm: null,
    gridLengthMm: null,
    gridWidthMm: null,
    bridge: null,
    gaugeMount: null,
    yieldMpa: null,
  },
];

export function cellProfileById(id: string): CellProfile {
  return CELL_PROFILES.find((profile) => profile.id === id) ?? CELL_PROFILES[0];
}

export type BridgeKind = "full" | "half" | "quarter";

/** Relative to four active arms that each see the same strain magnitude. */
export function bridgeFactor(kind: BridgeKind): number {
  if (kind === "half") return 0.5;
  if (kind === "quarter") return 0.25;
  return 1;
}

/**
 * Average of a guided-leaf moment over a grid that starts at the root.
 * The moment falls linearly to zero at midspan, so a grid longer than half
 * the neck has no single answer. Returns null in that case.
 */
export function rootGridFraction(gridLengthMm: number, neckLengthMm: number): number | null {
  if (!(gridLengthMm > 0) || !(neckLengthMm > 0)) return null;
  if (gridLengthMm > neckLengthMm / 2) return null;
  return 1 - gridLengthMm / neckLengthMm;
}

export type ScaleInput = {
  neckWidthMm: number;
  neckLengthMm: number;
  neckCount: number;
  gain: number;
  vref: "internal" | "analog_supply";
  thicknessMm?: number;
  youngMpa?: number;
  yieldMpa?: number | null;
  gaugeFactor?: number;
  excitationV?: number;
  /** Share of the peak surface strain the grid averages. 1 uses the peak. */
  strainFraction?: number;
  bridge?: BridgeKind;
};

export type ScaleEstimate = {
  yieldNewtons: number | null;
  yieldKg: number | null;
  microstrainPerGram: number;
  countsPerGram: number;
  fullScaleGrams: number;
};

export type BendingInput = {
  youngMpa: number;
  yieldMpa?: number | null;
  thicknessMm: number;
  neckWidthMm: number;
  neckLengthMm: number;
  neckCount: number;
};

export type BendingResult = {
  youngGpa: number;
  /** E·I of the necks together, in N·m². */
  flexuralRigidityNm2: number;
  /** Guided-leaf spring rate, newtons per millimeter of deflection. */
  stiffnessNPerMm: number;
  /** Kilograms of load per millimeter of deflection. */
  stiffnessKgPerMm: number;
  yieldKg: number | null;
};

/**
 * Guided leaves in parallel. Stiffness is E × count × width × thickness³ / length³.
 * Returns null until thickness and the neck proportions are all positive.
 */
export function bendingStiffness(input: BendingInput): BendingResult | null {
  const E = input.youngMpa;
  const t = input.thicknessMm;
  const w = input.neckWidthMm;
  const L = input.neckLengthMm;
  const n = input.neckCount;
  if (!(E > 0) || !(t > 0) || !(w > 0) || !(L > 0) || !(n > 0)) return null;
  const inertia = (n * w * t * t * t) / 12;
  const stiffnessNPerMm = (E * n * w * t * t * t) / (L * L * L);
  const Sy = input.yieldMpa;
  const yieldNewtons = Sy != null && Sy > 0 ? (Sy * n * w * t * t) / (3 * L) : null;
  return {
    youngGpa: E / 1000,
    flexuralRigidityNm2: (E * inertia) / 1e6,
    stiffnessNPerMm,
    stiffnessKgPerMm: stiffnessNPerMm / 9.80665,
    yieldKg: yieldNewtons == null ? null : yieldNewtons / 9.80665,
  };
}

export function estimateScale(input: ScaleInput): ScaleEstimate {
  const t = input.thicknessMm ?? CELL.thicknessMm;
  const b = input.neckWidthMm * input.neckCount;
  const L = input.neckLengthMm;
  const E = input.youngMpa ?? CELL.youngMpa;
  const Sy = input.yieldMpa === undefined ? CELL.yieldMpa : input.yieldMpa;
  const gf = input.gaugeFactor ?? CELL.gauge.gaugeFactor;
  const vex = input.excitationV ?? CELL.assumedExcitationV;
  const strainFraction = input.strainFraction ?? 1;
  const arms = bridgeFactor(input.bridge ?? "full");
  // Guided leaf, moment FL/2, section modulus b*t^2/6.
  // sigma = F * 3 * L / (b * t^2) for the whole load shared by the necks.
  // That stress is the peak. strainFraction is the share of it the grid averages.
  // A half or quarter bridge uses completion resistors on the idle arms.
  const yieldNewtons = Sy == null || Sy <= 0 ? null : (Sy * b * t * t) / (3 * L);
  const sigmaPerGram = (0.00980665 * 3 * L) / (b * t * t);
  const microstrainPerGram = (sigmaPerGram / E) * 1e6 * strainFraction;
  const ratioPerGram = gf * (sigmaPerGram / E) * strainFraction * arms;
  const countsPerGram =
    input.vref === "analog_supply"
      ? ratioPerGram * input.gain * 8388608
      : ratioPerGram * (vex / CELL.internalRefV) * input.gain * 8388608;
  const fullScaleRatio = input.vref === "analog_supply" ? 1 / input.gain : CELL.internalRefV / (input.gain * vex);
  const fullScaleGrams = countsPerGram > 0 ? (fullScaleRatio / ratioPerGram) : 0;
  return {
    yieldNewtons,
    yieldKg: yieldNewtons == null ? null : yieldNewtons / 9.80665,
    microstrainPerGram,
    countsPerGram,
    fullScaleGrams,
  };
}

export const H36_PINS = {
  cs: "PA14",
  drdy: "PA1",
  sclk: "PB7",
  mosi: "PB13",
  miso: "PA15",
} as const;

export const SAMPLE_RATES = [20, 45, 90, 175, 330, 600, 1000, 40, 180, 350, 660, 1200, 2000] as const;

export const NORMAL_RATES = [20, 45, 90, 175, 330, 600, 1000];
export const TURBO_RATES = [40, 90, 180, 350, 660, 1200, 2000];

export function isTurboRate(sps: number): boolean {
  return TURBO_RATES.includes(sps) && !NORMAL_RATES.includes(sps);
}

export const GAINS = [1, 2, 4, 8, 16, 32, 64, 128] as const;

export function gainCode(gain: number): number {
  const index = GAINS.indexOf(gain as (typeof GAINS)[number]);
  if (index < 0) throw new Error(`ADS1220 gain ${gain} is not a legal value`);
  return index;
}

export function rateCode(sps: number): { index: number; turbo: boolean } {
  const normal = NORMAL_RATES.indexOf(sps);
  if (normal >= 0) return { index: normal, turbo: false };
  const turbo = TURBO_RATES.indexOf(sps);
  if (turbo >= 0) return { index: turbo, turbo: true };
  throw new Error(`ADS1220 sample rate ${sps} is not a legal value`);
}
