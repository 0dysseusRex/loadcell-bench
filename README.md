# K2 loadcell bench

A bench program for a laser-cut 6061-T6 loadcell: four BA1000-3AA gauges in a full bridge, glued with Loctite 401 and coated with Loctite 9460. The bridge plugs into a [Plimsoll mini ADS1220](https://github.com/mulcmu/Plimsoll), and that board sits on a [FYSETC H36 Combo V2](https://github.com/FYSETC/H36_Combo_V2).

The H36 runs Klipper. This program speaks Klipper’s USB protocol from the browser, programs the ADS1220, and counts the samples that come back. It is the check you run before the cell goes on a printer.

## Run it

Chrome or Edge. Web Serial is how the page reaches the H36. Firefox and Safari can still open the simulator.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4471](http://127.0.0.1:4471).

`npm test` checks the Klipper frame codec against Klipper’s own byte encoding, the ADS1220 register image, and the speed / accuracy / range math.

## What you can measure

- **Live.** Counts, grams after tare, noise, and a scrolling trace. Auto gain walks 1× to 128× and stops before a bridge offset hits the rail. Invert the sign if pressing the nozzle side goes the wrong way.
- **Speed.** Asks the ADS1220 for each sample rate and reports what actually arrives. A pass is within 8% of the setting, with no MCU overflows, no missing USB blocks, and counts that are not stuck.
- **Accuracy.** Capture the empty cell and known masses. The fit is counts = offset + counts-per-gram × mass. Unload the same masses for hysteresis, repeat one mass for scatter, and hold for 30 seconds to see Loctite 401 creep.
- **Range.** Eight seconds unloaded for the noise floor, then step the load until the ADC saturates or the zero does not come back.

The simulator uses a leaf-spring sketch of the plate (two necks, out-of-plane bending) plus offset, noise, and creep. It is there to learn the workflow. It is not a measurement of your cell. Neck width and length are on the Build tab.

## Wire it

Flash the H36 for USB before connecting it here:

- Micro-controller: STM32
- Processor: STM32G431
- Bootloader offset: no bootloader
- Clock: 12 MHz crystal
- Communication: USB on PA11/PA12
- GPIO pins set at startup: `PA2`

Leave ADS1220 and software SPI enabled. Both are on in a normal Klipper build.

The Plimsoll mini board on an H36 Combo V2 uses software SPI:

| Signal | Pin |
| --- | --- |
| CS | PA14 |
| DRDY | PA1 |
| SCLK | PB7 |
| MOSI | PB13 |
| MISO | PA15 |

The four-conductor cable in the build photos (red, green, blue, black) lands on the mini board’s E+, E−, S+, and S− pads. This program does not assume which color is which. If the sign is backwards, invert it in the live panel. Do not swap excitation with signal.

Klipper on the printer and this bench cannot share the USB port. Disconnect here before starting the printer.

## After the bench

The Build tab downloads a `load_cell` snippet with the gain, rate, and, once you apply a calibration, `counts_per_gram`. On the printer:

1. `LOAD_CELL_DIAGNOSTIC`
2. `LOAD_CELL_CALIBRATE`
3. `LOAD_CELL_TEST_TAP` before a real probe
4. Keep the nozzle near 140°C while probing so ooze is not the thing you touch

Pressure advance is not computed here. If the range test calls the cell a force-trace candidate (about 1.5 g of 3-sigma noise at 330 Hz or faster, and the zero comes back), an extrusion force trace is worth logging. Mainline Klipper does not turn that trace into a pressure-advance value by itself.

## The part

`hardware/NewLoadcell.dxf` is the cut file. The plate is 38 × 24 mm, 0.100 in thick. The drawing is in millimeters.
