// First-order sketch of the 6061-T6 plate. The gauges sit on the face, so the
// load that matters is a force normal to the plate, bending the necks as
// leaf springs. This is a starting scale and a yield ceiling, not a calibration.

export const CELL = {
  name: "K2 loadcell",
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
  // Necks visible beside the triangular windows. Adjustable in the bench.
  defaultNeckWidthMm: 1.6,
  defaultNeckLengthMm: 8,
  defaultNeckCount: 2,
  // Plimsoll mini ADS1220 analog rail. Replaced by a real calibration.
  assumedExcitationV: 3.3,
  internalRefV: 2.048,
};

export type ScaleInput = {
  neckWidthMm: number;
  neckLengthMm: number;
  neckCount: number;
  gain: number;
  vref: "internal" | "analog_supply";
  excitationV?: number;
};

export type ScaleEstimate = {
  yieldNewtons: number;
  yieldKg: number;
  microstrainPerGram: number;
  countsPerGram: number;
  fullScaleGrams: number;
};

export function estimateScale(input: ScaleInput): ScaleEstimate {
  const t = CELL.thicknessMm;
  const b = input.neckWidthMm * input.neckCount;
  const L = input.neckLengthMm;
  const E = CELL.youngMpa;
  const Sy = CELL.yieldMpa;
  const gf = CELL.gauge.gaugeFactor;
  const vex = input.excitationV ?? CELL.assumedExcitationV;
  // Guided leaf, moment FL/2, section modulus b*t^2/6.
  // sigma = F * 3 * L / (b * t^2) for the whole load shared by the necks.
  const yieldNewtons = (Sy * b * t * t) / (3 * L);
  const sigmaPerGram = (0.00980665 * 3 * L) / (b * t * t);
  const microstrainPerGram = (sigmaPerGram / E) * 1e6;
  const ratioPerGram = gf * (sigmaPerGram / E);
  const countsPerGram =
    input.vref === "analog_supply"
      ? ratioPerGram * input.gain * 8388608
      : ratioPerGram * (vex / CELL.internalRefV) * input.gain * 8388608;
  const fullScaleRatio = input.vref === "analog_supply" ? 1 / input.gain : CELL.internalRefV / (input.gain * vex);
  const fullScaleGrams = countsPerGram > 0 ? (fullScaleRatio / ratioPerGram) : 0;
  return {
    yieldNewtons,
    yieldKg: yieldNewtons / 9.80665,
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
