# Flash the board

Connect only works after the board is running Klipper built for USB. This page is the Klipper host for that session. Leave the printer’s Klipper off the same port.

Pick the menu entry that matches the board. A V2 image on a v1 board, or the other way around, will not line up with the header.

| Menu entry | Chip | Clock | USB | Startup pin |
| --- | --- | --- | --- | --- |
| H36 V2 + mini ADS1220, or H36 V2 + mini HX717 | STM32G431 | 12 MHz crystal | PA11/PA12 | `PA2` |
| H36 V1 + mini ADS1220, or H36 V1 + mini HX717 | STM32G0B1 | 12 MHz crystal | PA11/PA12 | `PA2` |
| Alpha USB + HX717 | STM32F072 | Internal | PA11/PA12 | `PC7` optional, for the power LED |

`PA2`, not `!PA2`. The bang is the CAN build. CAN will not enumerate for this page. Bootloader offset is no bootloader. Leave the USB ids at the defaults.

Leave the ADS1220 and software-SPI extras enabled on an H36. A normal Klipper build already includes them, and the HX717 commands too. The alpha board uses the HX717 commands. Its published clock is the internal oscillator, which can drop a bit-bang read. Those show up later as chip errors.

## Put an H36 in the ROM bootloader

Hold BOOT0, press RESET for about a second, release RESET, wait about three seconds, and release BOOT0. `lsusb` should show `0483:df11`. Then, from the Klipper directory:

```bash
make
make flash FLASH_DEVICE=0483:df11
```

That writes the image at the start of flash and leaves DFU. The board should come back as a Klipper serial device. Unplug it from the printer host before you do this.

Seat the mini board on the 2×6 header before you care about samples. The v1 header and the V2 header are both 2×6 and they are not the same nets.

## H36 Combo V2 header

Mini ADS1220, software SPI:

| Signal | Pin |
| --- | --- |
| CS | PA14 |
| DRDY | PA1 |
| SCLK | PB7 |
| MOSI | PA13 |
| MISO | PA15 |

PA13 is the MOSI pin on that header. PB13 is the heater.

Mini HX717 on the same header: SCLK is PB7 and DOUT is PA15. The rate is a solder jumper, 320 Hz unless you moved it.

## H36 Combo (v1) header

Mini ADS1220, hardware SPI bus `spi1a`:

| Signal | Pin |
| --- | --- |
| CS | PB6 |
| DRDY | PC13 |
| SCLK | PB3 |
| MOSI | PB5 |
| MISO | PB4 |

Mini HX717: SCLK is PB3 and DOUT is PB4. PC13 is also the status LED on this board.

## Alpha board

The alpha board is its own USB-C port. It does not sit on an H36 header. The HX717 is already on the board that matches the published sample config: SCLK PC1, DOUT PC2. The Klipper section name in the snippet is `plimsoll`.

Next: [select that board in the app and connect](connect.md).
