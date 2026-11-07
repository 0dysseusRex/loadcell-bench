---
owner: planner
spec_gate: open
state: PLANNING
---

# Assumptions

No inferred requirement ids were created. Every R- id in this export has an evidence path and confidence explicit. The notes below are assumptions already visible in the repo, or readings that were not promoted to an R- id.

## Stated in the repo

- Pass limits, pin maps, the cut file, and the bending numbers are a starting point. A pass in the simulator is not a measurement of the metal. Evidence: `F:\Cursor\projects\loadcell-bench\README.md`.
- Alloy moduli and yields in the calculator are handbook typicals, not a certificate. Alloy steel and a custom material need a yield the operator types. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\build.md` and `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`.
- Neck width 1.6 mm and neck length 8 mm are starting measures from the cut file. The operator is expected to measure the cut plate. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\README.md`.
- The Custom K2 plate is one worked example. The tests also describe half-bridge, quarter-bridge, and three-gauge-series wiring. Evidence: `F:\Cursor\projects\loadcell-bench\README.md` and `F:\Cursor\projects\loadcell-bench\src\lib\wiring.ts`.
- Gauge factor for the BA1000-3AA is about 2.0, with a package range of about 1.8 to 2.2. Resistance does not change counts per gram. Evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`.
- Share of peak strain defaults to 1. `rootGridFraction` returns a root-grid average only when the grid is no longer than half the neck. The BA1000-3AA grid is 5.3 mm on an 8 mm neck, which is longer than half, so the button leaves the peak in place. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\build.md` and `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`.
- Loctite 401 creeps, and a thick Loctite 9460 coat is a common reason unload does not match load. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\accuracy.md`.
- The alpha board’s published clock is the internal oscillator, and that clock can stretch a bit-bang HX717 read into chip errors. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\flash.md`.
- The bench application, launcher, and user guide are MIT. The Custom K2 design, cut file, and hardware wiki pages are CERN-OHL-P v2, without an express warranty of fitness. Evidence: `F:\Cursor\projects\loadcell-bench\LICENSE` and `F:\Cursor\projects\loadcell-bench\hardware\LICENSE-CERN-OHL-P-2.0.txt`.

## Not promoted to an R- id

- Feet as a DXF unit is implemented in `dxf.ts` and omitted from the build page’s unit list. It stays inside R-S25 because the code states it. The doc gap is an unknown, not a second id.
- The 0.22 full-scale auto-gain stop is part of R-S10 because `bench-context.tsx` states it. The wiki only says “stops before the offset hits the rail.”
- `public\firmware\h36-combo-v2-usb.bin` was not given an id. Nothing in the repo says the app flashes it.
