---
owner: coding
spec_gate: open
state: PLANNING
---

# Implementation report

This report cites requirement ids that already have code, and the path. It does not change that code. Tracks stay blocked by spec approval. Tests were not run.

## Coverage

| Id | Path |
| --- | --- |
| R-S01 | `F:\Cursor\projects\loadcell-bench\src\lib\guide.ts` |
| R-S02 | `F:\Cursor\projects\loadcell-bench\package.json`; `F:\Cursor\projects\loadcell-bench\launcher\bench_launcher.py` |
| R-S03 | `F:\Cursor\projects\loadcell-bench\src\types\serial.d.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts` |
| R-S04 | `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx` |
| R-S05 | `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts` |
| R-S06 | `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` |
| R-S07 | `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` |
| R-S08 | `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts` |
| R-S09 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx` |
| R-S10 | `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx` |
| R-S11 | `F:\Cursor\projects\loadcell-bench\src\lib\wiring.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx` |
| R-S12 | `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx` |
| R-S13 | `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx`; `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` |
| R-S14 | `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx` |
| R-S15 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` |
| R-S16 | `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx` |
| R-S17 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` |
| R-S18 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx` |
| R-S19 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` |
| R-S20 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` |
| R-S21 | `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` |
| R-S22 | `F:\Cursor\projects\loadcell-bench\src\lib\guide.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\report.ts` |
| R-S23 | `F:\Cursor\projects\loadcell-bench\src\lib\cell-file.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` |
| R-S24 | `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` |
| R-S25 | `F:\Cursor\projects\loadcell-bench\src\lib\dxf.ts`; `F:\Cursor\projects\loadcell-bench\src\components\sketch-upload.tsx` |
| R-S26 | `F:\Cursor\projects\loadcell-bench\src\lib\simulator.ts` |
| R-S27 | `F:\Cursor\projects\loadcell-bench\launcher\bench_launcher.py` |
| R-S28 | `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` |
| R-E01 | `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` |
| R-E02 | `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` |
| R-E03 | `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` |
| R-E04 | `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` |
| R-E05 | `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` |
| R-E07 | `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts` |
| R-E10 | `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` |

R-S19 is implemented, and the pass flag is stricter than the wiki sentence. `judgeAccuracy` appends the hysteresis note and then requires an empty note list. Path: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`.

R-S21 is implemented, and `probeReady` treats a null noise figure or a null best rate as passing that comparison. `forceReady` still requires noise in grams. Path: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`.

R-E06 has no application code. The color rule is written in `F:\Cursor\projects\loadcell-bench\README.md` and `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`.

## Hardware artifacts present

These ids have design files. They are not TypeScript.

| Id | Path |
| --- | --- |
| R-E08 | `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_sch`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb` |
| R-E09 | `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb` |
| R-M01 | `F:\Cursor\projects\loadcell-bench\hardware\NewLoadcell.dxf`; `F:\Cursor\projects\loadcell-bench\public\cell\NewLoadcell.dxf` |
| R-M05 | `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` |
| R-M06 | `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt` |
| R-M08 | `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb` |

R-M02, R-M03, R-M04, and R-M07 are build instructions. The matching constants that do exist are in `F:\Cursor\projects\loadcell-bench\src\lib\model.ts` (`CELL` necks, gauge, adhesive, coating, and `gaugeMount`). There is no fabrication program for deburr, Loctite, or the opposite-face leads.

## Declared tests not run

`F:\Cursor\projects\loadcell-bench\package.json` script `test` lists `codec.test.ts`, `ads1220.test.ts`, `hx717.test.ts`, `analyze.test.ts`, `guide.test.ts`, `report.test.ts`, `dxf.test.ts`, `cell-file.test.ts`, and `wiring.test.ts`. `F:\Cursor\projects\loadcell-bench\launcher\test_bench_launcher.py` is separate and is not in that script.
