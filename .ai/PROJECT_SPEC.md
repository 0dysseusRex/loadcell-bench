---
owner: planner
spec_gate: open
state: PLANNING
---

# Project spec

## Objectives

Give one place the software, electrical, and mechanical behavior of the load cell bench, as that behavior is written in `F:\Cursor\projects\loadcell-bench`. The bench checks a 4-wire load cell before it goes on a printer. The Custom K2 plate and the flex-bridge board are the hardware example in the same repo.

## Requirements

All ids are blocked by spec approval. Full fields are copied here. Software ids are also in `SOFTWARE_SPEC.md`. Electrical and mechanical ids are also in `ENGINEERING_SPEC.md`.

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

## Constraints

- Chrome or Edge for a real board. Firefox and Safari stay on the simulator. R-S03.
- Node.js 18.18 or newer for the launcher, and a Node that includes npm. R-S27.
- The printer and this page do not share the USB port. R-S28.
- ADS131M04 is out of this bench. R-E10.
- Cable colors are not a pinout. R-E06.
- The bending sketch is not a stress analysis, and a DXF click check is not a stress analysis. R-S24, R-S25.
- The bench app, launcher, and user guide are MIT. The Custom K2 plate, cut file, and hardware wiki are CERN-OHL-P v2.
- AI-written pin maps, cut files, bending numbers, and pass limits are a starting point. Evidence: `F:\Cursor\projects\loadcell-bench\README.md`.

## Assumptions

See `ASSUMPTIONS.md`. No inferred requirement ids were added. Handbook yields, the 1.6 × 8 mm necks, and the simulator’s 0.3% creep are starting figures from the repo, not measured certificates.

## Risks

- R-S19: the wiki says hysteresis does not fail the straight-line check, and `judgeAccuracy` currently fails the verdict when that note is present.
- R-S21: `analyzeRange` can mark a probe candidate when noise or best rate is null.
- R-E05 versus the ADS front default: the mini board is described as 3.3 V ratiometric, and both ADS fronts open with `vref` `internal`.
- R-M07 versus the KiCad title block: the flex page splits gauges across faces, and the schematic and PCB title blocks say four gauges on one face.
- R-E09: `flex-bridge.kicad_pro` text variable `BRIDGE` says 1 oz copper. The PCB title block and `ORDER.txt` say 0.5 oz.
- Silk on the flex is below the legend minimum written in `ORDER.txt`.
- A simulator pass can be mistaken for a measurement of metal.

## Acceptance Criteria

Every id above stays blocked until spec approval. A later acceptance pass checks the acceptance line on that id against the evidence path. This document does not mark any id accepted.

## Deliverables

- The browser bench, the launcher, and the wiki guide.
- The Custom K2 cut file and build notes.
- The flex-bridge KiCad project and the JLCPCB Gerber set already in `hardware\flex-bridge\fab\jlcpcb\`.

## Out of Scope

- Running bed probes, `LOAD_CELL_TEST_TAP`, or pressure-advance calculation inside this app. R-S21, R-S28.
- The ADS131M04 under-bed board. R-E10.
- Ordering or assembling boards as part of this export.
- Firmware source. The untracked `h36-combo-v2-usb.bin` has no spec id.
