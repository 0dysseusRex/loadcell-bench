/** ADS1220 inputs for the wiring check. Sign-flipped copies of a pair are left out. */

export type WiringProbe = {
  id: string;
  mux: number;
  label: string;
  kind: "pin" | "pair";
  /** For a pin, one index. For a pair, [positive input, negative input]. */
  pins: number[];
};

export const WIRING_PROBES: readonly WiringProbe[] = [
  { id: "AIN0", mux: 0b1000, label: "AIN0 to ground", kind: "pin", pins: [0] },
  { id: "AIN1", mux: 0b1001, label: "AIN1 to ground", kind: "pin", pins: [1] },
  { id: "AIN2", mux: 0b1010, label: "AIN2 to ground", kind: "pin", pins: [2] },
  { id: "AIN3", mux: 0b1011, label: "AIN3 to ground", kind: "pin", pins: [3] },
  { id: "AIN0_AIN1", mux: 0b0000, label: "AIN0 minus AIN1", kind: "pair", pins: [0, 1] },
  { id: "AIN0_AIN2", mux: 0b0001, label: "AIN0 minus AIN2", kind: "pair", pins: [0, 2] },
  { id: "AIN0_AIN3", mux: 0b0010, label: "AIN0 minus AIN3", kind: "pair", pins: [0, 3] },
  { id: "AIN1_AIN2", mux: 0b0011, label: "AIN1 minus AIN2", kind: "pair", pins: [1, 2] },
  { id: "AIN1_AIN3", mux: 0b0100, label: "AIN1 minus AIN3", kind: "pair", pins: [1, 3] },
  { id: "AIN2_AIN3", mux: 0b0101, label: "AIN2 minus AIN3", kind: "pair", pins: [2, 3] },
];

export function wiringLabel(mux: number): string {
  return WIRING_PROBES.find((probe) => probe.mux === mux)?.label ?? `mux ${mux}`;
}

export type WiringReading = WiringProbe & {
  rest: number;
  load: number;
};

export type WiringVerdict =
  | "working"
  | "common-mode"
  | "partial"
  | "one-pin"
  | "no-excitation"
  | "no-motion"
  | "same-reading"
  | "unbalanced";

export type WiringReport = {
  verdict: WiringVerdict;
  /** True only when the two sense wires move in opposite directions and their difference is centered. */
  ok: boolean;
  title: string;
  detail: string[];
  /** Pair to leave on the live trace. Null keeps the current pair. */
  pairMux: number | null;
  rows: { label: string; rest: number; load: number; change: number }[];
};

/** Half of the 24-bit full scale. At gain 1 with a 3.3 V reference this is 1.65 V. */
const HALF = 8388608 / 2;
const HALF_WINDOW = 800_000;
/** About 40 mV at gain 1 on a 3.3 V reference. The grounded pins on this board were under 2 mV. */
const GROUND_MAX = 100_000;
/** About 0.3 mV. Mean noise at gain 1 is far below this. */
const MOVE = 800;
const CENTER_MAX = 250_000;
const SAME_SPAN = 20_000;

function isHalf(counts: number): boolean {
  return Math.abs(Math.abs(counts) - HALF) <= HALF_WINDOW;
}

function isGround(counts: number): boolean {
  return Math.abs(counts) <= GROUND_MAX;
}

function isCentered(counts: number): boolean {
  return Math.abs(counts) <= CENTER_MAX;
}

function changeOf(reading: WiringReading): number {
  return reading.load - reading.rest;
}

function moved(reading: WiringReading): boolean {
  return Math.abs(changeOf(reading)) >= MOVE;
}

function findPair(readings: WiringReading[], a: number, b: number): WiringReading | undefined {
  return readings.find(
    (reading) =>
      reading.kind === "pair" &&
      ((reading.pins[0] === a && reading.pins[1] === b) || (reading.pins[0] === b && reading.pins[1] === a)),
  );
}

function rowsOf(readings: WiringReading[]): WiringReport["rows"] {
  return readings.map((reading) => ({
    label: reading.label,
    rest: reading.rest,
    load: reading.load,
    change: changeOf(reading),
  }));
}

function groundedSentence(pins: WiringReading[]): string | null {
  const quiet = pins.filter((pin) => isGround(pin.rest) && isGround(pin.load) && !moved(pin));
  if (!quiet.length) return null;
  const names = quiet.map((pin) => pin.label).join(" and ");
  return `${names} ${quiet.length === 1 ? "stays" : "stay"} near ground, so ${quiet.length === 1 ? "that pin is" : "those pins are"} not a sense wire.`;
}

function direction(change: number): string {
  return change >= 0 ? "up" : "down";
}

export function interpretWiring(readings: WiringReading[]): WiringReport {
  const rows = rowsOf(readings);
  const base = { rows, pairMux: null as number | null, ok: false };

  if (readings.length >= 2) {
    const rests = readings.map((reading) => reading.rest);
    const loads = readings.map((reading) => reading.load);
    const span = (values: number[]) => Math.max(...values) - Math.min(...values);
    if (span(rests) < SAME_SPAN && span(loads) < SAME_SPAN) {
      return {
        ...base,
        verdict: "same-reading",
        title: "Every input returned the same counts",
        detail: [
          "Changing the input did not change the reading. The simulator does that, because it has one signal. On a board, the chip is not switching inputs.",
        ],
      };
    }
  }

  const pins = readings.filter((reading) => reading.kind === "pin");
  const sense = pins.filter((pin) => isHalf(pin.rest) || isHalf(pin.load));
  const movers = sense.filter(moved);
  const groundNote = groundedSentence(pins);

  if (!sense.length) {
    const detail = [
      "With gain 1 and the analog supply as the reference, a sense wire on a 3.3 V bridge rests near 4.2 million counts. None of the four inputs did.",
    ];
    if (pins.every((pin) => isGround(pin.rest))) {
      detail.push("All four inputs sit near ground. Excitation is not reaching the bridge, or the cell is not on these pins.");
    }
    return { ...base, verdict: "no-excitation", title: "No sense wire is at half the excitation", detail };
  }

  if (!movers.length) {
    return {
      ...base,
      verdict: "no-motion",
      title: "The load did not move a sense wire",
      detail: [
        `${sense.map((pin) => pin.label).join(" and ")} ${sense.length === 1 ? "sits" : "sit"} near half the excitation, and the load left ${sense.length === 1 ? "it" : "them"} there.`,
        "Use a firmer load and run the check again.",
        ...(groundNote ? [groundNote] : []),
      ],
    };
  }

  if (movers.length === 1) {
    const live = movers[0];
    const quiet = sense.filter((pin) => pin !== live);
    const detail = [
      `${live.label} sits near half the excitation and moves ${direction(changeOf(live))} under the load.`,
    ];
    if (quiet.length) {
      detail.push(`${quiet.map((pin) => pin.label).join(" and ")} also ${quiet.length === 1 ? "sits" : "sit"} near half the excitation and ${quiet.length === 1 ? "stays" : "stay"} still.`);
    }
    detail.push("A full bridge needs the two sense wires to move in opposite directions. One moving wire is a single arm, or the other arm is not seeing this load.");
    if (groundNote) detail.push(groundNote);
    return { ...base, verdict: "one-pin", title: "Only one sense wire moves", detail };
  }

  const ranked = [...movers].sort((a, b) => Math.abs(changeOf(b)) - Math.abs(changeOf(a)));
  const first = ranked[0];
  const second = ranked[1];
  const pair = findPair(readings, first.pins[0], second.pins[0]);
  const firstChange = changeOf(first);
  const secondChange = changeOf(second);
  const sameWay = firstChange * secondChange > 0;
  const pairChange = pair ? changeOf(pair) : firstChange - secondChange;
  const shared = Math.min(Math.abs(firstChange), Math.abs(secondChange));
  const similarSize = shared >= 0.6 * Math.max(Math.abs(firstChange), Math.abs(secondChange));
  const pairMux = pair?.mux ?? null;
  const notes = groundNote ? [groundNote] : [];

  if (!sameWay && pair && isHalf(pair.rest)) {
    return {
      ...base,
      verdict: "unbalanced",
      pairMux,
      title: "The sense wires move apart, and the difference is not centered",
      detail: [
        `${first.label} moves ${direction(firstChange)} and ${second.label} moves ${direction(secondChange)}.`,
        `${pair.label} rests near half the excitation. A balanced bridge's difference rests near zero, so this pair is not the two sense wires alone.`,
        ...notes,
      ],
    };
  }

  if (!sameWay && pair && isCentered(pair.rest) && Math.abs(pairChange) >= MOVE) {
    return {
      ...base,
      verdict: "working",
      ok: true,
      pairMux,
      title: "Working as a full bridge",
      detail: [
        `${first.label} and ${second.label} sit near half the excitation and move in opposite directions under the load.`,
        `${pair.label} rests near zero and moves with the load. That is the weight signal, and the live trace is on that pair.`,
        ...notes,
      ],
    };
  }

  if (!sameWay) {
    return {
      ...base,
      verdict: "unbalanced",
      pairMux,
      title: "The sense wires move apart, and the difference is not centered",
      detail: [
        `${first.label} moves ${direction(firstChange)} and ${second.label} moves ${direction(secondChange)}.`,
        pair
          ? `${pair.label} does not rest near zero, so the live weight reading is not a centered bridge.`
          : "The difference of those two wires was not in the check.",
        ...notes,
      ],
    };
  }

  const cancels = Math.abs(pairChange) < 0.4 * shared;
  if (cancels) {
    const detail = [
      `${first.label} and ${second.label} sit near half the excitation. Under the load they both move ${direction(firstChange)}.`,
      pair
        ? `${pair.label} barely moves, because a full bridge keeps only the difference and the shared step cancels.`
        : "The difference of those two wires cancels a shared step.",
      "This is what happens when every gauge is on the same face and aligned with the strain. Both dividers shift together.",
      "Trade the two gauges in one divider: the gauge from excitation+ to a sense wire changes places with the gauge from that sense wire to excitation−. Swapping the two leads of one gauge leaves the bridge unchanged, because a gauge is a resistor.",
    ];
    if (similarSize) {
      detail.push("The two steps are about the same size. A dip in the 3.3 V excitation does the same thing. With the load on, pin 1 to pin 2 should still read 3.3 V.");
    }
    detail.push(...notes);
    return {
      ...base,
      verdict: "common-mode",
      pairMux,
      title: "Both sense wires move together",
      detail,
    };
  }

  return {
    ...base,
    verdict: "partial",
    pairMux,
    title: "The sense wires mostly move together",
    detail: [
      `${first.label} and ${second.label} both move ${direction(firstChange)}, and ${pair ? pair.label : "their difference"} still moves by a smaller amount.`,
      "The shared step is the same-face problem: every gauge is aligned with the strain, so both dividers shift together. The leftover difference is the only part a full bridge will report.",
      "Trade the two gauges in one divider so the same load drives the sense wires apart. The live trace stays on the difference.",
      ...notes,
    ],
  };
}
