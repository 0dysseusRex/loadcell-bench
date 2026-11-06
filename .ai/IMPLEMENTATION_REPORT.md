---
owner: coding
spec_gate: open
state: IMPLEMENTATION
---

# Implementation report

The bench app and the desktop launcher already exist in this repository
(`src/`, `launcher/`, `wiki/`, `public/firmware/`). This pass did not rewrite
them. It walked every acceptance check in `.ai/SOFTWARE_SPEC.md` for R-S01..R-S28,
fixed the two places where the code disagreed with the requirement prose, and
added one test per requirement id so each acceptance line has a command that
proves it.

All paths below are relative to `F:\AionUi\projects\loadcell-bench`. The
`F:\Cursor\projects\loadcell-bench` paths in the spec are stale: that directory
holds only `node_modules` and `MOVED.txt` pointing here.

## What changed this pass

| Id | Change | File |
| --- | --- | --- |
| R-S19 | A hysteresis call-out is still printed in the notes, but it no longer sets `pass` to false. Only R², the worst miss and a negative scale fail the line, which is what the requirement prose says. The spec had listed the old behaviour as a known risk. | `src/lib/analyze.ts` |
| R-S21 | `probeReady` and `forceReady` now stay shut when `bestRateHz` is unknown. Before, an unknown rate opened both gates and the range page showed a "Probe candidate" badge with no rate data. The spec had listed the old behaviour as a known risk. | `src/lib/analyze.ts` |
| R-S05 | `KLIPPER_BAUD = 250000` is exported and used by `port.open`, so the baud rate is asserted instead of string-matched. | `src/lib/klipper/session.ts` |
| R-S06 | `SPI_HZ = 256000` is exported for the same reason. | `src/lib/klipper/session.ts` |
| R-S01..R-S28 | One acceptance test per id in a new file, plus the npm test script now runs it. | `src/lib/acceptance.test.ts`, `package.json` |
| R-S05 | The Python oracle in the codec test looked for `python3`, which Windows does not have. It now probes `python3`, `python`, `py` and uses the first one that runs. The oracle is still a second implementation in Python. | `src/lib/klipper/codec.test.ts` |

No requirement was reworded or dropped. Nothing outside R-S01..R-S28 was touched.

## Coverage

| Id | Path | Test that proves the acceptance line |
| --- | --- | --- |
| R-S01 | `src/lib/guide.ts`; `src/components/bench-app.tsx` | `acceptance.test.ts` "R-S01" |
| R-S02 | `package.json`; `launcher/bench_launcher.py` | "R-S02" |
| R-S03 | `src/types/serial.d.ts`; `wiki/connect.md`; `wiki/README.md` | "R-S03" |
| R-S04 | `src/lib/frontends.ts`; `src/components/bench-app.tsx`; `wiki/connect.md` | "R-S04" |
| R-S05 | `src/lib/klipper/session.ts` | "R-S05"; `codec.test.ts` oracle |
| R-S06 | `src/lib/klipper/session.ts`; `src/lib/model.ts` | "R-S06" |
| R-S07 | `src/lib/hx717.ts`; `src/lib/frontends.ts` | "R-S07"; `hx717.test.ts` |
| R-S08 | `src/lib/klipper/session.ts` | "R-S08" |
| R-S09 | `src/lib/analyze.ts`; `src/components/bench-context.tsx` | "R-S09" |
| R-S10 | `src/lib/model.ts`; `src/lib/ads1220.ts`; `src/components/bench-context.tsx` | "R-S10"; `ads1220.test.ts` |
| R-S11 | `src/lib/wiring.ts` | "R-S11"; `wiring.test.ts` |
| R-S12 | `wiki/live.md`; `src/components/how-to.tsx` | "R-S12" |
| R-S13 | `src/components/bench-context.tsx`; `src/lib/analyze.ts` | "R-S13" |
| R-S14 | `src/components/bench-context.tsx`; `wiki/live.md` | "R-S14" |
| R-S15 | `src/lib/analyze.ts` | "R-S15"; `analyze.test.ts` |
| R-S16 | `src/lib/frontends.ts`; `src/lib/hx717.ts`; `src/components/bench-app.tsx` | "R-S16" |
| R-S17 | `src/lib/analyze.ts` | "R-S17"; `analyze.test.ts` |
| R-S18 | `src/lib/analyze.ts`; `src/components/bench-context.tsx`; `wiki/accuracy.md` | "R-S18" |
| R-S19 | `src/lib/analyze.ts`; `wiki/accuracy.md` | "R-S19" |
| R-S20 | `src/lib/analyze.ts` | "R-S20"; `analyze.test.ts` |
| R-S21 | `src/lib/analyze.ts`; `wiki/results.md` | "R-S21" |
| R-S22 | `src/lib/guide.ts`; `src/lib/report.ts`; `wiki/results.md` | "R-S22"; `guide.test.ts` |
| R-S23 | `src/lib/cell-file.ts`; `src/lib/frontends.ts` | "R-S23"; `cell-file.test.ts` |
| R-S24 | `src/lib/model.ts`; `wiki/build.md` | "R-S24"; `analyze.test.ts` (the preset catalogue assertions are in the R-S24 test) |
| R-S25 | `src/lib/dxf.ts`; `src/components/sketch-upload.tsx` | "R-S25"; `dxf.test.ts` |
| R-S26 | `src/lib/simulator.ts`; `wiki/connect.md` | "R-S26"; `analyze.test.ts` |
| R-S27 | `launcher/bench_launcher.py` | "R-S27"; `launcher/test_bench_launcher.py` |
| R-S28 | `src/lib/frontends.ts`; `wiki/README.md`; `wiki/results.md` | "R-S28" |

## Tests run

| Command | Result |
| --- | --- |
| `npm test` | 83 tests, 83 pass, 0 fail |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | success, 5 static pages |
| `py launcher/test_bench_launcher.py` | 7 tests, OK |

`npm test` was 55 tests before this pass and is 83 now: the 28 new acceptance
tests, one per requirement id.

The Build tab gauge list under R-S24 now holds ten presets: BA1000-3AA,
BA1000-3A 1 kΩ, BA500-3AB 350 Ω, BA500-3AB 1 kΩ, BA300-3AF 350 Ω, BFL-350,
BFL-1K, a 350 Ω foil, a generic 1 kΩ foil, and a custom gauge. The dropdown in
`src/components/bench-app.tsx` maps `GAUGE_PRESETS`, so it picks the new rows up
without a UI edit. `custom` stays last because `gaugeById` falls back to the last
entry.

## Notes for QA

- The app is served by `next dev -H 0.0.0.0 -p 4471` / `next start -H 0.0.0.0 -p 4471`.
- `node_modules` was missing from this directory. It was copied from
  `F:\Cursor\projects\loadcell-bench\node_modules` (the leftovers the move left
  behind). It is gitignored and is not part of the commit.
- `package-lock.json` was already modified in the working tree before this pass
  (the project rename `tmp-scaffold` to `k2-loadcell-bench`). It is unrelated to
  these ids and was left uncommitted.
- The ids whose acceptance check is about operator-facing text (R-S03, R-S04,
  R-S12, R-S14, R-S18, R-S21, R-S22, R-S28) assert the shipped wiki sentence or
  page label, because that text is the artifact the spec names. Everything else
  is asserted through the module under test.
