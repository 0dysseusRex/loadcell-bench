---
owner: orchestrator
spec_gate: open
state: PLANNING
---

# Decisions

No ADR files are in the repo. Decisions below are taken from existing files. Inferred decisions include the line `source: inferred`.

## Recorded in the repo

- D-01. Split the licences. The bench application, the launcher, and the user guide are MIT. The Custom K2 Loadcell design, the cut file, and the hardware wiki pages are CERN-OHL-P v2. Evidence: `F:\Cursor\projects\loadcell-bench\README.md`.
- D-02. Limit this bench to the Plimsoll mini ADS1220, the mini HX717, and the alpha-board HX717. Leave the ADS131M04 under-bed board out. Evidence: `F:\Cursor\projects\loadcell-bench\README.md`. Requirement: R-E10.
- D-03. Keep separate pin maps for H36 Combo V2 and H36 Combo (v1). The headers are both 2×6 and they are not the same nets. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\flash.md`. Requirements: R-E01, R-E02, R-E03.
- D-04. Use AIN0 minus AIN1 as the moving bridge pair on this board. AIN2 and AIN3 sit near ground. Evidence: `F:\Cursor\projects\loadcell-bench\src\lib\ads1220.ts`. Requirement: R-E07.
- D-05. Use a guided-leaf bending sketch, `k = E × n × w × t³ / L³`, and do not apply it to a column, a shear beam, or a diaphragm. Evidence: `F:\Cursor\projects\loadcell-bench\src\lib\model.ts`. Requirement: R-S24.
- D-06. Keep the photographed jumper-wire build as the current build, and treat the flex PCB as the replacement for those jumpers. The bench still tests the flex as a 4-wire cell. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\hardware\custom-k2-loadcell\flex-pcb.md`.
- D-07. Treat published pass limits as a starting point. A simulator pass is not a measurement of the metal. Evidence: `F:\Cursor\projects\loadcell-bench\README.md`. Requirement: R-S26.

## Inferred

- D-08. Run the pre-printer check in the browser over Web Serial, speaking Klipper’s USB protocol, instead of using the printer host for that session. The README states the result. No ADR records the choice. source: inferred. Evidence: `F:\Cursor\projects\loadcell-bench\README.md`. Requirements: R-S01, R-S03, R-S05.
- D-09. Ship a built-in simulator as a source the operator can select with no board attached. The connect page describes that behavior. No ADR records the choice. source: inferred. Evidence: `F:\Cursor\projects\loadcell-bench\wiki\connect.md`. Requirement: R-S26.

None of these decisions approve fabrication, close `spec_gate`, or move the state out of PLANNING.
