---
owner: planner
spec_gate: open
state: PLANNING
---

# Engineering spec

## Objectives

State the electrical interface and the mechanical example already drawn in the loadcell-bench checkout: the Plimsoll fronts, the Custom K2 plate, and the flex-bridge board. Both tracks stay blocked by spec approval.

## Requirements

Electrical ids R-E01 through R-E10 and mechanical ids R-M01 through R-M08, copied from the project requirements. Each one is blocked by spec approval.

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

- H36 V2 and H36 v1 headers are both 2×6 and they are not interchangeable. R-E01, R-E02.
- Startup pin `PA2` is not the CAN pin `!PA2`. R-E04.
- Do not swap an excitation diagonal with a signal diagonal. R-E06.
- The flex order recorded in the repo is 0.5 oz copper, one layer, no assembly, and no drill file. R-E09.
- The bending numbers and the rated capacity are ceilings, not a calibration. R-M05.
- The Custom K2 plate, cut file, and hardware wiki pages are CERN-OHL-P v2.


## Assumptions

No inferred electrical or mechanical requirement ids. Neck sizes are starting measures from the cut file. Alloy yields are handbook typicals. Gauge face for the flex is taken from `flex-pcb.md` as R-M07, and the conflicting KiCad title block is an unknown, not a second id. See `ASSUMPTIONS.md`.

## Risks

- R-M07 disagrees with the schematic and PCB title blocks, which say four gauges on one face.
- R-E09 disagrees with the KiCad project text variable `BRIDGE`, which says 1 oz copper.
- `ORDER.txt` says the flex legend is under the JLCPCB legend minimum and may be thickened or dropped.
- R-E07 records that the project comment and the Plimsoll schematic name AIN2 and AIN3 differently. The bench follows AIN0 minus AIN1.
- R-E05 says the matching ADS1220 reference is the analog supply. The software default for those fronts is internal. See the handoff Unknowns.


## Acceptance Criteria

Each electrical and mechanical id stays blocked until spec approval. A later pass compares the acceptance check with the KiCad, DXF, and wiki evidence. This spec does not approve fabrication.

## Deliverables

- `F:\Cursor\projects\loadcell-bench\hardware\NewLoadcell.dxf` and the served copy `F:\Cursor\projects\loadcell-bench\public\cell\NewLoadcell.dxf`.
- `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge` schematic, PCB, footprints, and the JLCPCB Gerbers and `ORDER.txt`.
- The Custom K2 build pages under `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell`.


## Out of Scope

- Designing a new plate or a new amplifier.
- Including the ADS131M04. R-E10.
- Treating the simulator or the bending sketch as a measurement of cut metal.
- Assembly of gauges by the fab house. R-E09 leaves assembly off.

