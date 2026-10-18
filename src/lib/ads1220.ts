// Register image for the TI ADS1220, matching klippy/extras/ads1220.py.

import { gainCode, rateCode } from "./model";

export const ADS_RESET = 0x06;
export const ADS_START = 0x08;
export const ADS_RREG = 0x20;
export const ADS_WREG = 0x40;
export const FULL_SCALE_COUNTS = 0x7fffff;

export type AdsConfig = {
  gain: number;
  sampleRate: number;
  /** Klipper input_mux. The Plimsoll board presents the bridge on AIN0/AIN1. */
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
  const mux = config.mux ?? 0;
  const pgaBypass = config.pgaBypass ? 1 : 0;
  const regs: [number, number, number, number] = [
    ((mux & 0xf) << 4) | (gain << 1) | pgaBypass,
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
