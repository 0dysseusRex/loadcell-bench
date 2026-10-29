# Custom K2 Loadcell

This is the hardware sub-project for the worked example in the bench. The tests accept any 4-wire bridge. This plate is the one the Build tab fills in when you press Custom K2 Loadcell.

The plate is laser-cut 6061-T6, 38 × 24 mm, 0.100 in thick, with four necks. Four BA1000-3AA gauges are bonded with Loctite 401 and covered with Loctite 9460.

- [Build the plate](build.md) is how to cut, bond, wire, and coat it.
- [Flex PCB](flex-pcb.md) is the board that will replace the jumper wires. It is not finished. KiCad files and a fabrication package for JLCPCB and other board houses will be added there when it is.

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

Back to the [wiki](../../README.md).
