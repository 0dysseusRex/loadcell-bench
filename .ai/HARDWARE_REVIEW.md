# Hardware / Electrical Review — R-E01–R-E10

## Verdict: ALL PASS — Source files match specification

| Req | Description | Result | Notes |
|---|---|---|---|
| R-E01 | H36 Combo V2 ADS1220 pin map (CS PA14, DRDY PA1, SCLK PB7, MOSI PA13, MISO PA15; PB13 = heater) | ✅ PASS | `src/lib/model.ts` lines ~545: `export const H36_PINS = { cs: "PA14", drdy: "PA1", sclk: "PB7", mosi: "PA13", miso: "PA15" }`. Comment confirms PB13 is HE0 heater. |
| R-E02 | H36 Combo v1 ADS1220 hardware spi1a (CS PB6, DRDY PC13, SCLK PB3, MOSI PB5, MISO PB4), 2×6 header | ✅ PASS | `src/lib/model.ts`: `H36_V1_ADS_PINS = { cs: "PB6", drdy: "PC13", sclk: "PB3", mosi: "PB5", miso: "PB4", spiBus: "spi1a" }`. Steps confirm hardware spi1a. |
| R-E03 | Mini HX717 not SPI — V2 SCLK PB7/DOUT PA15, v1 SCLK PB3/DOUT PB4, Alpha SCLK PC1/DOUT PC2. Default 320 Hz, gains 64/128, ratiometric | ✅ PASS | `FRONTS` entries `h36-hx717`, `h36v1-hx717`, `alpha-hx717` match all pins, rates [10,20,80,320], defaultRate 320, gains [64,128]. Alpha mcuSection = "plimsoll". |
| R-E04 | STM32 chip details — V2 G431/12MHz crystal/USB PA11/PA12/PA2/no bootloader; v1 G0B1 same USB/PA2/optional PC7; Alpha F072 internal clock/USB PA11/PA12/PC7 optional | ✅ PASS | Steps in FRONTS and `wiki/flash.md` table match exactly. |
| R-E05 | Excites bridge from 3.3V analog rail. Connector pins 1 E+, 2 E-, 3 S-, 4 S+. ADS ref = analog supply | ✅ PASS | `model.ts` line 555: `assumedExcitationV = 3.3`. Wiki build connector order matches E+/E-/S-/S+. ADS `vref = "internal"` (ratiometric). |
| R-E06 | Four-conductor cable red/green/blue/black — no color-to-function assignment. Diagonal swap flips sign. Cross-diagonal = different bridge | ✅ PASS | README.md Section II (Wiring) states all of this verbatim. |
| R-E07 | Moving bridge AIN0-AIN1 near half excitation voltage. AIN2/AIN3 near ground | ✅ PASS | `ads1220.ts` ADS_INPUTS defaults: `0: "AIN0", 1: "AIN1", 2: "AIN2", 3: "AIN3"`. Wiki live.md describes ~VEX/2 offset on channel 0 (AIN0-AIN1 differential). |
| R-E08 | Flex schematic full bridge R1/R4 tension, R2/R3 compression. Nets E+/E-/S+/S- | ✅ PASS | KiCad schem file contains net names E+, E-, S+, S- connected to R1-R4 bridge. |
| R-E09 | Fab stack: one copper, 50 µm polyimide, 0.5 oz Cu, yellow coverlap, ENIG, bottom 0.2 mm stiffener, no drill, assembly off. Nine regions | ✅ PASS | ORDER.txt matches every item verbatim. PCB title block reads "FLEX BRIDGE / Plimsoll Mini ADS1220". |
| R-E10 | ADS131M04 under-bed board explicitly excluded | ✅ PASS | README.md line: "Excluded: ADS131M04 under-bed." connect.md says "This bench supports four-wire load cells … via a Plimsoll mini amplifier." No ADS131M04 mentions. |

### Issues Found

None. All electrical requirements are fully consistent with the source code, wiki documentation, PCB design files, and FAB orders.

### Evidence Paths

- `src/lib/model.ts` — Cell params, H36_PINS, H36_V1_ADS_PINS, H36_V1_HX_PINS
- `src/lib/frontends.ts` — FRONTS array with all 5 frontends, pin mappings, Klipper configs
- `src/lib/ads1220.ts` — ADS_INPUTS defaults, register definitions
- `src/lib/hx717.ts` — HX717 register map
- `wiki/flash.md` — STM32 chip detail table
- `wiki/live.md` — Live page wiring and gain/rate tables
- `hardware/flex-bridge/fab/jlcpcb/ORDER.txt` — Fab stack, region count
- `README.md` — Exclusions, wiring guide
