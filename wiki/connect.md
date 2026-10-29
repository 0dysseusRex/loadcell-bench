# Select the amp, then connect

The amp menu is the top right of every tab. Pick the board on the cable, then press Connect. The browser asks which serial port. Choose the Klipper device.

| Menu entry | What is on the cable |
| --- | --- |
| H36 V2 + mini ADS1220 | FYSETC H36 Combo V2 with a Plimsoll mini ADS1220 on the 2×6 header |
| H36 V1 + mini ADS1220 | FYSETC H36 Combo (v1) with that same mini board. The header pins are not the V2 pins. |
| H36 V2 + mini HX717 | H36 Combo V2 with a Plimsoll mini HX717 |
| H36 V1 + mini HX717 | H36 Combo (v1) with the mini HX717 |
| Alpha USB + HX717 | A Plimsoll alpha board, its own USB port, its own HX717 |

The menu is locked while a source is connected. Disconnect before you change boards.

Use simulator drops the serial port and starts the built-in source. Disconnect closes whichever one is running. The status badge then reads No source, Simulator, or the short board name, and Streaming while samples are moving.

The page opens the port at 250000 baud, which is what Web Serial asks for. Klipper on USB does not use that baud for timing.

After the port opens, the page reads the Klipper command dictionary, checks that the sensor commands and the pins exist, and sends a one-sensor config.

An H36 Combo V2 ADS1220 uses software SPI: chip select PA14, data ready PA1, clock PB7, MOSI PA13, MISO PA15, SPI mode 1, 256 kHz. An H36 Combo (v1) ADS1220 uses hardware SPI bus `spi1a`: chip select PB6, data ready PC13, clock PB3, MOSI PB5, MISO PB4. The SPI bus object is 0 and the ADS1220 object is 1.

An HX717 uses `config_hx71x` on the pins for that board. Gain is part of that config. Set A-128 or A-64 before you press Connect. Changing it later means disconnect, change the gain, and connect again. Channel B is not the bridge. Only A-128 and A-64 are offered.

If the board was last configured by the printer, the first Connect sees a different config checksum, resets the MCU, and asks you to connect again. The second Connect is the one that stays up. A board that was in shutdown is reset the same way.

A good connect names the MCU, the firmware version, and the clock on the status line. A 12 MHz crystal on the STM32G431 is reported near 170 MHz after the PLL.

The four-channel ADS131M04 under-bed board is not part of this bench.

The simulator uses the Custom K2 geometry as the starting scale when those fields are filled in. A blank CUSTOM LOADCELL with empty necks has no grams until you type a scale or fill in a width and a length. The simulator adds a small offset, noise, a short mechanical settle, and creep on the load only. It can also saturate, overflow, or drop USB blocks if you are checking how the tests fail. A simulator pass means the pages are doing what you asked. It is not a measurement of metal.

Next: [name the cell](build.md).
