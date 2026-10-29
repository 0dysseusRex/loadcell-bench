# Using and understanding the load cell bench

This is the long guide. The short version of how to install and run the app is in [README.md](README.md).

The bench answers one question before a load cell goes on a printer: does this cell, with this amplifier, read fast enough, straight enough, and over a useful weight range? It does that from a browser. A real board speaks Klipper’s USB protocol. A simulator walks the same screens when nothing is plugged in.

Probing the bed and choosing pressure advance happen later, on the printer, and only if this bench has already passed. The app does not pretend to run those tests.

## What a load cell is, in this app

A load cell here is a small metal spring with foil strain gauges glued to it, wired as a bridge. A force bends the metal. The foil stretches or compresses. Its resistance changes a little. The amplifier turns that tiny voltage into a large integer called a count.

One gram should move that integer by a steady amount. That amount is the scale, in counts per gram. Until you have a scale, the live screen stays in counts. Grams appear after you type a scale, fit one from known weights, or accept the stiffness sketch on the Build tab.

The app is for any full-bridge cell of this kind, not only one plate. The Custom K2 Loadcell is a worked example that fills the form so you can see what a complete entry looks like. CUSTOM LOADCELL starts empty.

## The three pieces

Every session has a cell, an amplifier, and a host.

The cell is the metal and the gauges. You describe it on Build: name, alloy, thickness, how many necks, how wide and long those necks are, which gauge, and whether the bridge is full, half, or quarter.

The amplifier is the board on the USB cable. The menu at the top right names the H36 version, because Combo and Combo V2 wire the 2×6 header differently.

| Menu entry | What is on the cable |
| --- | --- |
| H36 V2 + mini ADS1220 | FYSETC H36 Combo V2 with a Plimsoll mini ADS1220 on the 2×6 header |
| H36 V1 + mini ADS1220 | FYSETC H36 Combo (v1) with that same mini board. The header pins are not the V2 pins. |
| H36 V2 + mini HX717 | H36 Combo V2 with a Plimsoll mini HX717 on that header |
| H36 V1 + mini HX717 | H36 Combo (v1) with the mini HX717. SCLK and DOUT moved with the header. |
| Alpha USB + HX717 | A Plimsoll alpha board. It has its own USB port and its own HX717. |

The host is this page. Chrome or Edge can open the board with Web Serial. Firefox and Safari can still run the simulator. The printer’s Klipper and this page cannot share the USB port. Disconnect here before you plug the board back into the printer.

The four-channel ADS131M04 under-bed board is not part of this bench.

## How the screen is arranged

A guide sits on the left on a wide window, and above the tabs on a narrow one. It has six steps. The first unfinished step opens on its own. You can click any step to jump there. Hide and Show collapse the guide on a small screen.

The steps, in order:

1. Select the amp, then connect. The amp menu is the top right. Then press Connect, or Use simulator.
2. Name the cell, on Build.
3. Watch the live reading.
4. See how fast readings arrive.
5. Weigh something you already know.
6. Find the lightest change and the heaviest load.

Build is the first tab. Then Live, Speed, Accuracy, and Range.

Compile results stays off until speed, accuracy, and range each have a result. Naming the cell and connecting are setup. They do not count as test results. When the three tests exist, Compile results opens one plain-language page. Print that page from the browser if you want a copy. Back returns to the bench. Nothing is uploaded.

## A first session, with or without hardware

Open the app in Chrome or Edge.

1. At the top right, pick the board that matches the cable. If you are only learning the screens, skip the board and press Use simulator.
2. Press Connect if a board is plugged in. The browser asks which serial port. Choose the Klipper device. The status line should then show the MCU name, the firmware version, and the clock.
3. On Build, leave the Custom K2 Loadcell filled in, or switch to CUSTOM LOADCELL and type your own cell. Give it a name you will recognize on the report.
4. Open Live and press Start stream. Press on the cell, or move the simulator’s load slider. The big number should move. If a real cell moves the wrong way, turn on Invert.
5. Open Speed and run the sweep. Wait until each rate has a row.
6. Open Accuracy. Capture the empty cell, then at least one known mass. Fit the line. If the line looks right, apply it so the rest of the bench uses those counts per gram.
7. Open Range. Measure the noise with the cell still, then step the load up and capture the return to zero.
8. Press Compile results and read the page in the order it is written.

You can stop after any step. The numbers you already captured stay on the page until you disconnect or change the board.

## Build

Build is where the cell is described, saved, and turned into a starting scale. It does not talk to the board. Connecting can happen before or after you fill it in.

### The two starting cells

Custom K2 Loadcell fills a real example:

- 6061-T6 aluminum, Young’s modulus 68900 MPa, yield 276 MPa
- 2.54 mm thick, which is 0.100 in
- Four necks, 1.6 mm wide and 8 mm long, taken from the cut file as a starting measure
- Four BA1000-3AA gauges on one face, 1000 Ω, gauge factor 2.0, grid 3.0 × 5.3 mm
- Full bridge

Those neck sizes are starting measures, not a certified drawing callout. Change them if you measure the metal.

CUSTOM LOADCELL clears the name and every measurement: material, thickness, neck count, neck width, neck length, yield, gauge, gauge factor, resistance, grid, and bridge. Stiffness and counts are not invented from blanks. The form tells you what is still missing.

### Alloys and gauges

The material list is the alloys load cells are usually cut from:

| Alloy | Young’s modulus | Yield used here |
| --- | --- | --- |
| 6061-T6 | 68.9 GPa | 276 MPa |
| 2024-T3 | 73.1 GPa | 345 MPa |
| 7075-T6 | 71.7 GPa | 503 MPa |
| 17-4 PH H900 | 197 GPa | 1170 MPa |
| Alloy steel | 200 GPa | You type it. The grade is not assumed. |
| Custom material | You type it | You type it |

These are handbook typicals, not a material certificate. If your sheet differs, choose Custom material and type the numbers.

Gauge presets are BA1000-3AA, a generic 350 Ω foil, and a custom gauge. The gauge factor is what the math uses. A package range of about 1.8 to 2.2 around a nominal 2.0 is normal for these foils. Resistance does not change counts per gram. It changes how warm the foil gets at a given excitation.

Bridge:

- Full. Four gauges change with the load.
- Half. Two gauges change. The other two are fixed resistors. The sketch uses half the full-bridge output.
- Quarter. One gauge changes. The sketch uses a quarter of the full-bridge output.

Gauge placement is a label: all on one face, or back to back with one gauge on each face of a neck. The sketch does not apply a second multiplier for that choice. Both arrangements are four active gauges at the same strain magnitude when the bridge is full.

### The bending calculator

Once thickness, neck width, neck length, neck count, and a modulus are all filled in, the calculator reports:

- Young’s modulus in GPa
- Guided-leaf stiffness, in kilograms per millimeter of deflection
- Flexural rigidity of the necks together
- A yield load, when a yield strength is known

The stiffness used here is

`k = E × n × w × t³ / L³`

with `E` in MPa and the neck sizes in millimeters, which comes out in newtons per millimeter. Divide by 9.80665 for kilograms per millimeter. The necks act as guided leaves in parallel. This is a sketch of that kind of flexure. It is not a finite-element result, and it is the wrong model for a column, a shear beam, or a diaphragm.

On the Custom K2 numbers the sketch is about 1439 kg/mm and a yield near 48 kg. The same necks in 17-4 PH H900 are much stiffer and yield much higher, because both the modulus and the yield strength are higher. Treat both figures as a ceiling to stay under, not as a calibration.

### The scale sketch

Counts per gram, if you ask the sketch for them, come from the peak bending stress in those necks:

`stress per gram = 0.00980665 × 3 × L / (n × w × t²)`

Strain is that stress divided by the modulus. The bridge ratio per gram is gauge factor times strain times a bridge factor (1, 1/2, or 1/4) times an optional strain fraction. Counts are that ratio times the gain times 2²³. On the ADS1220 the internal reference is 2.048 V and the sketch assumes 3.3 V excitation, so the ratio is scaled by 3.3 / 2.048. The HX717 is ratiometric to its analog supply, so that voltage ratio is left out.

Share of peak strain defaults to 1, which means the foil is assumed to see the peak. A grid bonded at the root of a guided leaf averages less than the peak, because the moment falls off along the neck. If the grid is no longer than half the neck, Use root-grid average fills that share. If the grid is longer than half the neck, there is no single average, and the sketch keeps the peak until you type a share yourself. The BA1000-3AA grid is 5.3 mm long. On an 8 mm neck that is more than half, so the button cannot invent a fraction.

Use this sketch as the live scale only when the necks, thickness, modulus, gauge factor, and bridge are all filled in. A scale you type, or a line you fit on Accuracy, replaces the sketch. Editing the sketch afterward does not overwrite that measured scale.

Rated capacity is a ceiling you type. The range test mentions it. It does not pass or fail the cell by itself.

### Saving and uploading a cell

Save this cell does two things. It downloads a JSON file named from the cell, and it keeps a copy in this browser under the key `loadcell-bench.cells`. Up to 24 cells are remembered. Saving the same name again replaces that entry. The buttons under the save controls restore a remembered cell. Remove drops one from the browser only. It does not delete the file you already downloaded.

Upload a cell file reads that JSON back. The file has to be one this bench wrote: `kind` is `loadcell-bench-cell` and `version` is `1`. It restores the name, the alloy and neck fields, the gauge, the bridge, any counts per gram and tare, and any gauge marks you placed on a drawing. If both a counts-per-gram and a tare are in the file, the live scale becomes the one you entered. The DXF itself is not inside the file. Upload the drawing again when you want the picture.

### The sketch upload

The first card on Build is the drawing.

Upload DXF reads an ASCII DXF. Units come from the file’s `$INSUNITS` when they are inches, millimeters, centimeters, or meters. A unitless file is read as millimeters. Binary DXF is refused. A `.dwg` file is refused with a note to use Save As DXF. The browser does not contain a DWG reader.

Open the Custom K2 Loadcell sketch loads `NewLoadcell.dxf`, the cut file for the worked example. The plate is 38 × 24 mm. Closed paths inside the outline are the laser cuts.

Three tools use clicks:

- Measure neck width. Two clicks. The distance is written into neck width.
- Measure neck length. Two clicks. The distance is written into neck length.
- Place a gauge. The first click is the center. The second click aims the long axis. The mark is stored with the cell.

The fit line compares the gauge grid with the neck you have typed. A 3.0 mm grid on a 1.6 mm neck warns that the grid is wider than the neck. That warning is a fit check. It is not a stress analysis. Clicking a neck does not compute a modulus.

The photos and the static outline lower on the Build tab are the Custom K2 Loadcell only: gauges bonded with Loctite 401, then covered with Loctite 9460. Let the epoxy finish curing before you trust a zero. The four-conductor cable lands on the amplifier’s E+, E−, S+, and S− pads. This app does not assign wire colors. Do not swap excitation with signal. If the live trace has the wrong sign, invert it. Do not rewire the bridge to flip the sign unless you know which pair is reversed.

### The printer snippet

The bottom of Build shows a Klipper `load_cell` snippet for the board you selected, and a button to download it. The section name is a slug of the cell name. `counts_per_gram` is filled in after a calibration or a typed scale. Until then the line is a comment. The snippet is for the printer, after you disconnect this bench.

## Connect

Connect is for a board that is already running Klipper USB firmware. The flash steps are below. The page opens the port at 250000 baud, which is what Web Serial requires. Klipper on USB does not use that baud rate for timing.

After the port opens, the page reads the Klipper command dictionary, checks that the sensor commands and the pins exist, and sends a one-sensor config.

For an H36 Combo V2 ADS1220 that config is software SPI: chip select PA14, data ready PA1, clock PB7, MOSI PA13, MISO PA15, SPI mode 1, a bit under 256 kHz. An H36 Combo (v1) ADS1220 uses hardware SPI bus spi1a instead: chip select PB6, data ready PC13, clock PB3, MOSI PB5, MISO PB4. Object ids are fixed: the SPI bus is 0 and the ADS1220 is 1.

For an HX717 the config is `config_hx71x` on the pins for that board. Gain is part of that config. Set A-128 or A-64 before you press Connect. Changing it later means disconnect, change the gain, and connect again. Channel B is not the bridge. Only A-128 and A-64 are offered.

If the board was last configured by the printer, the first Connect sees a different config checksum, resets the MCU, and asks you to connect again. The second Connect is the one that stays up. A board that was in shutdown is reset the same way.

The status line after a good connect looks like the MCU name, the firmware version, and the clock. A 12 MHz crystal on the STM32G431 is reported near 170 MHz after the PLL.

Use simulator drops the serial port and starts the built-in source. Disconnect closes whichever one is running.

## Live

Start stream asks the board for samples. Stop ends that request.

On the ADS1220, starting the stream resets the chip, writes gain, sample rate, and voltage reference, then reads the registers back. If the reset does not read as zeros, or the write does not stick, the wiring or the chip select is wrong. The error names the pins. Auto gain walks 1, 2, 4, 8, 16, 32, 64, and 128 and stops before the unloaded offset sits on the rail. Saturation is about 8.2 million counts, near the 24-bit full scale of ±8388607.

On the HX717, Start stream only starts watching the data-out pin. The chip’s rate is the solder jumper, not the menu. The menu is the rate you want the speed sweep to check. Mini HX717 boards leave the factory at 320 Hz.

The large figure is grams when a scale exists, and counts until then. The line under it is the full integer count, plus the rate actually arriving. That rate is sample index over host time, not a clock the app invented. Noise rms is the jitter while the recent window sits still. Overflows count MCU buffer overruns. USB gaps count missing bulk-data blocks. Chip errors are HX717 reads that desynced or ran long.

Tare averages about the last second, and only if the reading is holding still. A reading that is still moving is refused.

Invert multiplies the displayed grams by −1. The raw counts in the log stay as the chip sent them. The fitted scale is expected to come out positive. If a fit is negative, the note tells you to invert and capture again.

## Speed

The sweep asks for each rate in the list for that board and counts what comes back.

ADS1220 rates in the sweep are 90, 175, 330, and 660 Hz. The live menu also offers the rest of the normal set (20, 45, 90, 175, 330, 600, 1000) and the turbo set (40, 180, 350, 660, 1200, 2000). Turbo mode is a register bit. It is not a second chip.

HX717 rates are 10, 20, 80, and 320 Hz. A real chip passes only the jumper that is fitted. The simulator can hit every rate, because it is not a solder joint.

A rate passes when all of these are true:

- Samples actually arrived.
- The measured rate is within 8% of the rate you asked for.
- There were no MCU overflows and no missing USB blocks.
- An HX717 reported no chip errors.
- No more than about 1% of samples are against the rail.
- The counts are not frozen on a single value. One unique count means a wiring or SPI problem, not a quiet cell.

175 Hz is the floor used later for a nozzle probe. 330 Hz is the floor used later for an extrusion force trace. A pass at a slow rate does not make a fast rate pass.

## Accuracy

The fit is a straight line:

`counts = offset + counts per gram × mass`

You need the empty cell and at least one known load. All of the points at the same mass cannot define a line.

Ways to add a point:

- Capture empty, Capture load, Capture unload, and Capture repeat, while the stream is running and the cell is still. The mass for a load is what you type. The counts are the mean of the recent window, about the last 1.2 seconds. The headline number on Live uses a shorter tail, about the last 0.45 seconds, so the two will not match digit for digit while a reading is settling.
- Type a row from a notebook: kind, grams, and counts. A zero row forces the grams to 0.

Fit the line, then apply it if you trust it. Applying it sets the live scale and the tare offset from the fit. A scale you had typed by hand is kept across a reconnect. A sketch scale is not.

The verdict:

- R² at least 0.995.
- The worst point, in grams, no larger than the bigger of 0.5 g and 1% of the heaviest mass in the set.
- Counts per gram positive.

Hysteresis is the worst disagreement, in grams, between a load capture and an unload capture at the same mass. It is called out when it exceeds 2% of the heaviest mass. It does not by itself fail the straight-line check. Glue does this. Loctite 401 under a thick Loctite 9460 coat is a common reason the way down does not match the way up.

Repeat is the scatter of captures at one mass. Creep is a 30 second hold. The simulator models creep as 0.3% of the load signal with an 18 second time constant, plus a short mechanical settle. Creep is not applied to the bridge offset. A real cell’s creep is whatever the metal and the adhesive do. The app measures it. It does not assume your adhesive matches the simulator.

## Range

Range turns noise into a smallest believable change, and walks the load upward until the chip or the metal gives up.

Measure noise while the cell sits empty for about eight seconds. You can also type a noise rms in counts. A measured floor replaces a typed one. Three times the rms, in grams, is the smallest change the report tells you to trust. That needs a counts-per-gram. Without a scale, the noise stays in counts.

Then add weight in steps. Each step records grams, counts, and whether the ADC was on the rail. You can capture a step from the stream or type one. The heaviest step that was still inside the converter is the top of the electrical range at this gain. A saturated step means this gain is out of room. Drop the gain, or stop. Dropping the gain on an ADS1220 needs a new stream. Dropping it on an HX717 needs a new Connect.

Unload and capture the return to zero. If the zero moved by more than the larger of five times the noise or 1 g, the report says the metal or the adhesive took a set. Do not keep adding load after that.

A nozzle-probe candidate wants 3-sigma noise at or under 5 g and a passing speed of at least 175 Hz, and a zero that came back. A force-trace candidate wants 3-sigma noise at or under 1.5 g and at least 330 Hz, and a zero that came back. The force-trace line is only offered when the noise is already in grams. These are bench gates. They are not a probe and they are not a pressure-advance value.

## The results page

Compile results writes one page:

- A lede: cell name, board, gain, the live rate, whether the numbers came from the simulator or from USB, the fastest passing speed, counts per gram, and the smallest change worth trusting when those exist.
- The cell and the board, including anything you left blank, which is printed as not entered or not chosen.
- Speed, accuracy, and range, each in sentences and a small table.
- What this means on a printer.
- A short glossary: count, counts per gram, noise, hysteresis.

Print hides the guide and the buttons. The page is the record. Save it as a PDF from the browser’s print dialog if you want a file. The app does not store the report on a server.

## Flash the H36 Combo V2

The H36 has to be running Klipper, built for USB, before Connect will see a dictionary. This page is the Klipper host for that session. You do not start the printer’s Klipper on the same port.

In `make menuconfig`:

- Enable extra low-level configuration options
- Micro-controller Architecture: STMicroelectronics STM32
- Processor model: STM32G431
- Bootloader offset: No bootloader
- Clock Reference: 12 MHz crystal
- Communication interface: USB (on PA11/PA12)
- USB ids: leave the defaults
- GPIO pins to set at micro-controller startup: `PA2`

`PA2`, not `!PA2`. The bang is the CAN build. CAN will not enumerate for this page. Leave the ADS1220 and software-SPI extras enabled. A normal Klipper build already includes them, and the HX717 commands too.

To put the board in the ROM bootloader, hold BOOT0, press RESET for about a second, release RESET, wait about three seconds, and release BOOT0. `lsusb` should show `0483:df11`. Then, from the Klipper directory:

```bash
make
make flash FLASH_DEVICE=0483:df11
```

That writes the image at the start of flash and leaves DFU. The board should come back as a Klipper serial device. Unplug it from the printer host before you do this. After the bench, disconnect in the page before the printer takes the port again.

Seat the mini board on the 2×6 header before you care about samples.

| Mini ADS1220 signal | H36 pin |
| --- | --- |
| CS | PA14 |
| DRDY | PA1 |
| SCLK | PB7 |
| MOSI | PA13 |
| MISO | PA15 |

PA13 is header MOSI. PB13 is the heater, so clocking PB13 never reaches the ADS1220.

| Mini HX717 signal | H36 Combo V2 pin |
| --- | --- |
| SCLK | PB7 |
| DOUT | PA15 |

The H36 Combo (v1) 2×6 header is a different wiring. Pick **H36 V1** in the menu. The mini ADS1220 uses hardware SPI bus `spi1a`.

| Mini ADS1220 signal | H36 Combo (v1) pin |
| --- | --- |
| CS | PB6 |
| DRDY | PC13 |
| SCLK | PB3 |
| MOSI | PB5 |
| MISO | PB4 |

| Mini HX717 signal | H36 Combo (v1) pin |
| --- | --- |
| SCLK | PB3 |
| DOUT | PB4 |

Flash that board as STM32G0B1, no bootloader, USB on PA11/PA12, startup pin `PA2`. The V2 image is a G431 and will not match this header.

The HX717 is not SPI. Its rate jumper ships at 320 Hz unless you moved it.

## The alpha board

Flash the alpha board as STM32F072, no bootloader, internal clock, USB on PA11/PA12. An optional startup pin PC7 drives the power LED. The HX717 uses SCLK PC1 and DOUT PC2. The Klipper section name in the snippet is `plimsoll`, not `toolhead`.

The published clock is the internal oscillator. It can drop or stretch a bit-bang read. Those show up in the speed test as chip errors, and they fail that rate. That is the board, not a bug in the fit.

## The simulator

Use simulator when you want the screens without a cable. It uses the Custom K2 geometry as the starting scale when those fields are filled in. If you switch to a blank CUSTOM LOADCELL and leave the necks empty, the simulator has no grams until you type a scale or fill in a width and a length.

The simulator adds a small offset, noise, a short mechanical settle, and creep on the load only. The load slider on Live is the force. It can also saturate, overflow, or drop USB blocks if you are checking how the tests fail. A simulator pass is a check that you understand the pages. It is not a measurement of metal.

## After the bench, on the printer

Disconnect this page first. Copy the snippet into the printer config, set the serial path, and restart Klipper. Then:

1. `LOAD_CELL_DIAGNOSTIC`
2. `LOAD_CELL_CALIBRATE`
3. `LOAD_CELL_TEST_TAP` before a real probe
4. Keep the nozzle near 140°C while probing, so ooze is not the contact

Mainline Klipper does not compute pressure advance from a load cell. If the range page calls the cell a force-trace candidate, an extrusion force trace is worth logging. The trace is data. Pressure advance stays a setting you choose.

## When Connect or the stream fails

The board did not send a Klipper dictionary. The port is not Klipper USB firmware. Flash the STM32G431 build above. A board left in DFU (`0483:df11`) will not answer.

This firmware has no `config_ads1220` or no `config_hx71x`. The extras were turned off, or this is the wrong chip. Rebuild without disabling the sensor.

A pin is not available. The firmware’s pin list does not include the header for the menu entry you picked. Combo v1 is a G0B1 build. Combo V2 is a G431 build. The alpha board is an F072 build.

ADS1220 did not reset, or rejected the register write. The message names the pins for the menu entry you picked. On Combo V2 that is CS PA14, SCLK PB7, MOSI PA13, MISO PA15, and DRDY PA1. On Combo v1 that is CS PB6, SCLK PB3, MOSI PB5, MISO PB4, and DRDY PC13. Seat the mini board, and confirm the menu is the board you actually have.

The first Connect resets the board and tells you to connect again. That is the printer’s old config being cleared. Connect a second time.

Web Serial needs Chrome or Edge. The Connect button cannot see USB in other browsers.

Every sample is the same count. The bridge or the SPI wires are not moving the chip. A quiet cell still has more than one count.

The scale came out negative. Turn on Invert and capture again.

Stiffness stays blank. A neck size, the thickness, or the modulus is empty. CUSTOM LOADCELL does that on purpose.

## What is in the repository

| Path | What it is |
| --- | --- |
| `src/app` | The Next.js page |
| `src/components/bench-app.tsx` | Tabs, Build, Live, Speed, Accuracy, Range |
| `src/components/bench-context.tsx` | Connection, captures, saved cells |
| `src/components/how-to.tsx` | The left-hand guide |
| `src/components/sketch-upload.tsx` | DXF view, measure, and gauge marks |
| `src/components/results-page.tsx` | The compiled page |
| `src/lib/model.ts` | Alloys, gauges, stiffness, and the count sketch |
| `src/lib/analyze.ts` | Speed, line fit, and range |
| `src/lib/klipper` | The USB frame codec and the H36 session |
| `src/lib/dxf.ts` | ASCII DXF reader |
| `src/lib/cell-file.ts` | Save and upload format |
| `hardware/NewLoadcell.dxf` | Cut file for the Custom K2 Loadcell |
| `public/cell` | The same DXF plus the two build photos |

`npm test` checks the frame codec, the ADS1220 register image, the HX717 channels, the DXF reader, the cell file, and the speed, accuracy, and range math.
