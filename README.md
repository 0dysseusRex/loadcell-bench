# Load cell bench

A bench for any full-bridge load cell. The bridge plugs into a [Plimsoll](https://github.com/mulcmu/Plimsoll) ADC, which is either a mini board on a [FYSETC H36 Combo V2](https://github.com/FYSETC/H36_Combo_V2) or an alpha board with its own USB port. The K2 plate in this repo — laser-cut 6061-T6, four BA1000-3AA gauges, Loctite 401 under Loctite 9460 — is one worked example, not the only cell the tests accept.

The board runs Klipper. This program speaks Klipper’s USB protocol from the browser and counts the samples that come back. It is the check you run before the cell goes on a printer. Three fronts are wired up:

- H36 + mini ADS1220
- H36 + mini HX717
- Alpha USB + HX717 (STM32F072, SCLK PC1, DOUT PC2)

The 4-channel ADS131M04 under-bed board is not part of this bench.

## Run it

Chrome or Edge. Web Serial is how the page reaches the board. Firefox and Safari can still open the simulator.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4471](http://127.0.0.1:4471).

`npm test` checks the Klipper frame codec against Klipper’s own byte encoding, the ADS1220 register image, the HX717 gain channels, and the speed / accuracy / range math.

## What you can measure

- **Live.** Counts, grams after tare, noise, and a scrolling trace. On the ADS1220, auto gain walks 1× to 128× and stops before a bridge offset hits the rail. On the HX717 the gain is A-128 or A-64 and is chosen when you connect. Invert the sign if pressing the nozzle side goes the wrong way.
- **Speed.** Asks the ADS1220 for each sample rate, or times the HX717 against its solder-jumper choices (10, 20, 80, 320 Hz). A pass is within 8% of the setting, with no MCU overflows, no missing USB blocks, and counts that are not stuck. A real HX717 passes only the jumper that is fitted. The alpha board’s internal clock can also show up here as chip errors.
- **Accuracy.** Capture the empty cell and known masses, or type mass and counts from a notebook. The fit is counts = offset + counts-per-gram × mass. Unload the same masses for hysteresis, repeat one mass for scatter, and hold for 30 seconds to see adhesive creep.
- **Range.** Eight seconds unloaded for the noise floor, or a noise rms you type in counts. Then step the load until the ADC saturates or the zero does not come back. A rated capacity on the Build tab is the ceiling you set; it does not replace the return-to-zero check.

The Build tab names the cell, takes a counts-per-gram and tare, and keeps an optional leaf-spring sketch (thickness, modulus, yield, gauge factor, neck size). The sketch starts from the K2 plate and is only a starting scale. A scale you type, or a fit you apply, replaces it in the simulator and on the live grams. The simulator adds offset, noise, and creep on top of whichever scale is active. It is there to learn the workflow. It is not a measurement of your cell.

## Wire it

Flash the H36 for USB before connecting it here:

- Micro-controller: STM32
- Processor: STM32G431
- Bootloader offset: no bootloader
- Clock: 12 MHz crystal
- Communication: USB on PA11/PA12
- GPIO pins set at startup: `PA2`

Leave ADS1220 and software SPI enabled. Both are on in a normal Klipper build.

The Plimsoll mini ADS1220 on an H36 Combo V2 uses software SPI:

| Signal | Pin |
| --- | --- |
| CS | PA14 |
| DRDY | PA1 |
| SCLK | PB7 |
| MOSI | PB13 |
| MISO | PA15 |

The mini HX717 on the same header is not SPI. SCLK is PB7 and DOUT is PA15. The rate is a solder jumper, 320 Hz unless you moved it. Gain in the config is `A-128` or `A-64`.

The alpha board is its own MCU. Flash it as STM32F072, no bootloader, internal clock, USB on PA11/PA12. Optional startup pin PC7 for the power LED. The HX717 on that board uses SCLK PC1 and DOUT PC2. The internal clock is what the published sample config uses, and it can time out a probe; the speed test is where that shows up.

The four-conductor cable in the build photos (red, green, blue, black) lands on the mini board’s E+, E−, S+, and S− pads. This program does not assume which color is which. If the sign is backwards, invert it in the live panel. Do not swap excitation with signal.

Klipper on the printer and this bench cannot share the USB port. Disconnect here before starting the printer.

## After the bench

The Build tab downloads a `load_cell` snippet named after the cell, with the gain, rate, and, once you apply a calibration or type a scale, `counts_per_gram`. On the printer:

1. `LOAD_CELL_DIAGNOSTIC`
2. `LOAD_CELL_CALIBRATE`
3. `LOAD_CELL_TEST_TAP` before a real probe
4. Keep the nozzle near 140°C while probing so ooze is not the thing you touch

Pressure advance is not computed here. If the range test calls the cell a force-trace candidate (about 1.5 g of 3-sigma noise at 330 Hz or faster, and the zero comes back), an extrusion force trace is worth logging. Mainline Klipper does not turn that trace into a pressure-advance value by itself.

## The K2 plate

`hardware/NewLoadcell.dxf` is the cut file for the example cell. The plate is 38 × 24 mm, 0.100 in thick. The drawing is in millimeters. Other designs skip the DXF and type their own measurements.
