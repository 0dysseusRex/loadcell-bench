import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bulgePoints, distanceMm, gaugeFitMessage, parseDxf } from "./dxf.ts";

const INCH_LINE = `0
SECTION
2
HEADER
9
$INSUNITS
70
1
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
10
0
20
0
11
1
21
0
0
ENDSEC
0
EOF
`;

test("an inch-unit line becomes 25.4 mm", () => {
  const drawing = parseDxf(INCH_LINE);
  assert.equal(drawing.unitName, "inches");
  assert.equal(drawing.paths.length, 1);
  assert.ok(Math.abs(distanceMm(drawing.paths[0].pts[0], drawing.paths[0].pts[1]) - 25.4) < 1e-9);
});

test("a positive bulge bows to the left of the chord", () => {
  const pts = bulgePoints({ x: 0, y: 0 }, { x: 2, y: 0 }, 1);
  const top = pts.reduce((best, point) => (point.y > best.y ? point : best));
  assert.ok(top.y > 0.9, `top y ${top.y}`);
  assert.ok(Math.abs(top.x - 1) < 0.15, `top x ${top.x}`);
});

test("the Custom K2 cut file is about 38 by 24 mm", () => {
  const text = readFileSync(new URL("../../hardware/NewLoadcell.dxf", import.meta.url), "utf8");
  const drawing = parseDxf(text);
  assert.ok(drawing.paths.length >= 1);
  assert.ok(Math.abs(drawing.bounds.width - 38) < 0.2, `width ${drawing.bounds.width}`);
  assert.ok(Math.abs(drawing.bounds.height - 24) < 0.2, `height ${drawing.bounds.height}`);
});

test("a grid wider than the neck is called out", () => {
  const message = gaugeFitMessage({ gridLengthMm: 5.3, gridWidthMm: 3, neckLengthMm: 8, neckWidthMm: 1.6 });
  assert.match(message ?? "", /wider than the 1\.60 mm neck/);
  assert.equal(gaugeFitMessage({ gridLengthMm: 5.3, gridWidthMm: 3, neckLengthMm: 8, neckWidthMm: 4 }), null);
});
