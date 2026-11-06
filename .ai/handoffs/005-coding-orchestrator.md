# Handoff 005 — Coding to Orchestrator

## What I was asked to do

Task 01a1b343-1e21-7be3-8be7-945a8d43b1ce: add seven strain gauge presets to
the bench app, show them in the Build tab dropdown, and list them in
`wiki/build.md`.

## Requirement ids touched

- **R-S24** — the Custom K2 plate profile, the bending sketch and the bridge
  factors. The gauge preset catalogue is the Build tab's gauge selector, which
  R-S24 owns.

No other id was touched. The task text named no id; R-S24 is the one whose
Build tab surface this change extends.

## What changed

| File | Change |
| --- | --- |
| `src/lib/model.ts` | `GAUGE_PRESETS` goes from 3 to 10 entries. New ids: `ba1000-3a-1k`, `ba500-3ab-350`, `ba500-3ab-1k`, `ba300-3af-350`, `bfl-350`, `bfl-1k`, `generic-foil-1k`. `custom` stays the last entry. |
| `src/lib/acceptance.test.ts` | The R-S24 test now asserts the exact preset id order, the resistance, gauge factor and grid size of each new preset, that `custom` is last, that `gaugeById` falls back to `custom`, that the dropdown maps `GAUGE_PRESETS`, and that `wiki/build.md` lists the BA500-3AB. |
| `wiki/build.md` | The preset sentence names all ten presets, and a new table gives resistance, gauge factor and grid size for each. |
| `.ai/IMPLEMENTATION_REPORT.md` | R-S24 row and the note under the test table mention the preset catalogue. |

No component edit was needed: `src/components/bench-app.tsx` already renders the
dropdown with `GAUGE_PRESETS.map(...)`, so the new rows appear on their own.

Preset values as given in the task:

| id | Ω | GF | grid width × length, mm |
| --- | --- | --- | --- |
| ba1000-3a-1k | 1000 | 2.0 | 3.0 × 5.3 |
| ba500-3ab-350 | 350 | 2.0 | 4.5 × 3.0 |
| ba500-3ab-1k | 1000 | 2.0 | 4.5 × 3.0 |
| ba300-3af-350 | 350 | 2.0 | 3.0 × 1.7 |
| bfl-350 | 350 | 2.0 | 3.0 × 3.0 |
| bfl-1k | 1000 | 2.0 | 3.0 × 3.0 |
| generic-foil-1k | 1000 | 2.0 | 4.0 × 5.0 (placeholder) |

## Tests run

| Command | Result |
| --- | --- |
| `npm test` | 83 tests, 83 pass, 0 fail. `R-S24` passes with the new assertions. |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | success, static pages built |

## Residual risk

- The preset grid sizes and gauge factors are the values the task supplied. They
  are not measured from a datasheet in this repo, and nothing in the app claims
  they are exact. A wrong grid size only shifts the bending sketch numbers a
  person reads; it does not touch a bench pass or fail line.
- `generic-foil-1k` is a placeholder, and its note tells the user to measure the
  package.
- Adding presets changes no acceptance threshold and no stored cell file format.
- `package-lock.json` shows an unrelated pre-existing modification (the package
  name is still `tmp-scaffold` in the committed lockfile). I left it alone and
  did not commit it.

## Next agent

Orchestrator. QA may want to re-read the R-S24 test to confirm the catalogue
assertions, and to check that no wiki page still says the app has three presets.
