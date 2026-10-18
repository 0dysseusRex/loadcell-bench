import { H36_PINS } from "./model";
import { hx717GainName } from "./hx717";

export type SensorKind = "ads1220" | "hx717";
export type FrontId = "h36-ads1220" | "h36-hx717" | "alpha-hx717";

export type FrontEnd = {
  id: FrontId;
  label: string;
  short: string;
  sensor: SensorKind;
  /** Shown on the live badge and in USB errors. */
  board: string;
  gains: number[];
  defaultGain: number;
  rates: number[];
  defaultRate: number;
  speedRates: number[];
  vref: "internal" | "analog_supply";
  dout: string;
  sclk: string;
  cs?: string;
  drdy?: string;
  mosi?: string;
  miso?: string;
  mcuSection: string;
  speedNote: string;
  speedEmpty: string;
  settingsNote: string;
  steps: string[];
};

export const FRONTS: FrontEnd[] = [
  {
    id: "h36-ads1220",
    label: "H36 + mini ADS1220",
    short: "H36 ADS1220",
    sensor: "ads1220",
    board: "H36",
    gains: [1, 2, 4, 8, 16, 32, 64, 128],
    defaultGain: 64,
    rates: [20, 45, 90, 175, 330, 600, 1000, 40, 180, 350, 660, 1200, 2000],
    defaultRate: 330,
    speedRates: [90, 175, 330, 660],
    vref: "internal",
    cs: H36_PINS.cs,
    drdy: H36_PINS.drdy,
    sclk: H36_PINS.sclk,
    mosi: H36_PINS.mosi,
    miso: H36_PINS.miso,
    dout: H36_PINS.miso,
    mcuSection: "toolhead",
    speedNote:
      "Klipper watches DRDY and ships samples in bulk. This sweep asks the ADS1220 for each rate and counts what actually arrives.",
    speedEmpty: "No sweep yet. 175 Hz is the floor for probing. 330 Hz and up is the interesting region for a force trace.",
    settingsNote: "Restart the stream after changing these. Auto gain walks 1 to 128 and stops before the offset hits the rail.",
    steps: [
      "Flash the H36 USB build: STM32G431, no bootloader, 12 MHz crystal, USB on PA11/PA12, startup pin PA2.",
      "Seat the Plimsoll mini ADS1220 on the 2×6 header. Software SPI uses PA14 CS, PA1 DRDY, PB7 SCLK, PB13 MOSI, PA15 MISO.",
      "Copy the config below into the printer. Run LOAD_CELL_DIAGNOSTIC, then LOAD_CELL_CALIBRATE.",
      "Prove taps with LOAD_CELL_TEST_TAP before a real probe. Keep the nozzle near 140°C so ooze is not the contact.",
      "Pressure advance is a later experiment. If the range test says the cell is a force-trace candidate, log nozzle force during an extrusion move. Mainline Klipper does not compute pressure advance from a load cell by itself.",
    ],
  },
  {
    id: "h36-hx717",
    label: "H36 + mini HX717",
    short: "H36 HX717",
    sensor: "hx717",
    board: "H36",
    gains: [64, 128],
    defaultGain: 128,
    rates: [10, 20, 80, 320],
    defaultRate: 320,
    speedRates: [10, 20, 80, 320],
    vref: "analog_supply",
    sclk: "PB7",
    dout: "PA15",
    mcuSection: "toolhead",
    speedNote:
      "The HX717 rate is a solder jumper, not a register. This sweep times DOUT at 10, 20, 80, and 320 Hz. The rate that passes is the jumper on the board. Mini HX717 boards are built for 320 Hz. The simulator can hit every rate; a real chip passes only one.",
    speedEmpty: "No sweep yet. These boards leave the factory at 320 Hz. 80 Hz and below is a slow probe.",
    settingsNote:
      "Gain is A-128 or A-64, and it is locked in when you connect. To change it, disconnect and connect again. The sample-rate menu is the jumper you want the sweep to check, not a register write.",
    steps: [
      "Flash the H36 USB build: STM32G431, no bootloader, 12 MHz crystal, USB on PA11/PA12, startup pin PA2. HX717 support is included in a normal Klipper build.",
      "Seat the Plimsoll mini HX717 on the 2×6 header. SCLK is PB7 and DOUT is PA15.",
      "Leave the rate jumper at 320 Hz unless you moved it. The speed sweep is how you confirm which jumper is closed.",
      "Copy the config below into the printer. Run LOAD_CELL_DIAGNOSTIC, then LOAD_CELL_CALIBRATE.",
      "Prove taps with LOAD_CELL_TEST_TAP before a real probe. Keep the nozzle near 140°C so ooze is not the contact. Pressure advance is still a later experiment; mainline Klipper does not compute it from a load cell.",
    ],
  },
  {
    id: "alpha-hx717",
    label: "Alpha USB + HX717",
    short: "Alpha HX717",
    sensor: "hx717",
    board: "alpha board",
    gains: [64, 128],
    defaultGain: 128,
    rates: [10, 20, 80, 320],
    defaultRate: 320,
    speedRates: [10, 20, 80, 320],
    vref: "analog_supply",
    sclk: "PC1",
    dout: "PC2",
    mcuSection: "plimsoll",
    speedNote:
      "The alpha board is an STM32F072 with its own USB port and an HX717. The rate is a solder jumper. This sweep times DOUT at 10, 20, 80, and 320 Hz, and the one that passes is the jumper. The published build uses the internal clock, which can drop a sample; those show up here as chip errors.",
    speedEmpty: "No sweep yet. The alpha board's HX717 is jumpered for 320 Hz unless you changed it.",
    settingsNote:
      "Gain is A-128 or A-64, chosen at connect. The HX717 is ratiometric, so there is no reference menu. The rate menu is the solder jumper, not a register.",
    steps: [
      "Flash the alpha board: STM32F072, no bootloader, internal clock, USB on PA11/PA12. Optional startup pin PC7 if you want the power LED. HX717 support is on by default.",
      "The HX717 is already on the board. SCLK is PC1 and DOUT is PC2. The rate jumper ships at 320 Hz.",
      "The internal clock is what the Plimsoll sample config uses. If the speed test reports chip errors or timeouts, that is the crystal-less clock the board's notes warn about.",
      "Copy the config below into the printer. The MCU section is named plimsoll. Run LOAD_CELL_DIAGNOSTIC, then LOAD_CELL_CALIBRATE.",
      "Prove taps with LOAD_CELL_TEST_TAP before a real probe. Keep the nozzle near 140°C so ooze is not the contact. Pressure advance is still a later experiment; mainline Klipper does not compute it from a load cell.",
    ],
  },
];

export function frontById(id: string): FrontEnd {
  const found = FRONTS.find((front) => front.id === id);
  if (!found) throw new Error(`Unknown front end ${id}`);
  return found;
}

export function printerSnippet(input: {
  front: FrontEnd;
  cellName?: string;
  gain: number;
  sampleRate: number;
  vref: "internal" | "analog_supply";
  countsPerGram: number | null;
  tareCounts: number | null;
}): string {
  const { front } = input;
  const cellName = (input.cellName ?? "").trim() || "loadcell";
  const section = cellName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "loadcell";
  const cpg =
    input.countsPerGram === null
      ? "# counts_per_gram: fill in after the accuracy test"
      : `counts_per_gram: ${input.countsPerGram.toFixed(4)}`;
  const tare =
    input.tareCounts === null
      ? "# reference_tare_counts: fill in after a tare on the printer"
      : `reference_tare_counts: ${Math.round(input.tareCounts)}`;
  const mcu = front.mcuSection;
  if (front.sensor === "ads1220") {
    return `# ${cellName} on an FYSETC H36 Combo V2 with a Plimsoll mini ADS1220.
# Bench gain ${input.gain}, ${input.sampleRate} Hz, ${input.vref} reference.
# Flash the toolboard USB build (STM32G431, 12 MHz, PA11/PA12, startup pin PA2)
# before pointing Klipper at it. This host and Klipper cannot share the port.

[mcu ${mcu}]
# serial: /dev/serial/by-id/usb-Klipper_stm32g431xx_XXXXXXXX-if00

[load_cell ${section}]
sensor_type: ads1220
cs_pin: ${mcu}:PA14
data_ready_pin: ${mcu}:PA1
spi_software_sclk_pin: ${mcu}:PB7
spi_software_mosi_pin: ${mcu}:PB13
spi_software_miso_pin: ${mcu}:PA15
spi_speed: 256000
gain: ${input.gain}
sample_rate: ${input.sampleRate}
vref: ${input.vref}
${cpg}
${tare}

# When the bench numbers look right, the same sensor can become a
# [load_cell_probe] on the printer. Keep the nozzle under ~140°C while
# probing so filament ooze does not become the contact.
`;
  }
  const gainName = hx717GainName(input.gain);
  const serialHint =
    front.id === "alpha-hx717"
      ? "# serial: /dev/serial/by-id/usb-Klipper_stm32f072xb_XXXXXXXX-if00\nrestart_method: command"
      : "# serial: /dev/serial/by-id/usb-Klipper_stm32g431xx_XXXXXXXX-if00";
  return `# ${cellName} on a Plimsoll ${front.label}.
# Bench gain ${gainName}, expected ${input.sampleRate} Hz. The HX717 rate is the solder jumper.
# This host and Klipper cannot share the USB port.

[mcu ${mcu}]
${serialHint}

[load_cell ${section}]
sensor_type: hx717
sclk_pin: ${mcu}:${front.sclk}
dout_pin: ${mcu}:${front.dout}
gain: ${gainName}
sample_rate: ${input.sampleRate}
${cpg}
${tare}

# When the bench numbers look right, the same sensor can become a
# [load_cell_probe] on the printer. Keep the nozzle under ~140°C while
# probing so filament ooze does not become the contact.
`;
}
