---
owner: hardware
spec_gate: open
state: PLANNING
---

# Hardware review

Read only. No board was edited, ordered, or flashed. Tracks stay blocked by spec approval.

## Plate

`F:\Cursor\projects\loadcell-bench\hardware\NewLoadcell.dxf` is the Custom K2 cut file. The hardware page and `CELL` in `src\lib\model.ts` describe it as 38 × 24 mm, 0.100 in 6061-T6, four necks starting at 1.6 mm by 8 mm. `src\lib\dxf.test.ts` expects those outline bounds and was not run. The same drawing is also at `F:\Cursor\projects\loadcell-bench\public\cell\NewLoadcell.dxf`. Photos of the jumper-wire build are `public\cell\gauges.jpg` and `public\cell\coated.jpg`.

`F:\Cursor\projects\loadcell-bench\hardware\NewLoadcell-before-wire-holes.dxf` is present. This review did not diff it against the current cut file.

The build page says closed paths inside the outline are the laser cuts: windows, slot, and mounting holes. It says to deburr the necks, bond four BA1000-3AA gauges with Loctite 401, and coat them with Loctite 9460. Those are instructions, not a toolpath in the repo.

The published bending sketch on the starting necks is about 1439 kg/mm with a yield near 48 kg. The page calls both a ceiling. The formula behind that sketch is in `bendingStiffness`. It is not a measured stiffness.

## Flex PCB

The KiCad project is `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge`.

The schematic, eeschema 10.0, shows four BA1K-3AA gauges, R1 through R4, labeled as a full bridge: tension on R1 and R4, compression on R2 and R3, nets E+, E−, S+, and S−. The gauge symbols are `on_board no`. The title block says four gauges on one face, 1-layer polyimide, 0.5 oz copper.

The PCB, pcbnew 10.0, places J1–J4 wire pads and G1–G8 gauge pads on `F.Cu`, with nets E+, E−, S+, and S−. `B.Cu` is declared and is not used by those pads. Comment 3 matches the 0.5 oz, 50 µm, 12-pad coverlay, and `Eco1.User` stiffener story. Comment 4 says the outline is the two outer sides and the bottom bar, with no copper across the top. The thickness field is 0.093 mm. This review did not count the `Eco1.User` polygons. `ORDER.txt` says there are nine stiffener regions.

`F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb` holds `flex-bridge.GTL`, `flex-bridge.GTS`, `flex-bridge.GTO`, `flex-bridge.GKO`, `flex-bridge-pib_0.2.gbr`, `ORDER.txt`, and `flex-bridge-jlcpcb.zip`. `ORDER.txt` says there is no drill file, assembly is off, and the load-cell drawing must not be uploaded. It also says the E+ S− S+ E− legend is 0.7 mm tall with a 0.12 mm stroke, under that vendor’s 0.8 mm / 0.15 mm minimum, and may be thickened or dropped.

`flex-bridge.kicad_pro` text variable `BRIDGE` says 1 oz copper. The PCB title block, the PCB `BRIDGE` property, and `ORDER.txt` say 0.5 oz. The order stack that the files agree on is the 0.5 oz stack. The 1 oz line is the outlier.

`wiki\hardware\custom-k2-loadcell\flex-pcb.md` says gauges A and C are on the flex face and gauges B and D are on the other face, with 30 AWG leads through a hole in each neck. The KiCad title blocks say four gauges on one face. The flex order notes say the flex itself has no holes. The neck holes, if they exist, are in the plate, and this review did not confirm them in the DXF.

The gauge footprint library file is `F:\Cursor\projects\loadcell-bench\hardware\loadcell.pretty\BA1K-3AA.kicad_mod`. The PCB footprints actually placed are `flex-bridge:WirePad` and the gauge pad footprints referenced as G1–G8.

## Amplifier boards

This repo does not contain a KiCad project for the H36 Combo, the Plimsoll mini ADS1220, the mini HX717, or the alpha board. Those pin maps live in the wiki and in `src\lib\model.ts` and `src\lib\frontends.ts`. The untracked file `public\firmware\h36-combo-v2-usb.bin` is not a schematic and is not referenced by the wiki.

Approval: PENDING

Fab recommendation: The flex files support the stack in `F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\fab\jlcpcb\ORDER.txt`: JLCPCB flexible PCB, 1 layer, 50 µm polyimide, 0.5 oz copper, yellow coverlay open on the 12 pads, ENIG, bottom 0.2 mm polyimide stiffener from `flex-bridge-pib_0.2.gbr`, assembly off, no drill file. Do not apply the 1 oz copper text in `flex-bridge.kicad_pro`. Confirm the production file before they cut, including the legend `ORDER.txt` says is under the vendor minimum. No fab recommendation is supported for the aluminum plate beyond the DXF already in the repo, and none is supported for the H36 or Plimsoll boards, which are not drawn here.
