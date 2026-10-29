# Flex PCB

The flex sits on the plate, connects the four gauges as a full bridge, and brings E+, E−, S+, and S− out on one tail. The KiCad project is [`hardware/flex-bridge`](../../../hardware/flex-bridge).

Gauges A and C are on the same face as the flex and bridge straight onto the pads. Gauges B and D are on the other face. Their pads are on two short tongues, and the 30 AWG leads pass through a hole in each neck. The stiffener is pad-sized under every gauge pad, plus one bar under the four wire pads. It does not run down the rails.

How to order it, and what to check in the production file, is [on the loadcell page](README.md#order-the-flex).

The finished flex is still a full bridge: two gauges that rise under load and two that fall, with excitation on one diagonal and signal on the other. The bench keeps testing it as a 4-wire cell. The [build guide](build.md) is the jumper-wire build in the photos.
