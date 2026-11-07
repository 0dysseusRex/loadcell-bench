---
owner: engineering
spec_gate: open
state: PLANNING
---

# Engineering review

Read only. No code was changed, and no tests were run. Tracks stay blocked by spec approval.

## What the CAD files show

`F:\Cursor\projects\loadcell-bench\hardware\NewLoadcell.dxf` is the example plate. `src\lib\dxf.test.ts` expects its bounds within 0.2 mm of 38 by 24. That test was not run. A second file, `F:\Cursor\projects\loadcell-bench\hardware\NewLoadcell-before-wire-holes.dxf`, is in the tree. Its geometry was not compared.

`F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_sch` is an eeschema 10.0 sheet titled flex-bridge. The title block says four gauges on one face, with R1 and R4 in tension and R2 and R3 in compression. The gauges are BA1K-3AA symbols. Their instances are marked `on_board no`. The footprint property points at `loadcell:BA1K-3AA`.

`F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pcb` is a pcbnew 10.0 board. The copper layer used by the pads is `F.Cu`. `B.Cu` appears as a layer name and was not found on a pad. The placed footprints are wire pads J1, J2, J3, and J4, and gauge pads G1 through G8. Nets on those pads are E+, E−, S+, and S−. Comment 4 says the outline is the two outer sides and the bottom bar, with no copper across the top. The board thickness field is 0.093 mm. Comment 3 says one copper layer, 0.5 oz, 50 µm core, coverlay open on 8 gauge pads and 4 wiring pads, and a 0.2 mm stiffener on `Eco1.User`.

`F:\Cursor\projects\loadcell-bench\hardware\flex-bridge\flex-bridge.kicad_pro` text variable `BRIDGE` says 1 oz copper. The PCB `BRIDGE` property and `ORDER.txt` say 0.5 oz. That disagreement is unresolved.

`F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\flex-pcb.md` puts gauges B and D on the opposite face of the flex, with 30 AWG leads through a hole in each neck. The KiCad title blocks say four gauges on one face. Those two accounts are both in the repo. This review does not pick one.

## What the software shows

The bench path is implemented under `F:\Cursor\projects\loadcell-bench\src`. Five fronts, the Klipper session, the ADS1220 register image, the HX717 gain map, the wiring interpreter, the speed and accuracy and range gates, the cell file, the DXF reader, and the simulator are present. The launcher is `F:\Cursor\projects\loadcell-bench\launcher\bench_launcher.py`.

Two code paths do not match the wiki sentence next to them:

- `wiki\accuracy.md` says hysteresis above 2% of the heaviest mass is called out and does not by itself fail the straight-line check. `judgeAccuracy` in `src\lib\analyze.ts` pushes that call-out into `notes` and sets `pass` only when `notes` is empty.
- `wiki\range.md` states the 5 g / 175 Hz probe gate and the 1.5 g / 330 Hz force-trace gate. `analyzeRange` lets a null noise figure or a null best rate satisfy the probe comparison, and a null best rate satisfy the force-trace rate comparison. Force-trace still requires noise in grams.

ADS1220 fronts in `src\lib\frontends.ts` set `vref` to `internal`. `wiki\live.md` says the analog supply is the reference that matches the mini board. Both choices are in the menus.

`public\firmware\h36-combo-v2-usb.bin` is untracked and is not referenced from `src` or the wiki. It is not part of the implemented app.

The worktree is dirty only in `package-lock.json` plus that untracked binary. The lockfile diff renames `tmp-scaffold` to `k2-loadcell-bench` and contains no secret.

No engineering approval is given. The next state remains PLANNING.
