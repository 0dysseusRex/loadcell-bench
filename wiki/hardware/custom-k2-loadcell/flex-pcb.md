# Flex PCB

The Custom K2 Loadcell is wired with discrete jumpers today. A flex PCB will sit on the plate, connect the four gauges, and bring E+, E−, S+, and S− out on one tail. That board is still being drawn.

When the flex is finished, this page will carry:

- The KiCad project for the flex.
- A fabrication package you can upload to JLCPCB or another board house: Gerbers, the drill file, the bill of materials, and the placement file.

Those files are not in the repo yet. The [build guide](build.md) is the way to make a cell until they are.

The finished flex still has to be a full bridge: two gauges that rise under load and two that fall, with excitation on one diagonal and signal on the other. The bench will keep testing it as a 4-wire cell.
