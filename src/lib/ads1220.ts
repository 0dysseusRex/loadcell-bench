// Register image for the TI ADS1220, matching klippy/extras/ads1220.py.

import { gainCode, rateCode } from "./model";

export const ADS_RESET = 0x06;
export const ADS_START = 0x08;
export const ADS_RREG = 0x20;
export const ADS_WREG = 0x40;
export const FULL_SCALE_COUNTS = 0x7fffff;

export type AdsInput = {
  id: string;
  mux: number;
  label: string;
  /** This pair sits near half the excitation, so gain 1 is the on-scale setting. */
  unityGain: boolean;
};

/**
 * This board's bridge is AIN0 and AIN1. Both sit near half the 3.3 V excitation
 * and both move when the flexure bends. AIN2 and AIN3 sit within a few millivolts
 * of ground and do not move. The Plimsoll schematic names those pins the other way.
 */
export const ADS_INPUTS: readonly AdsInput[] = [
  { id: "AIN0_AIN1", mux: 0b0000, label: "AIN0 minus AIN1", unityGain: true },
  { id: "AIN0_AVSS", mux: 0b1000, label: "AIN0 to ground", unityGain: true },
  { id: "AIN1_AVSS", mux: 0b1001, label: "AIN1 to ground", unityGain: true },
  { id: "AIN3_AIN2", mux: 0b0111, label: "AIN3 minus AIN2", unityGain: false },
  { id: "AIN3_AVSS", mux: 0b1011, label: "AIN3 to ground", unityGain: true },
  { id: "AIN2_AVSS", mux: 0b1010, label: "AIN2 to ground", unityGain: true },
];

export function adsInputByMux(mux: number): AdsInput {
  return ADS_INPUTS.find((input) => input.mux === mux) ?? ADS_INPUTS[0];
}

export type AdsConfig = {
  gain: number;
  sampleRate: number;
  /**
   * Klipper input_mux nibble. Default is AIN0_AIN1, the pair that moves on this board.
   */
  mux?: number;
  vref: "internal" | "analog_supply";
  pgaBypass?: boolean;
};

export type AdsImage = {
  regs: [number, number, number, number];
  turbo: boolean;
  /** Command bytes, not including the SPI response padding. */
  reset: number[];
  write: number[];
  read: number[];
  start: number[];
};

const VREF: Record<AdsConfig["vref"], number> = {
  internal: 0b00,
  analog_supply: 0b11,
};

export function adsImage(config: AdsConfig): AdsImage {
  const gain = gainCode(config.gain);
  const { index, turbo } = rateCode(config.sampleRate);
  const mux = config.mux ?? ADS_INPUTS[0].mux;
  // A measurement to AVSS sits on the rail. The PGA has to be bypassed, and bypass requires gain 1.
  const toGround = (mux & 0xf) >= 0b1000;
  const pgaBypass = toGround || config.pgaBypass ? 1 : 0;
  const appliedGain = toGround ? 0 : gain;
  const regs: [number, number, number, number] = [
    ((mux & 0xf) << 4) | (appliedGain << 1) | pgaBypass,
    (index << 5) | ((turbo ? 0x2 : 0) << 3) | (0x1 << 2),
    (VREF[config.vref] & 0x3) << 6,
    0x00,
  ];
  return {
    regs,
    turbo,
    reset: [ADS_RESET],
    write: [ADS_WREG | ((regs.length - 1) & 0x3), ...regs],
    read: [ADS_RREG | ((regs.length - 1) & 0x3), 0, 0, 0, 0],
    start: [ADS_START],
  };
}

export function restTicks(clockHz: number, sampleRate: number): number {
  return Math.max(1, Math.trunc(clockHz / (10 * sampleRate)));
}

export function pulseTicks(clockHz: number, spiHz: number): number {
  return Math.max(1, Math.trunc(clockHz / spiHz));
}

/** Klipper stores each sample as a sign-extended 24-bit value, little endian. */
export function decodeSamples(data: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i + 4 <= data.length; i += 4) {
    const view = (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) | 0;
    out.push(view);
  }
  return out;
}

export function isSaturated(counts: number): boolean {
  return counts >= 8_200_000 || counts <= -8_200_000;
}

export function fractionOfFullScale(counts: number): number {
  return counts / 8388608;
}
