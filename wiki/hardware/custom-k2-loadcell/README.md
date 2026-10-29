# Custom K2 Loadcell

Copyright 2026 0dysseusRex. This plate, its cut file, and these hardware pages are open hardware under the CERN Open Hardware Licence Version 2 - Permissive. You may redistribute and modify this source and make products using it under the terms of [CERN-OHL-P v2](../../../hardware/LICENSE-CERN-OHL-P-2.0.txt). This source is distributed without any express or implied warranty, including of merchantability, satisfactory quality, and fitness for a particular purpose. The licence text has the conditions.

This is the hardware sub-project for the worked example in the bench. The tests accept any 4-wire bridge. This plate is the one the Build tab fills in when you press Custom K2 Loadcell.

The plate is laser-cut 6061-T6, 38 × 24 mm, 0.100 in thick, with four necks. Four BA1000-3AA gauges are bonded with Loctite 401 and covered with Loctite 9460.

- [Build the plate](build.md) is how to cut, bond, wire, and coat it.
- [Flex PCB](flex-pcb.md) replaces the jumper wires. The KiCad project and the JLCPCB upload are in the repo. [Order the flex](#order-the-flex) is the stack that was checked out.

The cut file in the repo is [`hardware/NewLoadcell.dxf`](../../../hardware/NewLoadcell.dxf). The same file is served by the app at `public/cell/NewLoadcell.dxf`. The photos on the Build tab are `public/cell/gauges.jpg` and `public/cell/coated.jpg`.

In the bench, this cell starts as:

| Field | Value |
| --- | --- |
| Alloy | 6061-T6, 68.9 GPa, yield 276 MPa |
| Thickness | 2.54 mm |
| Necks | 4, each 1.6 mm wide and 8 mm long |
| Gauges | 4 × BA1000-3AA, 1000 Ω, gauge factor 2.0, grid 3.0 × 5.3 mm |
| Bridge | Full |
| Placement | On one face of the plate |

The neck sizes are starting measures from the cut file. Measure the metal you cut and type those numbers. The bending sketch on those starting numbers is about 1439 kg/mm, with a yield near 48 kg. Both figures are a ceiling, not a calibration.

## Order the flex

The board is [`hardware/flex-bridge`](../../../hardware/flex-bridge). Upload [`flex-bridge-jlcpcb.zip`](../../../hardware/flex-bridge/fab/jlcpcb/flex-bridge-jlcpcb.zip) to JLCPCB as a flexible PCB. The zip is the Gerbers, the stiffener layer, and the order notes. There is no drill file. The flex has no holes. Leave assembly off. The gauges and the 30 AWG leads are attached by hand.

The checkout on 29 October 2026 used this stack:

- 1 copper layer
- 50 µm polyimide core
- 0.5 oz (18 µm) copper
- Yellow coverlay, open on the 12 pads
- ENIG
- Bottom polyimide stiffener, 0.2 mm, drawn in `flex-bridge-pib_0.2.gbr`

That stiffener is nine regions: the bar under the four wire pads, and one pad-sized rectangle on each gauge pad. JLCPCB can add an extra fee when a prototype has more than four stiffener regions. That fee is not in the first calculator total.

Ten boards, with shipping, duties, and a coupon, came to $76.01.

When the production file arrives, check it before they cut. The nine stiffener rectangles are on the bottom. The copper is 0.5 oz. The coverlay is open only on the 12 pads.

The loose Gerbers sit next to the zip. `flex-bridge.GTL` is the copper, `flex-bridge.GTS` is the coverlay openings, `flex-bridge.GTO` is the legend, `flex-bridge.GKO` is the flex outline, and `flex-bridge-pib_0.2.gbr` is the stiffener. Do not send the load-cell drawing. It is a reference on the KiCad drawing layer, and it is not in the zip.

Back to the [wiki](../../README.md).
