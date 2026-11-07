---
owner: planner
spec_gate: open
state: PLANNING
---

# Test plan

## Objectives

Name one case for every requirement id. This plan does not run those cases. The tracks stay blocked by spec approval.

## Requirements

The cases below cover R-S01 through R-S28, R-E01 through R-E10, and R-M01 through R-M08. Count: 46.

## Constraints

- Do not start the app, flash a board, or run `npm test` as part of writing this plan.
- A case that needs a physical cell, a Plimsoll board, or a cut plate cannot be closed from the repo text alone.
- Existing unit tests in `src\lib` and `launcher\test_bench_launcher.py` are evidence of intent. They were not executed.

## Assumptions

The acceptance line on each requirement is the check for its case. No inferred requirement ids exist, so no extra cases were added for guesses.

## Risks

- R-S19 and R-S21 have a wiki sentence and a code path that do not say the same thing. A test that only checks the current function can pass while missing the wiki sentence.
- Hardware cases R-M01 through R-M08 and R-E08 through R-E09 need the KiCad and DXF files read, not a browser session.
- `npm test` does not include `launcher\test_bench_launcher.py`.

## Acceptance Criteria

Every requirement id has one case in this file. None of those cases has been run. QA records each id as untested.

## Deliverables

This test plan. The commands already declared in the repo, and not run here, are `npm test` from `F:\Cursor\projects\loadcell-bench\package.json` and the Python launcher test `F:\Cursor\projects\loadcell-bench\launcher\test_bench_launcher.py`.

## Out of Scope

- Executing the cases.
- Adding new product tests.
- Certifying the plate, the flex, or a printer probe.

## Cases

### T-01

- requirement: R-S01
- track: software
- check: A simulator session can produce a speed result, an accuracy result, and a range result. Compile results stays off until all three exist.
- status: not run

### T-02

- requirement: R-S02
- track: software
- check: `package.json` scripts `dev` and `start` contain `-H 0.0.0.0 -p 4471`, and the launcher uses the same port.
- status: not run

### T-03

- requirement: R-S03
- track: software
- check: The connect and troubleshooting pages state that split, and the page uses the Web Serial API.
- status: not run

### T-04

- requirement: R-S04
- track: software
- check: `FRONTS` has those five ids, and the connect page says the menu stays locked until disconnect.
- status: not run

### T-05

- requirement: R-S05
- track: software
- check: `H36Session` calls `port.open` with baud 250000, then requires `config_ads1220` or `config_hx71x` and the matching query commands.
- status: not run

### T-06

- requirement: R-S06
- track: software
- check: `SPI_HZ` is 256000, the pin constants match the lists above, and the troubleshooting page names the same pins when the register write fails.
- status: not run

### T-07

- requirement: R-S07
- track: software
- check: `hx717GainChannel` accepts only 128 and 64, and each HX717 front carries the pins above.
- status: not run

### T-08

- requirement: R-S08
- track: software
- check: `session.ts` throws the shutdown and "configured by another host" errors that say the board has been reset and to connect again.
- status: not run

### T-09

- requirement: R-S09
- track: software
- check: The headline window is 0.45 s. `rollingRate` uses sample index over host time and ignores an index restart. `isHxErrorSample` matches the two Klipper sentinel values.
- status: not run

### T-10

- requirement: R-S10
- track: software
- check: `NORMAL_RATES`, `TURBO_RATES`, and `GAINS` match those lists. `isTurboRate` is false for 90. `isSaturated` trips at ±8200000. Auto gain breaks when a candidate is saturated or the level exceeds 0.22 of 8388608, and it keeps the previous gain.
- status: not run

### T-11

- requirement: R-S11
- track: software
- check: `CELL_KINDS` states those four pass rules, and `interpretForKind` returns `ok` only for the matching pattern. The series choice tells the operator that the Build tab bridge becomes half.
- status: not run

### T-12

- requirement: R-S12
- track: software
- check: The live page says the HX717 card shows the wiring and hides the pin reads.
- status: not run

### T-13

- requirement: R-S13
- track: software
- check: Tare calls `captureMean` for 1.2 s and `stillMoving`. A non-positive `countsPerGram` adds the invert note in `judgeAccuracy`.
- status: not run

### T-14

- requirement: R-S14
- track: software
- check: The live page describes both controls, and the app builds a `text/csv` download named from the cell.
- status: not run

### T-15

- requirement: R-S15
- track: software
- check: `GOALS.rateTolerance` is 0.08 and `analyzeRate` requires every condition above before `pass` is true.
- status: not run

### T-16

- requirement: R-S16
- track: software
- check: ADS fronts use `speedRates` 90, 175, 330, and 660. The seconds control has min 2 and max 15. `HX717_RATES` is 10, 20, 80, and 320.
- status: not run

### T-17

- requirement: R-S17
- track: software
- check: `fitLine` throws on fewer than two points and on a zero mass denominator. `GOALS.minR2` is 0.995, `linearityFloorGrams` is 0.5, and `linearityFraction` is 0.01.
- status: not run

### T-18

- requirement: R-S18
- track: software
- check: `captureMean` defaults to 1.2 s. `creepSeconds` is 30. The accuracy page names empty, load, unload, repeat, and the 30 s hold.
- status: not run

### T-19

- requirement: R-S19
- track: software
- check: `hysteresisOf` returns that worst gram disagreement. `GOALS.hysteresisFraction` is 0.02. The accuracy page says the call-out does not itself fail the line.
- status: not run

### T-20

- requirement: R-S20
- track: software
- check: `analyzeRange` sets resolution to 3 × rms grams and sets `yielded` when the zero shift exceeds `max(5 × noiseRmsGrams, 1)`.
- status: not run

### T-21

- requirement: R-S21
- track: software
- check: `GOALS.probeNoiseGrams` is 5, `probeMinHz` is 175, `forceNoiseGrams` is 1.5, and `forceMinHz` is 330. The results page says mainline Klipper does not compute pressure advance from a load cell.
- status: not run

### T-22

- requirement: R-S22
- track: software
- check: `readyToCompile` is true only when speed, accuracy, and range are done. The results page says print stays in the browser.
- status: not run

### T-23

- requirement: R-S23
- track: software
- check: `parseCellFile` rejects any other kind or version. `upsertSavedCell` keeps 24 entries. `printerSnippet` comments `counts_per_gram` when the scale is null.
- status: not run

### T-24

- requirement: R-S24
- track: software
- check: `CELL_PROFILES` holds those two presets. `bendingStiffness` returns null until thickness, necks, and modulus are positive. `bridgeFactor` returns 1, 0.5, and 0.25.
- status: not run

### T-25

- requirement: R-S25
- track: software
- check: `UNIT_TO_MM` maps codes 0, 1, 2, 4, 5, and 6. `dxf.ts` throws on a binary DXF. `sketch-upload.tsx` rejects `.dwg`. `gaugeFitMessage` calls out a 3.0 mm grid on a 1.6 mm neck.
- status: not run

### T-26

- requirement: R-S26
- track: software
- check: `creepTarget` uses 0.003 and the creep time constant in the simulator is 18 s. The connect page says a simulator pass is not a measurement of metal.
- status: not run

### T-27

- requirement: R-S27
- track: software
- check: `MIN_NODE` is `(18, 18, 0)`, `PORT` is 4471, and `prefer_node` sorts a `cursor-agent` path behind a normal install.
- status: not run

### T-28

- requirement: R-S28
- track: software
- check: The wiki says probing and pressure advance happen later, on the printer, and the front-end steps list those four printer actions.
- status: not run

### T-29

- requirement: R-E01
- track: electrical
- check: `H36_PINS` and the flash page list those five signals, and both say PB13 is the heater.
- status: not run

### T-30

- requirement: R-E02
- track: electrical
- check: `H36_V1_ADS_PINS` matches that map, including `spiBus` `spi1a`.
- status: not run

### T-31

- requirement: R-E03
- track: electrical
- check: The three HX717 fronts carry those pins, `defaultRate` 320, gains 64 and 128, and `vref` `analog_supply`.
- status: not run

### T-32

- requirement: R-E04
- track: electrical
- check: The flash page table matches those three chips, clocks, USB pins, and startup pins, and it names `0483:df11`.
- status: not run

### T-33

- requirement: R-E05
- track: electrical
- check: `CELL.assumedExcitationV` is 3.3 and `CELL.internalRefV` is 2.048. The build page states the connector order and the analog-supply reference.
- status: not run

### T-34

- requirement: R-E06
- track: electrical
- check: The README and the build page both say not to swap excitation with signal, and both refuse a color-to-function map.
- status: not run

### T-35

- requirement: R-E07
- track: electrical
- check: `ADS_INPUTS` defaults the live pair to AIN0 minus AIN1 and records AIN2 and AIN3 as the near-ground inputs.
- status: not run

### T-36

- requirement: R-E08
- track: electrical
- check: The schematic title block names that arm pairing, and the PCB pads are net-named E+, E−, S+, and S−.
- status: not run

### T-37

- requirement: R-E09
- track: electrical
- check: `ORDER.txt` and the PCB title block both state that stack, and the fab directory contains `flex-bridge.GTL`, `flex-bridge.GTS`, `flex-bridge.GTO`, `flex-bridge.GKO`, and `flex-bridge-pib_0.2.gbr`.
- status: not run

### T-38

- requirement: R-E10
- track: electrical
- check: The README and the connect page both exclude that board, and `FRONTS` has no ADS131 entry.
- status: not run

### T-39

- requirement: R-M01
- track: mechanical
- check: `CELL.widthMm` is 38, `CELL.heightMm` is 24, and `CELL.thicknessMm` is 2.54. The DXF test expects `hardware\NewLoadcell.dxf` bounds within 0.2 mm of 38 by 24.
- status: not run

### T-40

- requirement: R-M02
- track: mechanical
- check: `CELL.defaultNeckWidthMm` is 1.6, `defaultNeckLengthMm` is 8, and `defaultNeckCount` is 4. The build page says to deburr and then measure.
- status: not run

### T-41

- requirement: R-M03
- track: mechanical
- check: `CELL.gauge` and `CELL.adhesive` / `CELL.coating` match those materials, and the build page says to let 9460 finish curing before trusting a zero.
- status: not run

### T-42

- requirement: R-M04
- track: mechanical
- check: The build page states the opposite-end, single-face placement, and the Custom K2 profile records `gaugeMount` `same-face`.
- status: not run

### T-43

- requirement: R-M05
- track: mechanical
- check: The hardware page states about 1439 kg/mm and a yield near 48 kg. `bendingStiffness` uses `E × n × w × t³ / L³` and divides by 9.80665 to report kg/mm. The build page says rated capacity does not pass or fail the cell by itself.
- status: not run

### T-44

- requirement: R-M06
- track: mechanical
- check: The flex page and `ORDER.txt` both say nine regions and name the bar plus the gauge-pad rectangles. The PCB title block puts that stiffener on `Eco1.User`.
- status: not run

### T-45

- requirement: R-M07
- track: mechanical
- check: `flex-pcb.md` states that face split and the neck holes for the 30 AWG leads. The flex itself has no drilled holes.
- status: not run

### T-46

- requirement: R-M08
- track: mechanical
- check: PCB title-block comment 4 states the outline and the open top. The build page states which DXF paths are laser cuts.
- status: not run

