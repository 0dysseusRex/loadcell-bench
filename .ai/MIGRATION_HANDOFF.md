---
owner: migration
spec_gate: open
state: PLANNING
---

# Migration handoff

## Summary

Load cell bench is a browser app for checking a 4-wire load cell before it goes on a printer. It talks to a Plimsoll amplifier running Klipper over USB, or it runs a built-in simulator, and it measures how fast readings arrive, how straight they are against known masses, and how much load the cell takes before the converter saturates or the zero fails to return. The Custom K2 Loadcell plate and the flex-bridge board are a hardware example in the same repo, under a separate CERN hardware licence.

This export was taken from the checkout at `F:\Cursor\projects\loadcell-bench`. No engineering harness directory named `harness\templates` containing `PROJECT_SPEC.md` or `MIGRATION_HANDOFF.md` was found on this PC, so every file uses the assigned frontmatter. Chat is not the record. Facts that are not in the repo are under Unknowns or marked inferred. No requirement id was created without an evidence path.

The work is in PLANNING. `spec_gate` is open. Every track is blocked by spec approval. The recommended next state is PLANNING.

## Requirements

Each id is blocked by spec approval. Confidence is explicit when a file, test, comment, or doc states the behavior. No inferred requirement ids were created.

### R-S01

- statement: The bench checks a 4-wire load cell from the browser, through a Plimsoll amplifier running Klipper over USB or through the built-in simulator, and it measures speed, straightness against known masses, and load until the converter saturates or the zero fails to return.
- track: software
- blocked_by: spec approval
- acceptance check: A simulator session can produce a speed result, an accuracy result, and a range result. Compile results stays off until all three exist.
- evidence: `F:\Cursor\projects\loadcell-bench\README.md`; `F:\Cursor\projects\loadcell-bench\wiki\README.md`; `F:\Cursor\projects\loadcell-bench\src\lib\guide.ts`
- confidence: explicit

### R-S02

- statement: The Next.js app serves on port 4471. `npm run dev` and `npm run start` bind `0.0.0.0`. The documented page is `http://127.0.0.1:4471`.
- track: software
- blocked_by: spec approval
- acceptance check: `package.json` scripts `dev` and `start` contain `-H 0.0.0.0 -p 4471`, and the launcher uses the same port.
- evidence: `F:\Cursor\projects\loadcell-bench\package.json`; `F:\Cursor\projects\loadcell-bench\launcher\bench_launcher.py`; `F:\Cursor\projects\loadcell-bench\README.md`
- confidence: explicit

### R-S03

- statement: Web Serial connect needs Chrome or Edge. Firefox and Safari can still open the simulator. The Connect control cannot see USB in other browsers.
- track: software
- blocked_by: spec approval
- acceptance check: The connect and troubleshooting pages state that split, and the page uses the Web Serial API.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\connect.md`; `F:\Cursor\projects\loadcell-bench\wiki\troubleshooting.md`; `F:\Cursor\projects\loadcell-bench\src\types\serial.d.ts`
- confidence: explicit

### R-S04

- statement: The amp menu offers five fronts: H36 V2 + mini ADS1220, H36 V1 + mini ADS1220, H36 V2 + mini HX717, H36 V1 + mini HX717, and Alpha USB + HX717. The menu is locked while a source is connected.
- track: software
- blocked_by: spec approval
- acceptance check: `FRONTS` has those five ids, and the connect page says the menu stays locked until disconnect.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\wiki\connect.md`
- confidence: explicit

### R-S05

- statement: Connect opens the serial port at 250000 baud, reads the Klipper command dictionary, checks that the sensor commands and pins exist, and sends a one-sensor config. Klipper on USB does not use that baud for timing.
- track: software
- blocked_by: spec approval
- acceptance check: `H36Session` calls `port.open` with baud 250000, then requires `config_ads1220` or `config_hx71x` and the matching query commands.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts`; `F:\Cursor\projects\loadcell-bench\wiki\connect.md`
- confidence: explicit

### R-S06

- statement: An ADS1220 connect uses SPI mode 1 at 256 kHz. H36 V2 uses software SPI on CS PA14, DRDY PA1, SCLK PB7, MOSI PA13, and MISO PA15. H36 V1 uses hardware bus `spi1a` with CS PB6, DRDY PC13, SCLK PB3, MOSI PB5, and MISO PB4. The SPI object is 0 and the ADS1220 object is 1. Starting the stream resets the chip, writes the registers, and reads them back. A failed reset or write names those pins.
- track: software
- blocked_by: spec approval
- acceptance check: `SPI_HZ` is 256000, the pin constants match the lists above, and the troubleshooting page names the same pins when the register write fails.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\wiki\troubleshooting.md`
- confidence: explicit

### R-S07

- statement: An HX717 connect sends `config_hx71x` with gain A-128 or A-64 only. Channel B is not offered. Gain is fixed until disconnect and connect. The pins are V2 SCLK PB7 and DOUT PA15, V1 SCLK PB3 and DOUT PB4, and alpha SCLK PC1 and DOUT PC2.
- track: software
- blocked_by: spec approval
- acceptance check: `hx717GainChannel` accepts only 128 and 64, and each HX717 front carries the pins above.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\wiki\connect.md`
- confidence: explicit

### R-S08

- statement: If the board is in shutdown, or it already has a config checksum from another host, the first connect resets the MCU and tells the operator to connect again.
- track: software
- blocked_by: spec approval
- acceptance check: `session.ts` throws the shutdown and "configured by another host" errors that say the board has been reset and to connect again.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\klipper\session.ts`; `F:\Cursor\projects\loadcell-bench\wiki\connect.md`
- confidence: explicit

### R-S09

- statement: Live shows grams when a scale exists and counts until then. The line under the headline is the integer count and the rate from sample index over host time. Noise rms is the jitter in the recent still window. Overflows count MCU buffer overruns. USB gaps count missing bulk-data blocks. HX717 chip errors are the desync and long-read sentinels.
- track: software
- blocked_by: spec approval
- acceptance check: The headline window is 0.45 s. `rollingRate` uses sample index over host time and ignores an index restart. `isHxErrorSample` matches the two Klipper sentinel values.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\live.md`; `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx`
- confidence: explicit

### R-S10

- statement: ADS1220 live controls offer gains 1, 2, 4, 8, 16, 32, 64, and 128; normal rates 20, 45, 90, 175, 330, 600, and 1000 Hz; and turbo rates 40, 90, 180, 350, 660, 1200, and 2000 Hz. Ninety hertz is the normal setting, not a second turbo chip. Reference is the internal 2.048 V or the analog supply. Auto gain walks the ADS1220 gains and stops before the unloaded offset hits the rail. Saturation is about 8.2 million counts, near ±8388607.
- track: software
- blocked_by: spec approval
- acceptance check: `NORMAL_RATES`, `TURBO_RATES`, and `GAINS` match those lists. `isTurboRate` is false for 90. `isSaturated` trips at ±8200000. Auto gain breaks when a candidate is saturated or the level exceeds 0.22 of 8388608, and it keeps the previous gain.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`
- confidence: explicit

### R-S11

- statement: Check wiring reads each ADS1220 pin to ground and each pair, empty and then loaded, at gain 1 with the analog supply as the reference. About 1.65 V is about 4.2 million counts. A full Wheatstone bridge passes when the two sense wires move in opposite directions and the difference stays near the middle. A half bridge, quarter bridge, or one span of a three-gauge series passes when one midpoint moves, the resistor midpoint stays, and the difference stays near the middle. Two wires that move apart are reported as a full bridge. The live trace follows the pair the check names. Choosing the three-gauge series sets the Build tab bridge to half, because that test is one span completed with two resistors.
- track: software
- blocked_by: spec approval
- acceptance check: `CELL_KINDS` states those four pass rules, and `interpretForKind` returns `ok` only for the matching pattern. The series choice tells the operator that the Build tab bridge becomes half.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\wiring.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\wiring.test.ts`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`; `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx`
- confidence: explicit

### R-S12

- statement: The HX717 has no input mux. The Live card still shows the wiring steps for the selected cell and does not scan pins.
- track: software
- blocked_by: spec approval
- acceptance check: The live page says the HX717 card shows the wiring and hides the pin reads.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\live.md`; `F:\Cursor\projects\loadcell-bench\src\components\how-to.tsx`
- confidence: explicit

### R-S13

- statement: Tare uses the recent capture window and is refused while the reading is still moving. Invert sign multiplies the displayed grams by −1. The raw counts in the log stay as the chip sent them. A negative fitted scale tells the operator to turn Invert on and capture again.
- track: software
- blocked_by: spec approval
- acceptance check: Tare calls `captureMean` for 1.2 s and `stillMoving`. A non-positive `countsPerGram` adds the invert note in `judgeAccuracy`.
- evidence: `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx`; `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`
- confidence: explicit

### R-S14

- statement: CSV downloads the samples on the chart. The link log is the running text of connects, resets, and test lines.
- track: software
- blocked_by: spec approval
- acceptance check: The live page describes both controls, and the app builds a `text/csv` download named from the cell.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\live.md`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx`
- confidence: explicit

### R-S15

- statement: A speed row passes only when samples arrived, the measured rate is within 8% of the asked rate, there were no MCU overflows and no missing USB blocks, an HX717 reported no chip errors, no more than about 1% of samples are on the rail, and the counts are not a single frozen value.
- track: software
- blocked_by: spec approval
- acceptance check: `GOALS.rateTolerance` is 0.08 and `analyzeRate` requires every condition above before `pass` is true.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\analyze.test.ts`; `F:\Cursor\projects\loadcell-bench\wiki\speed.md`
- confidence: explicit

### R-S16

- statement: The default ADS1220 sweep is 90, 175, 330, and 660 Hz. Other normal and turbo rates can be added. Seconds at each rate run from 2 to 15. HX717 rates are 10, 20, 80, and 320 Hz. A real HX717 passes only the jumper that is fitted. The simulator can hit every listed rate.
- track: software
- blocked_by: spec approval
- acceptance check: ADS fronts use `speedRates` 90, 175, 330, and 660. The seconds control has min 2 and max 15. `HX717_RATES` is 10, 20, 80, and 320.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx`; `F:\Cursor\projects\loadcell-bench\wiki\speed.md`
- confidence: explicit

### R-S17

- statement: Accuracy fits counts = offset + counts per gram × mass. The empty cell and at least one other mass are required. Points that are all the same mass cannot define a line. The verdict passes when R² is at least 0.995, the worst miss is no larger than the bigger of 0.5 g and 1% of the heaviest mass, and counts per gram are positive.
- track: software
- blocked_by: spec approval
- acceptance check: `fitLine` throws on fewer than two points and on a zero mass denominator. `GOALS.minR2` is 0.995, `linearityFloorGrams` is 0.5, and `linearityFraction` is 0.01.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\analyze.test.ts`; `F:\Cursor\projects\loadcell-bench\wiki\accuracy.md`
- confidence: explicit

### R-S18

- statement: Capture empty records 0 g. Capture load, capture unload, and repeat this mass record the mass on the cell. Counts are the mean of about the last 1.2 seconds. The live headline uses about the last 0.45 seconds. A moving reading is refused. The creep control watches one load for 30 seconds. Clear drops the points. Rows can also be typed, and a zero row forces the grams to 0.
- track: software
- blocked_by: spec approval
- acceptance check: `captureMean` defaults to 1.2 s. `creepSeconds` is 30. The accuracy page names empty, load, unload, repeat, and the 30 s hold.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\components\bench-context.tsx`; `F:\Cursor\projects\loadcell-bench\wiki\accuracy.md`
- confidence: explicit

### R-S19

- statement: Hysteresis is the worst disagreement between a load capture and an unload capture at the same mass. It is called out when it exceeds 2% of the heaviest mass. The accuracy page says that call-out does not by itself fail the straight-line check.
- track: software
- blocked_by: spec approval
- acceptance check: `hysteresisOf` returns that worst gram disagreement. `GOALS.hysteresisFraction` is 0.02. The accuracy page says the call-out does not itself fail the line.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\analyze.test.ts`; `F:\Cursor\projects\loadcell-bench\wiki\accuracy.md`
- confidence: explicit

### R-S20

- statement: Range measures the noise floor with the cell empty for about eight seconds, or it accepts a typed noise rms in counts. A measured floor replaces a typed one. Three times the rms, in grams, is the smallest change the report says to trust, and that needs a counts-per-gram. The heaviest step still inside the converter is the top of the electrical range at this gain. A saturated step means this gain is out of room. Zero failed to return when the shift is larger than the bigger of five times the noise or 1 g.
- track: software
- blocked_by: spec approval
- acceptance check: `analyzeRange` sets resolution to 3 × rms grams and sets `yielded` when the zero shift exceeds `max(5 × noiseRmsGrams, 1)`.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\wiki\range.md`; `F:\Cursor\projects\loadcell-bench\src\components\bench-app.tsx`
- confidence: explicit

### R-S21

- statement: A nozzle-probe candidate wants 3-sigma noise at or under 5 g, a passing speed of at least 175 Hz, and a zero that came back. A force-trace candidate wants 3-sigma noise at or under 1.5 g, at least 330 Hz, and a zero that came back. The force-trace line is only offered when the noise is already in grams. These are bench gates. The app does not run a probe and it does not compute pressure advance.
- track: software
- blocked_by: spec approval
- acceptance check: `GOALS.probeNoiseGrams` is 5, `probeMinHz` is 175, `forceNoiseGrams` is 1.5, and `forceMinHz` is 330. The results page says mainline Klipper does not compute pressure advance from a load cell.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`; `F:\Cursor\projects\loadcell-bench\wiki\range.md`; `F:\Cursor\projects\loadcell-bench\wiki\results.md`
- confidence: explicit

### R-S22

- statement: Compile results stays off until speed, accuracy, and range each have a result. The page is one local report. Print uses the browser. Nothing is uploaded, and the app does not store the report on a server. Numbers already captured stay until disconnect or a board change.
- track: software
- blocked_by: spec approval
- acceptance check: `readyToCompile` is true only when speed, accuracy, and range are done. The results page says print stays in the browser.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\guide.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\report.ts`; `F:\Cursor\projects\loadcell-bench\wiki\results.md`; `F:\Cursor\projects\loadcell-bench\wiki\README.md`
- confidence: explicit

### R-S23

- statement: Save this cell downloads JSON with `kind` `loadcell-bench-cell` and `version` 1, and it keeps up to 24 cells in browser storage under `loadcell-bench.cells`. Saving the same name replaces that entry. Remove drops the browser copy only. The DXF is not inside the file. Build also shows a Klipper `load_cell` snippet whose section name is a slug of the cell name. `counts_per_gram` stays a comment until a calibration or a typed scale exists.
- track: software
- blocked_by: spec approval
- acceptance check: `parseCellFile` rejects any other kind or version. `upsertSavedCell` keeps 24 entries. `printerSnippet` comments `counts_per_gram` when the scale is null.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\cell-file.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\wiki\build.md`
- confidence: explicit

### R-S24

- statement: Custom K2 Loadcell fills 6061-T6, 2.54 mm, four necks 1.6 mm by 8 mm, four BA1000-3AA gauges on one face, 1000 Ω, gauge factor 2.0, grid 3.0 × 5.3 mm, and a full bridge. CUSTOM LOADCELL clears the measurements and does not invent stiffness from blanks. The bending sketch uses `k = E × n × w × t³ / L³` for guided leaves in parallel, and it is the wrong model for a column, a shear beam, or a diaphragm. Full, half, and quarter bridges scale the output by 1, 1/2, and 1/4. A typed or fitted scale replaces the sketch, and later sketch edits do not overwrite that measured scale.
- track: software
- blocked_by: spec approval
- acceptance check: `CELL_PROFILES` holds those two presets. `bendingStiffness` returns null until thickness, necks, and modulus are positive. `bridgeFactor` returns 1, 0.5, and 0.25.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\wiki\build.md`
- confidence: explicit

### R-S25

- statement: Upload DXF reads an ASCII DXF. `$INSUNITS` selects inches, feet, millimeters, centimeters, or meters. A unitless file is read as millimeters. Binary DXF is refused. A `.dwg` file is refused with a note to use Save As DXF. Two clicks measure neck width or neck length. Two clicks place a gauge. A grid wider than the neck warns. That warning is a fit check, not a stress analysis.
- track: software
- blocked_by: spec approval
- acceptance check: `UNIT_TO_MM` maps codes 0, 1, 2, 4, 5, and 6. `dxf.ts` throws on a binary DXF. `sketch-upload.tsx` rejects `.dwg`. `gaugeFitMessage` calls out a 3.0 mm grid on a 1.6 mm neck.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\dxf.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\dxf.test.ts`; `F:\Cursor\projects\loadcell-bench\src\components\sketch-upload.tsx`; `F:\Cursor\projects\loadcell-bench\wiki\build.md`
- confidence: explicit

### R-S26

- statement: The simulator uses the sketch as the starting scale when the neck fields are filled in. It adds a small offset, noise, a short mechanical settle, and creep on the load only. Creep is 0.3% of the load with an 18 second time constant. It can also saturate, overflow, or drop USB blocks. A simulator pass is not a measurement of the metal. On the wiring check the simulator has one signal, so the badge says Issue.
- track: software
- blocked_by: spec approval
- acceptance check: `creepTarget` uses 0.003 and the creep time constant in the simulator is 18 s. The connect page says a simulator pass is not a measurement of metal.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\simulator.ts`; `F:\Cursor\projects\loadcell-bench\wiki\accuracy.md`; `F:\Cursor\projects\loadcell-bench\wiki\connect.md`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`
- confidence: explicit

### R-S27

- statement: The desktop launcher installs the bench, starts the production server on port 4471, and opens the browser. Install runs `npm install` and `npm run build`. Uninstall removes `node_modules` and the Next.js build. Run again while the server is up opens the page a second time. Close stops the server. Node.js must be 18.18 or newer and must include npm. A Node bundled under a `cursor-agent` path loses to a normal install. Windows uses `launcher\LoadCellBench.exe`. macOS uses `launcher\Load Cell Bench.command`. Linux uses `launcher\loadcell-bench.sh` and needs `python3-tk`.
- track: software
- blocked_by: spec approval
- acceptance check: `MIN_NODE` is `(18, 18, 0)`, `PORT` is 4471, and `prefer_node` sorts a `cursor-agent` path behind a normal install.
- evidence: `F:\Cursor\projects\loadcell-bench\launcher\bench_launcher.py`; `F:\Cursor\projects\loadcell-bench\launcher\test_bench_launcher.py`; `F:\Cursor\projects\loadcell-bench\README.md`
- confidence: explicit

### R-S28

- statement: The printer’s Klipper and this page cannot share the USB port. The operator disconnects here before the printer takes the cable. After that, the documented printer steps are `LOAD_CELL_DIAGNOSTIC`, `LOAD_CELL_CALIBRATE`, `LOAD_CELL_TEST_TAP`, and keeping the nozzle near 140°C while probing. The app does not run those printer tests.
- track: software
- blocked_by: spec approval
- acceptance check: The wiki says probing and pressure advance happen later, on the printer, and the front-end steps list those four printer actions.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\README.md`; `F:\Cursor\projects\loadcell-bench\wiki\results.md`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`
- confidence: explicit

### R-E01

- statement: The Plimsoll mini ADS1220 on an H36 Combo V2 header is software SPI: CS PA14, DRDY PA1, SCLK PB7, MOSI PA13, MISO PA15. PA13 is the MOSI pin on that header. PB13 is the heater MOSFET, not MOSI.
- track: electrical
- blocked_by: spec approval
- acceptance check: `H36_PINS` and the flash page list those five signals, and both say PB13 is the heater.
- evidence: `F:\Cursor\projects\loadcell-bench\README.md`; `F:\Cursor\projects\loadcell-bench\wiki\flash.md`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`
- confidence: explicit

### R-E02

- statement: The same mini ADS1220 on an H36 Combo (v1) header uses hardware SPI bus `spi1a`: CS PB6, DRDY PC13, SCLK PB3, MOSI PB5, MISO PB4. The v1 header is 2×6 and is not the V2 header. PC13 is also the status LED on that board.
- track: electrical
- blocked_by: spec approval
- acceptance check: `H36_V1_ADS_PINS` matches that map, including `spiBus` `spi1a`.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\flash.md`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`
- confidence: explicit

### R-E03

- statement: The mini HX717 is not SPI. On V2, SCLK is PB7 and DOUT is PA15. On v1, SCLK is PB3 and DOUT is PB4. On the alpha board, SCLK is PC1 and DOUT is PC2. The rate is a solder jumper, 320 Hz unless it was moved. Gain in the config is A-128 or A-64. The HX717 is ratiometric, so it has no reference menu.
- track: electrical
- blocked_by: spec approval
- acceptance check: The three HX717 fronts carry those pins, `defaultRate` 320, gains 64 and 128, and `vref` `analog_supply`.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`; `F:\Cursor\projects\loadcell-bench\wiki\flash.md`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`
- confidence: explicit

### R-E04

- statement: H36 V2 USB firmware is STM32G431, 12 MHz crystal, USB on PA11/PA12, startup pin `PA2`, no bootloader. H36 v1 is STM32G0B1 with the same USB and startup pin. The alpha board is STM32F072, internal clock, USB on PA11/PA12, and optional startup pin PC7 for the power LED. `PA2` is not `!PA2`. The bang is the CAN build, which will not enumerate for this page. H36 DFU appears as `0483:df11`.
- track: electrical
- blocked_by: spec approval
- acceptance check: The flash page table matches those three chips, clocks, USB pins, and startup pins, and it names `0483:df11`.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\flash.md`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`
- confidence: explicit

### R-E05

- statement: The Plimsoll mini board excites the bridge from its 3.3 V analog rail. The connector is pin 1 E+, pin 2 E−, pin 3 S−, pin 4 S+. On an ADS1220, the reference that matches that board is the analog supply.
- track: electrical
- blocked_by: spec approval
- acceptance check: `CELL.assumedExcitationV` is 3.3 and `CELL.internalRefV` is 2.048. The build page states the connector order and the analog-supply reference.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`
- confidence: explicit

### R-E06

- statement: The four-conductor cable is red, green, blue, and black in the build photo. This project does not assign a color to a function. Swapping the two wires inside one diagonal only flips the sign. Swapping one diagonal for the other is a different bridge. Excitation stays on E+ and E−. Signal stays on S+ and S−.
- track: electrical
- blocked_by: spec approval
- acceptance check: The README and the build page both say not to swap excitation with signal, and both refuse a color-to-function map.
- evidence: `F:\Cursor\projects\loadcell-bench\README.md`; `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`
- confidence: explicit

### R-E07

- statement: On this board the moving bridge is AIN0 minus AIN1. Both sit near half of the 3.3 V excitation and both move when the flexure bends. AIN2 and AIN3 sit within a few millivolts of ground and do not move. The comment in the register image says the Plimsoll schematic names those pins the other way.
- track: electrical
- blocked_by: spec approval
- acceptance check: `ADS_INPUTS` defaults the live pair to AIN0 minus AIN1 and records AIN2 and AIN3 as the near-ground inputs.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts`; `F:\Cursor\projects\loadcell-bench\wiki\live.md`
- confidence: explicit

### R-E08

- statement: The flex schematic is a full bridge of four BA1K-3AA gauges. R1 is the upper-left tension arm, R4 the lower-right tension arm, R2 the upper-right compression arm, and R3 the lower-left compression arm. The nets are E+, E−, S+, and S−.
- track: electrical
- blocked_by: spec approval
- acceptance check: The schematic title block names that arm pairing, and the PCB pads are net-named E+, E−, S+, and S−.
- evidence: `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_sch`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb`
- confidence: explicit

### R-E09

- statement: The recorded flex order is one copper layer, 50 µm polyimide, 0.5 oz (18 µm) copper, yellow coverlay open on the 12 pads, ENIG, bottom 0.2 mm polyimide stiffener, no drill file, and assembly off. The gauges and the 30 AWG leads are attached by hand. The load-cell drawing is not part of the fab zip.
- track: electrical
- blocked_by: spec approval
- acceptance check: `ORDER.txt` and the PCB title block both state that stack, and the fab directory contains `flex-bridge.GTL`, `flex-bridge.GTS`, `flex-bridge.GTO`, `flex-bridge.GKO`, and `flex-bridge-pib_0.2.gbr`.
- evidence: `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb`; `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\README.md`
- confidence: explicit

### R-E10

- statement: The four-channel ADS131M04 under-bed board is not part of this bench.
- track: electrical
- blocked_by: spec approval
- acceptance check: The README and the connect page both exclude that board, and `FRONTS` has no ADS131 entry.
- evidence: `F:\Cursor\projects\loadcell-bench\README.md`; `F:\Cursor\projects\loadcell-bench\wiki\connect.md`; `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts`
- confidence: explicit

### R-M01

- statement: The Custom K2 example plate is laser-cut 6061-T6, 38 × 24 mm, 0.100 in (2.54 mm) thick. The drawing is in millimeters. The cut file is `hardware\NewLoadcell.dxf`, and the app serves the same drawing from `public\cell\NewLoadcell.dxf`.
- track: mechanical
- blocked_by: spec approval
- acceptance check: `CELL.widthMm` is 38, `CELL.heightMm` is 24, and `CELL.thicknessMm` is 2.54. The DXF test expects `hardware\NewLoadcell.dxf` bounds within 0.2 mm of 38 by 24.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\README.md`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\src\lib\dxf.test.ts`
- confidence: explicit

### R-M02

- statement: The example plate has four necks. The starting size is 1.6 mm wide and 8 mm long. Those sizes come from the cut file and must be replaced with measurements of the cut metal. Necks are deburred before bonding. A nick in a 1.6 mm neck is treated as a crack starter.
- track: mechanical
- blocked_by: spec approval
- acceptance check: `CELL.defaultNeckWidthMm` is 1.6, `defaultNeckLengthMm` is 8, and `defaultNeckCount` is 4. The build page says to deburr and then measure.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`
- confidence: explicit

### R-M03

- statement: The example cell uses four BA1000-3AA foils. Each is 1000 Ω, gauge factor about 2.0, active grid 3.0 × 5.3 mm, on a carrier about 6.7 × 6.5 mm. Bond is Loctite 401. The coat is Loctite 9460. The coat changes stiffness until it has cured, so a zero is not trusted until the cure finishes. The 30 second hold is there to show the creep of that bond.
- track: mechanical
- blocked_by: spec approval
- acceptance check: `CELL.gauge` and `CELL.adhesive` / `CELL.coating` match those materials, and the build page says to let 9460 finish curing before trusting a zero.
- evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`
- confidence: explicit

### R-M04

- statement: A full bridge needs two gauges whose resistance rises under the load and two whose resistance falls. On a guided neck, two gauges on one face, one at each end, see opposite strain. Two gauges in the same moment, both pointing the same way, move together and leave the difference flat. The two gauges of one neck go at opposite ends. The long axis of the grid follows the neck.
- track: mechanical
- blocked_by: spec approval
- acceptance check: The build page states the opposite-end, single-face placement, and the Custom K2 profile records `gaugeMount` `same-face`.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`
- confidence: explicit

### R-M05

- statement: On the starting necks the bending sketch is about 1439 kg/mm, with a yield near 48 kg. Both figures are a ceiling, not a calibration. Rated capacity is a ceiling the operator types. It does not pass or fail the cell by itself. A recorded load past that capacity is called out. The yield line is only a ceiling for a leaf flexure.
- track: mechanical
- blocked_by: spec approval
- acceptance check: The hardware page states about 1439 kg/mm and a yield near 48 kg. `bendingStiffness` uses `E × n × w × t³ / L³` and divides by 9.80665 to report kg/mm. The build page says rated capacity does not pass or fail the cell by itself.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\README.md`; `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`; `F:\Cursor\projects\loadcell-bench\wiki\build.md`
- confidence: explicit

### R-M06

- statement: The flex stiffener is pad-sized under the gauge pads plus one bar under the four wire pads. It does not run down the rails. The recorded stack is nine regions: the wire-pad bar and one rectangle on each gauge pad. JLCPCB can add a fee when a prototype has more than four stiffener regions.
- track: mechanical
- blocked_by: spec approval
- acceptance check: The flex page and `ORDER.txt` both say nine regions and name the bar plus the gauge-pad rectangles. The PCB title block puts that stiffener on `Eco1.User`.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\flex-pcb.md`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb`
- confidence: explicit

### R-M07

- statement: The flex page places gauges A and C on the same face as the flex, bonded straight onto the pads. Gauges B and D are on the other face. Their pads are on two short tongues, and the 30 AWG leads pass through a hole in each neck.
- track: mechanical
- blocked_by: spec approval
- acceptance check: `flex-pcb.md` states that face split and the neck holes for the 30 AWG leads. The flex itself has no drilled holes.
- evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\flex-pcb.md`; `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`
- confidence: explicit

### R-M08

- statement: The flex outline is the two outer sides and the bottom bar. There is no copper across the top. Closed paths inside the plate DXF outline are the laser cuts: the windows, the slot, and the mounting holes.
- track: mechanical
- blocked_by: spec approval
- acceptance check: PCB title-block comment 4 states the outline and the open top. The build page states which DXF paths are laser cuts.
- evidence: `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb`; `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\build.md`
- confidence: explicit

## Current status

Branch: `main`, tracking `origin/main` at `0b549d2`.

Worktree: dirty.

- `package-lock.json` is modified. The diff renames the lockfile root from `tmp-scaffold` to `k2-loadcell-bench`, adds `"license": "MIT"`, and changes `@types/react` and `csstype` from `"dev": true` to `"devOptional": true`. No secret line was present. Nothing was omitted.
- `public\firmware\h36-combo-v2-usb.bin` is untracked. Length 43564 bytes. It is not referenced by the README, the wiki, or `src\`.

What runs: not observed. This pass did not start the app, run `npm test`, run `npm run lint`, or flash a board. `node_modules` and `.next` are present on disk from earlier work. `package.json` declares `dev`, `build`, `start`, `lint`, and `test`.

What fails: not observed. No test command was executed, so there is no pass or fail result from this pass.

Command used: `git status --short --branch`, `git remote -v`, `git branch -vv`, `git log -30 --date=short --pretty=format:"%ad %h %s"`, `git diff --stat -- package-lock.json`, and `git diff -- package-lock.json`.

## Todos

None found.

No `TODO`, `FIXME`, or unchecked markdown task list was found in the repo markdown, TypeScript, Python, or KiCad text that was searched. The word matches in `package-lock.json` and the switch component are integrity hashes and CSS state names, not open work.

## File structure

Top of `F:\Cursor\projects\loadcell-bench`:

- `src\` application source
- `launcher\` desktop launcher source
- `hardware\` Custom K2 plate files and the flex-bridge KiCad project
- `wiki\` user guide and hardware build notes
- `public\` static cell photos, the served DXF, and an untracked firmware binary
- `README.md`, `GUIDE.md`, `LICENSE`, `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `components.json`, `postcss.config.mjs`

Skipped: `node_modules`, `.next`, `launcher\.pyinstaller\venv`, `launcher\.pyinstaller\work`, and `__pycache__`.

Source:

- `src\app\`
- `src\components\`
- `src\components\ui\`
- `src\data\`
- `src\lib\`
- `src\lib\klipper\`
- `src\types\`

Launcher source, not the virtualenv:

- `launcher\`

Firmware binary only, no firmware source tree:

- `public\firmware\`

KiCad and CAD:

- `hardware\`
- `hardware\flex-bridge\`
- `hardware\flex-bridge\flex-bridge.pretty\`
- `hardware\flex-bridge\fab\jlcpcb\`
- `hardware\flex-bridge\.history\`
- `hardware\loadcell.pretty\`

Docs:

- `wiki\`
- `wiki\hardware\custom-k2-loadcell\`
- `wiki\images\`

No `docs\` directory, no `research\` directory, and no `.cursor\` directory are in this checkout.

## Git history

Remote: `origin` `https://github.com/0dysseusRex/loadcell-bench.git` (fetch and push).

Branch: `main` tracks `origin/main`.

Other local branches, each with upstream marked gone: `cursor/bench-launcher-cb75`, `cursor/flex-jlcpcb-order-f023`, `cursor/guide-wiki-cb75`, `cursor/h36-version-pins-cb75`.

`git rev-list --count HEAD` reported 46 commits. The 30 most recent, newest first:

- 2026-10-30 0b549d2 Merge pull request #5 from 0dysseusRex/cursor/live-cell-kind-2776
- 2026-10-30 71660a5 Let the Live tab choose the load cell and show the matching wiring check.
- 2026-10-30 74e025c Restore the Live bench context with the load cell kind.
- 2026-10-30 1bad013 Restore the Live bench context with the load cell kind.
- 2026-10-30 e0a6d54 Let the Live tab choose the load cell and run the matching wiring check.
- 2026-10-30 514dc5d Keep the apostrophe in the how-to live step.
- 2026-10-30 ebc2e1e Mention the load-cell choices in the how-to guide.
- 2026-10-30 8bb4d48 Document the load-cell menu in the live wiring guide.
- 2026-10-30 9ffd825 Restore the wiring interpreter with the load-cell kind checks.
- 2026-10-30 80e49cd Use real minus signs and ohm symbols in the wiring guide.
- 2026-10-30 0b5da6b Add divider wiring checks for half, quarter, and series cells.
- 2026-10-30 c17b46f Cover half, quarter, and series wiring checks.
- 2026-10-30 e037a53 Merge pull request #4 from 0dysseusRex/cursor/live-cell-kind-2776
- 2026-10-30 3d546ec Keep the existing tw-animate-css version range in package.json.
- 2026-10-30 69a36f3 Let the live wiring check follow the load cell type.
- 2026-10-29 52bb700 Merge main into the flex order branch.
- 2026-10-29 bc0acc9 Add the flex-bridge board and the JLCPCB order notes.
- 2026-10-28 00b4ae8 Put the bench introduction and AI disclaimer at the top of the README.
- 2026-10-28 6987911 Keep the wiki opening as the explanation of the bench.
- 2026-10-28 cb67a5a License the bench under MIT and the Custom K2 Loadcell under CERN-OHL-P.
- 2026-10-29 5537bd0 Merge pull request #3 from 0dysseusRex/cursor/guide-wiki-cb75
- 2026-10-28 89e75e6 Turn the bench guide into a wiki with a screenshot of each test.
- 2026-10-29 b330ad7 Merge pull request #2 from 0dysseusRex/cursor/bench-launcher-cb75
- 2026-10-29 9795938 Merge pull request #1 from 0dysseusRex/cursor/h36-version-pins-cb75
- 2026-10-28 f2338b8 Add a desktop launcher that installs the bench, starts the server, and opens the browser.
- 2026-10-28 875e673 Note that the bench tests 4-wire load cells.
- 2026-10-28 3273438 Move ADS pin choices into a wiring check that reports a full bridge or a same-face common mode.
- 2026-10-28 ecf458b Use AIN0 minus AIN1 as the bridge input. AIN2 and AIN3 sit near ground on this board.
- 2026-10-28 f5e1698 Add ADS1220 inputs for reading each sense wire alone.
- 2026-10-28 06b9ab5 Measure the Plimsoll bridge on ADS1220 inputs AIN3 and AIN2.

Gathered with: git log

## Architecture decisions

No ADR directory and no decision records were in the repo. These are the decisions the files already state. Inferred decisions are marked `source: inferred`.

1. The bench application, the launcher, and the user guide are MIT. The Custom K2 plate, the cut file, and the hardware wiki pages are CERN-OHL-P v2. Source: `F:\Cursor\projects\loadcell-bench\README.md` and `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\README.md`.
2. The pre-printer check runs in the browser over Web Serial and speaks Klipper’s USB protocol, instead of running as the printer host. Source: `F:\Cursor\projects\loadcell-bench\README.md`. The choice itself has no ADR. source: inferred.
3. A built-in simulator is a first-class source so the pages can be exercised with no board. Source: `F:\Cursor\projects\loadcell-bench\wiki\connect.md`. source: inferred.
4. The analog fronts in this bench are the Plimsoll mini ADS1220, the mini HX717, and the alpha-board HX717. The ADS131M04 under-bed board is out. Source: `F:\Cursor\projects\loadcell-bench\README.md`.
5. H36 V2 and H36 v1 keep separate pin maps because the 2×6 headers are not the same nets. Source: `F:\Cursor\projects\loadcell-bench\wiki\flash.md`.
6. The live bridge pair on this board is AIN0 minus AIN1. Source: `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts`.
7. The bending calculator is a guided-leaf sketch, not a general stress model. Source: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`.
8. The photographed build still uses jumper wires. The flex PCB is the replacement for those jumpers, and the bench still tests that flex as a 4-wire cell. Source: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\flex-pcb.md`.
9. Pass limits are starting points. A simulator pass is not a measurement of the metal. Source: `F:\Cursor\projects\loadcell-bench\README.md`.

## Research

No separate research directory is in the repo. Notes and links already present:

- Plimsoll ADC: `https://github.com/mulcmu/Plimsoll` in `F:\Cursor\projects\loadcell-bench\README.md`.
- FYSETC H36 Combo V2: `https://github.com/FYSETC/H36_Combo_V2` in `F:\Cursor\projects\loadcell-bench\README.md`.
- JLCPCB flex quote: `https://cart.jlcpcb.com/quote/?orderType=3` in `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`.
- ADS1220 register image is written to match `klippy/extras/ads1220.py`. Source: `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts`.
- HX717 timing is written to match `klippy/extras/hx71x.py` and `sensor_hx71x.c`. Source: `F:\Cursor\projects\loadcell-bench\src\lib\hx717.ts`.
- Klipper codec tests compare against Klipper’s own byte encoding. Source: `F:\Cursor\projects\loadcell-bench\README.md` and `F:\Cursor\projects\loadcell-bench\src\lib\klipper\codec.test.ts`.
- Alloy moduli and yields are labeled handbook typicals, not a certificate. Source: `F:\Cursor\projects\loadcell-bench\wiki\build.md` and `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`.
- A checkout on 29 October 2026 of ten flex boards, with shipping, duties, and a coupon, is recorded as $76.01. Source: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\README.md`.
- The guide screenshots live under `F:\Cursor\projects\loadcell-bench\wiki\images\`.

No new sources were browsed for this export.

## Tools and models

- Cursor rules: none in this repo. No `.cursor` directory was present.
- MCP server names: none named in this repo.
- Models named in config: none.
- KiCad: named. `flex-bridge.kicad_sch` was generated by eeschema 10.0. `flex-bridge.kicad_pcb` was generated by pcbnew 10.0. The wiki points at `hardware\flex-bridge`.

## Unknowns

- Whether `judgeAccuracy` should fail the accuracy verdict when hysteresis exceeds 2%. The wiki says the call-out does not by itself fail the straight-line check. The function pushes that call-out into `notes`, and `pass` is true only when `notes` is empty, so the code fails the verdict on that call-out. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\accuracy.md` and `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts`.
- Whether a missing noise figure or a missing best rate should still count as a probe candidate. `analyzeRange` treats a null noise or a null rate as satisfying the probe comparison, and a null rate as satisfying the force-trace rate comparison. The range page states the 5 g / 175 Hz and 1.5 g / 330 Hz gates as what a candidate wants. Evidence: `F:\Cursor\projects\loadcell-bench\src\lib\analyze.ts` and `F:\Cursor\projects\loadcell-bench\wiki\range.md`.
- Whether the ADS1220 fronts should open on the analog-supply reference. Both ADS fronts set `vref` to `internal`. The live page says the analog supply is the reference that matches the mini board’s 3.3 V excitation. Evidence: `F:\Cursor\projects\loadcell-bench\src\lib\frontends.ts` and `F:\Cursor\projects\loadcell-bench\wiki\live.md`.
- Which gauge-face story is the flex design. `flex-pcb.md` puts gauges B and D on the other face. The schematic and PCB title blocks say four gauges on one face. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\flex-pcb.md` and `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb`.
- Which copper weight the KiCad project text variable is asserting. The PCB title block, the PCB `BRIDGE` property, and `ORDER.txt` say 0.5 oz. `flex-bridge.kicad_pro` text variable `BRIDGE` says 1 oz copper. Evidence: `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pro` and `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`.
- How many `Eco1.User` polygons are in the board file. The order notes say nine stiffener regions. This pass did not count the polygons.
- What `hardware\NewLoadcell-before-wire-holes.dxf` changes relative to `hardware\NewLoadcell.dxf`. The filename is the only difference recorded here. The DXF test reads `hardware\NewLoadcell.dxf` and was not executed.
- What `public\firmware\h36-combo-v2-usb.bin` is for. The filename is the only clue. No source or doc references it. The file was not disassembled.
- Whether the README sentence “a bench for any full-bridge load cell” still bounds the product. Later pages and `wiring.ts` also check half bridges, quarter bridges, and a three-gauge series string. Evidence: `F:\Cursor\projects\loadcell-bench\README.md` and `F:\Cursor\projects\loadcell-bench\src\lib\wiring.ts`.
- The build page lists DXF units as inches, millimeters, centimeters, and meters. `dxf.ts` also maps `$INSUNITS` feet. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\build.md` and `F:\Cursor\projects\loadcell-bench\src\lib\dxf.ts`.
- Whether JLCPCB will thicken or drop the E+ S− S+ E− legend. `ORDER.txt` says the silk is 0.7 mm tall with a 0.12 mm stroke, under that vendor’s 0.8 mm / 0.15 mm legend minimum.
- Runtime health. Tests and the dev server were not run. `npm test` does not include `launcher\test_bench_launcher.py`.
- No datasheet for the BA1000-3AA, the ADS1220, or the HX717 is stored in this repo. Pin and gauge numbers are taken from the project files only.

## Recommended next state

PLANNING.

Tracks stay blocked by spec approval. `spec_gate` stays open. Do not treat this export as implementation approval, fab approval, or a test verdict.
