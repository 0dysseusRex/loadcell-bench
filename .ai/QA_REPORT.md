# QA Report — Load Cell Bench v0.1.0

## Build Verification (all at F:\AionUi\projects\loadcell-bench)

| Command | Result |
|---|---|
| `npm test` | ✅ 83/83 pass, 0 fail |
| `npx tsc --noEmit` | ✅ Clean (exit 0, no errors) |
| `npm run lint` | ✅ Clean (exit 0, no errors) |
| `npm run build` | ✅ Success — 5 static pages generated |

## Requirement-by-Requirement Verification

### Software (R-S01–R-S28): APPROVED
All 28 requirements verified against source files under `src/lib/`. Every acceptance test passes. Evidence paths in IMPLEMENTATION_REPORT.md confirmed accurate.

### Electrical (R-E01–R-E10): APPROVED
Orchestrator review confirmed all 10 electrical requirements consistent with source files (`model.ts`, `frontends.ts`, `ads1220.ts`, `hx717.ts`), wiki docs, PCB schematics, and FAB orders. No discrepancies found.

### Mechanical (R-M01–M08): APPROVED
Engineering review confirmed all 8 mechanical requirements consistent with source files (`model.ts`, `dxf.test.ts`, `guide.ts`), wiki docs, KiCad PCB, and FAB orders. No discrepancies found.

## Behaviour Spot Checks (from Coding's residual risks)

| Req | Check | Verdict |
|---|---|---|
| R-S19 | Hysteresis >2% adds note but does NOT fail line | ✅ PASS — analyze.ts only checks R², worst miss, negative scale |
| R-S21 | probeReady/forceReady gates shut when bestRateHz unknown | ✅ PASS — gate logic requires bestRateHz !== null |

## Verdict: **APPROVED**

All 46 requirements (S01–S28 + E01–E10 + M01–M08) meet their acceptance criteria.
Build is clean. Tests pass. No blocking issues.

## Residual Risks (informational, non-blocking)
- R-S03/04/12/14/18/21/22/28 assert shipped wiki sentences, not rendered UI. No browser harness exists.
- Klipper handshake, SPI timing, and pin maps proven by codec/oracle and constants, not by live board.
- No real load cell exercised. Simulator covers creep/saturation/drop behaviour.
