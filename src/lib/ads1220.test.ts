import assert from "node:assert/strict";
import test from "node:test";
import { adsImage, decodeSamples, restTicks } from "./ads1220.ts";

test("660 Hz turbo register image uses AIN0-AIN1", () => {
  const image = adsImage({ gain: 128, sampleRate: 660, vref: "internal" });
  assert.equal(image.turbo, true);
  assert.deepEqual(image.regs, [0x0e, 0x94, 0x00, 0x00]);
  assert.deepEqual(Array.from(image.write), [0x43, 0x0e, 0x94, 0x00, 0x00]);
  assert.deepEqual(Array.from(image.read), [0x23, 0, 0, 0, 0]);
  assert.deepEqual(image.reset, [0x06]);
  assert.deepEqual(image.start, [0x08]);
});

test("330 Hz stays in normal mode", () => {
  const image = adsImage({ gain: 64, sampleRate: 330, vref: "analog_supply" });
  assert.equal(image.turbo, false);
  // gain code 6, mux AIN0_AIN1 (0), pga on -> reg0 = 0x0c
  assert.equal(image.regs[0], 0x0c);
  // rate index 4, normal mode, continuous -> 128 + 4 = 132
  assert.equal(image.regs[1], 0x84);
  // analog supply reference is 0b11 in the top bits
  assert.equal(image.regs[2], 0xc0);
});

test("a sense wire to ground bypasses the PGA at gain 1", () => {
  const image = adsImage({ gain: 128, sampleRate: 330, vref: "analog_supply", mux: 0b1011 });
  // AIN3_AVSS is 0xB0, gain code 0, PGA bypassed
  assert.equal(image.regs[0], 0xb1);
  assert.equal(image.regs[1], 0x84);
  assert.equal(image.regs[2], 0xc0);
});

test("AIN0 minus AIN1 is mux 0 at the requested gain", () => {
  const image = adsImage({ gain: 1, sampleRate: 20, vref: "analog_supply", mux: 0 });
  assert.equal(image.regs[0], 0x00);
  assert.equal(image.regs[1], 0x04);
});

test("samples are sign-extended 24-bit little endian", () => {
  const bytes = new Uint8Array([
    0x78, 0x56, 0x34, 0x00, // +0x345678
    0x00, 0x00, 0x80, 0xff, // -0x800000
  ]);
  assert.deepEqual(decodeSamples(bytes), [0x345678, -8388608]);
});

test("rest ticks follow Klipper's 10x poll", () => {
  assert.equal(restTicks(170_000_000, 660), Math.trunc(170_000_000 / 6600));
});
