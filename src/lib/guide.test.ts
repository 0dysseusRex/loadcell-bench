import assert from "node:assert/strict";
import test from "node:test";
import { guideStatus, nextGuideStep, readyToCompile, type GuideSnapshot } from "./guide.ts";

const empty: GuideSnapshot = {
  cellName: "",
  mode: "idle",
  phase: "idle",
  sampleCount: 0,
  speedRuns: 0,
  hasFit: false,
  hasRange: false,
};

test("a fresh bench starts by asking for the amp", () => {
  const status = guideStatus(empty);
  assert.equal(status.connect, false);
  assert.equal(nextGuideStep(status), "connect");
  assert.equal(readyToCompile(status), false);
  const named = guideStatus({ ...empty, cellName: "Custom K2 Loadcell" });
  assert.equal(named.name, true);
  assert.equal(nextGuideStep(named), "connect");
});

test("streaming counts as watching the live reading", () => {
  const status = guideStatus({ ...empty, cellName: "Column cell", mode: "sim", phase: "streaming", sampleCount: 0 });
  assert.equal(status.name, true);
  assert.equal(status.connect, true);
  assert.equal(status.live, true);
  assert.equal(nextGuideStep(status), "speed");
});

test("compile waits for speed, accuracy, and range together", () => {
  const partial = guideStatus({
    ...empty,
    cellName: "Column cell",
    mode: "mcu",
    phase: "ready",
    sampleCount: 40,
    speedRuns: 4,
    hasFit: true,
    hasRange: false,
  });
  assert.equal(readyToCompile(partial), false);
  assert.equal(nextGuideStep(partial), "range");

  const done = guideStatus({ ...empty, cellName: "Column cell", mode: "sim", sampleCount: 10, speedRuns: 1, hasFit: true, hasRange: true, phase: "ready" });
  assert.equal(readyToCompile(done), true);
  assert.equal(nextGuideStep(done), null);
});
