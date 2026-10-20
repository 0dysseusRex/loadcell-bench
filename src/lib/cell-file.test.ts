import assert from "node:assert/strict";
import test from "node:test";
import { cellFileName, parseCellFile, upsertSavedCell } from "./cell-file.ts";
import { cellProfileById } from "./model.ts";

test("the blank custom profile and the Custom K2 example have the names on the buttons", () => {
  const example = cellProfileById("custom-k2");
  const blank = cellProfileById("custom-loadcell");
  assert.equal(example.name, "Custom K2 Loadcell");
  assert.equal(example.materialId, "6061-t6");
  assert.equal(blank.name, "CUSTOM LOADCELL");
  assert.equal(blank.materialId, null);
  assert.equal(blank.thicknessMm, null);
  assert.equal(blank.neckCount, null);
  assert.equal(blank.neckWidthMm, null);
  assert.equal(blank.neckLengthMm, null);
  assert.equal(blank.gaugeId, null);
  assert.equal(blank.gaugeFactor, null);
  assert.equal(blank.bridge, null);
  assert.equal(blank.gaugeMount, null);
  assert.equal(blank.yieldMpa, null);
});

test("a saved cell file round-trips and a strange file is refused", () => {
  const file = parseCellFile(
    JSON.stringify({
      kind: "loadcell-bench-cell",
      version: 1,
      name: "Column cell",
      profileId: "custom-loadcell",
      materialId: "17-4-h900",
      youngMpa: 197000,
      yieldMpa: 1170,
      thicknessMm: 2,
      neckCount: 2,
      neckWidthMm: 1.2,
      neckLengthMm: 10,
      gaugeId: "foil-350",
      gaugeFactor: 2,
      resistanceOhm: 350,
      gridLengthMm: null,
      gridWidthMm: null,
      bridge: "full",
      gaugeMount: "back-to-back",
      strainFraction: 1,
      ratedGrams: 20000,
      countsPerGram: 80,
      tareCounts: 1000,
      gauges: [{ x: 1, y: 2, angleDeg: 90 }],
    }),
  );
  assert.equal(file.name, "Column cell");
  assert.equal(file.neckWidthMm, 1.2);
  assert.equal(file.gauges[0].angleDeg, 90);
  assert.equal(cellFileName(file), "column-cell.json");
  assert.throws(() => parseCellFile("{}"), /not a load cell/);
});

test("saving the same name replaces the stored cell", () => {
  const first = parseCellFile(
    JSON.stringify({ kind: "loadcell-bench-cell", version: 1, name: "Column cell", thicknessMm: 2 }),
  );
  const second = { ...first, thicknessMm: 3 };
  const stored = upsertSavedCell(upsertSavedCell([], first, "2026-01-01"), second, "2026-02-01");
  assert.equal(stored.length, 1);
  assert.equal(stored[0].file.thicknessMm, 3);
  assert.equal(stored[0].savedAt, "2026-02-01");
});
