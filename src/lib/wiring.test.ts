import assert from "node:assert/strict";
import test from "node:test";
import { interpretWiring, WIRING_PROBES, type WiringReading } from "./wiring.ts";

function read(id: string, rest: number, load: number): WiringReading {
  const probe = WIRING_PROBES.find((item) => item.id === id);
  if (!probe) throw new Error(`missing probe ${id}`);
  return { ...probe, pins: [...probe.pins], rest, load };
}

const grounded = [read("AIN2", 4_800, 4_900), read("AIN3", 5_100, 5_000)];

test("a centered bridge that moves apart is working", () => {
  const report = interpretWiring([
    read("AIN0", 4_170_000, 4_120_000),
    read("AIN1", 4_168_000, 4_220_000),
    ...grounded,
    read("AIN0_AIN1", 2_000, -100_000),
    read("AIN0_AIN2", 4_165_000, 4_115_000),
    read("AIN0_AIN3", 4_164_000, 4_114_000),
    read("AIN1_AIN2", 4_163_000, 4_215_000),
    read("AIN1_AIN3", 4_162_000, 4_214_000),
    read("AIN2_AIN3", -300, -100),
  ]);
  assert.equal(report.ok, true);
  assert.equal(report.verdict, "working");
  assert.equal(report.pairMux, 0);
  assert.match(report.title, /Working/);
  assert.match(report.detail.join(" "), /opposite directions/);
});

test("same-face gauges that step together are common mode", () => {
  const report = interpretWiring([
    read("AIN0", 4_170_000, 4_220_000),
    read("AIN1", 4_168_000, 4_218_000),
    ...grounded,
    read("AIN0_AIN1", -2_000, -1_600),
    read("AIN0_AIN2", 4_165_000, 4_215_000),
    read("AIN0_AIN3", 4_164_000, 4_214_000),
    read("AIN1_AIN2", 4_163_000, 4_213_000),
    read("AIN1_AIN3", 4_162_000, 4_212_000),
    read("AIN2_AIN3", -200, -150),
  ]);
  assert.equal(report.ok, false);
  assert.equal(report.verdict, "common-mode");
  assert.equal(report.pairMux, 0);
  assert.match(report.detail.join(" "), /same face/);
  assert.match(report.detail.join(" "), /3\.3 V/);
  assert.match(report.detail.join(" "), /near ground/);
});

test("one live midpoint is a single arm", () => {
  const report = interpretWiring([
    read("AIN0", 4_170_000, 4_220_000),
    read("AIN1", 4_168_000, 4_168_400),
    ...grounded,
    read("AIN0_AIN1", 2_000, 52_000),
    read("AIN0_AIN2", 4_165_000, 4_215_000),
    read("AIN0_AIN3", 4_164_000, 4_214_000),
    read("AIN1_AIN2", 4_163_000, 4_163_200),
    read("AIN1_AIN3", 4_162_000, 4_162_200),
    read("AIN2_AIN3", -200, -150),
  ]);
  assert.equal(report.verdict, "one-pin");
  assert.equal(report.ok, false);
  assert.equal(report.pairMux, null);
});

test("no midpoint means excitation is missing", () => {
  const report = interpretWiring(
    WIRING_PROBES.map((probe, index) => ({
      ...probe,
      pins: [...probe.pins],
      rest: 1_000 + index * 3_000,
      load: 1_200 + index * 3_000,
    })),
  );
  assert.equal(report.verdict, "no-excitation");
  assert.match(report.detail.join(" "), /near ground/);
});

test("identical counts on every input are not a switched multiplexer", () => {
  const report = interpretWiring(WIRING_PROBES.map((probe) => ({ ...probe, pins: [...probe.pins], rest: 30_000, load: 31_000 })));
  assert.equal(report.verdict, "same-reading");
  assert.match(report.detail.join(" "), /simulator/);
});

test("opposite motion with a half-scale difference is not centered", () => {
  const report = interpretWiring([
    read("AIN0", 4_170_000, 4_120_000),
    read("AIN1", 4_168_000, 4_220_000),
    ...grounded,
    read("AIN0_AIN1", 4_165_000, 4_060_000),
    read("AIN0_AIN2", 4_165_000, 4_115_000),
    read("AIN0_AIN3", 4_164_000, 4_114_000),
    read("AIN1_AIN2", 4_163_000, 4_215_000),
    read("AIN1_AIN3", 4_162_000, 4_214_000),
    read("AIN2_AIN3", -100, -100),
  ]);
  assert.equal(report.verdict, "unbalanced");
  assert.equal(report.ok, false);
});

test("a midpoint that does not move asks for a firmer load", () => {
  const report = interpretWiring([
    read("AIN0", 4_170_000, 4_170_200),
    read("AIN1", 4_168_000, 4_168_100),
    ...grounded,
    read("AIN0_AIN1", 2_000, 2_100),
    read("AIN0_AIN2", 4_165_000, 4_165_100),
    read("AIN0_AIN3", 4_164_000, 4_164_100),
    read("AIN1_AIN2", 4_163_000, 4_163_100),
    read("AIN1_AIN3", 4_162_000, 4_162_100),
    read("AIN2_AIN3", -100, -100),
  ]);
  assert.equal(report.verdict, "no-motion");
});
