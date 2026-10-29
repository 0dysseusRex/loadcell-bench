# Load cell bench wiki

This is the guide. It follows the test from the first click to the printed page. The left-hand list in the app uses the same order.

![The bench on first open. The guide is on the left. Build is the first tab. The amp menu is at the top right.](images/app.png)

The bench answers one question before a load cell goes on a printer: does this cell, with this amplifier, read fast enough, straight enough, and over a useful weight range? A real board speaks Klipper’s USB protocol. The simulator walks the same screens when nothing is plugged in.

Probing the bed and choosing pressure advance happen later, on the printer, and only after this bench has passed. The app does not run those tests.

## Test in this order

1. [Flash the board](flash.md), if you are using hardware. The simulator skips this.
2. [Select the amp and connect](connect.md).
3. [Name the cell and describe the metal](build.md).
4. [Watch the live reading](live.md), and check the wiring on an ADS1220.
5. [See how fast readings arrive](speed.md).
6. [Weigh something you already know](accuracy.md).
7. [Find the lightest change and the heaviest load](range.md).
8. [Compile the results](results.md).

[When Connect or a test fails](troubleshooting.md).

Naming the cell and connecting are setup. Speed, accuracy, and range are the three results. Compile results stays off until those three exist.

## The hardware sub-project

The Custom K2 Loadcell is one worked example, not the only cell the tests accept. Its plate, gauges, and adhesive have their own pages:

- [Custom K2 Loadcell](hardware/custom-k2-loadcell/README.md)
- [Build the plate](hardware/custom-k2-loadcell/build.md)
- [Flex PCB](hardware/custom-k2-loadcell/flex-pcb.md)

## How the screen is arranged

A guide sits on the left on a wide window, and above the tabs on a narrow one. It has six steps. The first unfinished step opens on its own. Click any step to jump to that tab. Hide and Show collapse the guide on a small screen.

The tabs are Build, Live, Speed, Accuracy, and Range. Compile results opens one plain-language page. Print that page from the browser if you want a copy. Back returns to the bench. Nothing is uploaded.

You can stop after any step. The numbers you already captured stay until you disconnect or change the board.

Chrome or Edge can open the board with Web Serial. Firefox and Safari can still run the simulator. The printer’s Klipper and this page cannot share the USB port. Disconnect here before the printer takes the cable.

Open the app with `npm install` and `npm run dev`, then go to http://127.0.0.1:4471. On Windows, `launcher/LoadCellBench.exe` installs the app, starts that server, and opens the page. Close stops the server.
