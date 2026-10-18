// HX711/HX717 as Klipper's sensor_hx71x.c and klippy/extras/hx71x.py speak to it.
// The sample rate is a pin on the chip, not a register. Extra clock pulses pick the gain.

import { restTicks } from "./ads1220";

/** Signed values Klipper substitutes when a bit-bang read fails. */
export const HX_SAMPLE_DESYNC = -2147483648;
export const HX_SAMPLE_LONG = 1073741824;

export const HX717_RATES = [10, 20, 80, 320] as const;
export const HX717_GAINS = [64, 128] as const;

export function hx717GainChannel(gain: number): number {
  if (gain === 128) return 1;
  if (gain === 64) return 3;
  throw new Error("The HX717 bridge is read at gain 128 (A-128) or 64 (A-64).");
}

export function hx717GainName(gain: number): "A-128" | "A-64" {
  return hx717GainChannel(gain) === 1 ? "A-128" : "A-64";
}

export function isHxErrorSample(counts: number): boolean {
  return counts === HX_SAMPLE_DESYNC || counts === HX_SAMPLE_LONG;
}

export function hx717RestTicks(clockHz: number, sampleRate: number): number {
  if (!HX717_RATES.includes(sampleRate as (typeof HX717_RATES)[number])) {
    throw new Error(`HX717 rate ${sampleRate} Hz is not one of ${HX717_RATES.join(", ")}.`);
  }
  return restTicks(clockHz, sampleRate);
}

export function hx717ConfigLines(pins: { dout: string; sclk: string }, gain: number): string[] {
  const channel = hx717GainChannel(gain);
  return [
    "allocate_oids count=1",
    `config_hx71x oid=0 gain_channel=${channel} dout_pin=${pins.dout} sclk_pin=${pins.sclk}`,
  ];
}
