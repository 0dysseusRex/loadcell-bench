# When Connect or a test fails

The board did not send a Klipper dictionary. The port is not Klipper USB firmware. [Flash the matching chip](flash.md). A board left in DFU (`0483:df11`) will not answer.

This firmware has no `config_ads1220` or no `config_hx71x`. The extras were turned off, or this is the wrong chip. Rebuild and leave the sensor extras on.

A pin is not available, or the firmware has no `spi1a`. The firmware’s pin list does not include the header for the menu entry you picked. Combo v1 is a G0B1 build. Combo V2 is a G431 build. The alpha board is an F072 build.

ADS1220 did not reset, or rejected the register write. The message names the pins for the menu entry you picked. On Combo V2 that is CS PA14, SCLK PB7, MOSI PA13, MISO PA15, and DRDY PA1. On Combo v1 that is CS PB6, SCLK PB3, MOSI PB5, MISO PB4, and DRDY PC13. Seat the mini board, and confirm the menu is the board you actually have. PA13 is header MOSI on V2. PB13 is the heater.

The first Connect resets the board and tells you to connect again. That is the printer’s old config being cleared. Connect a second time.

Web Serial needs Chrome or Edge. The Connect button cannot see USB in other browsers. Use simulator still runs there.

Every sample is the same count. The bridge or the SPI wires are not moving the chip. A quiet cell still has more than one count.

The scale came out negative. Turn on Invert sign and capture again.

The reading is still moving. Wait until it holds, then tare, capture, or record the load. The simulator’s creep makes a fresh load drift for a moment.

Check wiring says every input returned the same counts. On the simulator that is expected, because the simulator has one signal. On a board it means the mux is not changing what the chip reads.

Stiffness stays blank. A neck size, the thickness, or the modulus is empty. CUSTOM LOADCELL does that on purpose.

The ADC is against the rail. Drop the gain, or the load is past the cell. On the ADS1220, Auto gain walks down from a railed gain. Analog supply is the reference that matches the 3.3 V excitation on the mini board.

HX717 chip errors on the alpha board often come from the internal clock stretching a bit-bang read. They fail that speed row.

Back to the [test order](README.md).
