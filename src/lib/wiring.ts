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
  | "unbalanced"
  | "other-kind";

/** What the Live tab is testing. Full uses the Wheatstone check. The others use the divider check. */
export type CellKind = "full" | "half" | "quarter" | "series";

export type CellKindGuide = {
  kind: CellKind;
  label: string;
  /** Shown under the title. Same measurement for every kind; the pass rule changes. */
  blurb: string;
  steps: string[];
  /** Shown after the empty pass, before the loaded pass. */
  loadPrompt: string;
};

export const CELL_KINDS: readonly CellKindGuide[] = [
  {
    kind: "full",
    label: "Full Wheatstone bridge",
    blurb:
      "Reads each ADS1220 input empty, then loaded, at gain 1 with the analog supply as the reference. About 1.65 V is about 4.2 million counts. A full bridge passes when the two sense wires move in opposite directions and their difference rests near zero.",
    steps: [
      "Four gauges make two dividers. Each divider is excitation, a gauge, a sense wire, a gauge, and excitation again.",
      "One diagonal of that diamond is E+ and E\u2212. The other is S+ and S\u2212. On a balanced full bridge those two pairs are the higher resistances, about one gauge each. Adjacent nodes read about three quarters of that.",
      "The mini-board connector is pin 1 E+, pin 2 E\u2212, pin 3 S\u2212, pin 4 S+.",
    ],
    loadPrompt: "Empty readings are in. Put a steady load on the cell, then read it again.",
  },
  {
    kind: "half",
    label: "Half bridge",
    blurb:
      "Reads each ADS1220 input empty, then loaded, at gain 1 with the analog supply as the reference. About 1.65 V is about 4.2 million counts. A half bridge passes when the gauge midpoint moves, the resistor midpoint stays, and their difference rests near zero.",
    steps: [
      "Put the two active gauges in series between E+ and E\u2212. S+ is the junction between those gauges.",
      "Put two fixed resistors, each about the gauge resistance, in series between E+ and E\u2212. S\u2212 is the junction between those resistors.",
      "The mini-board connector is pin 1 E+, pin 2 E\u2212, pin 3 S\u2212, pin 4 S+. The resistor midpoint should not move when you load the cell. The gauge midpoint should.",
    ],
    loadPrompt: "Empty readings are in. Put a steady load on the mounting axis, then read it again.",
  },
  {
    kind: "quarter",
    label: "Quarter bridge",
    blurb:
      "Reads each ADS1220 input empty, then loaded, at gain 1 with the analog supply as the reference. About 1.65 V is about 4.2 million counts. A quarter bridge passes when the single gauge\u2019s midpoint moves, the resistor midpoint stays, and their difference rests near zero.",
    steps: [
      "Put one active gauge and one fixed resistor in series between E+ and E\u2212. S+ is their junction. The resistor should match the gauge.",
      "Put two more fixed resistors in series between E+ and E\u2212. S\u2212 is their junction.",
      "The mini-board connector is pin 1 E+, pin 2 E\u2212, pin 3 S\u2212, pin 4 S+. Only the gauge side should move.",
    ],
    loadPrompt: "Empty readings are in. Put a steady load on the mounting axis, then read it again.",
  },
  {
    kind: "series",
    label: "Three-gauge series",
    blurb:
      "Reads each ADS1220 input empty, then loaded, at gain 1 with the analog supply as the reference. About 1.65 V is about 4.2 million counts. One span of a three-gauge string passes when that span\u2019s midpoint moves, the resistor midpoint stays, and their difference rests near zero.",
    steps: [
      "This cable is three gauges in one string, not a diamond. On the K2 colors the string is white, black, yellow, red, about 1 k\u03a9 a step. White\u2013yellow and black\u2013red are the two overlapping spans, and they are the twist pairs. White\u2013red is all three gauges. Those 1.9 k\u03a9 pairs are not the diagonals.",
      "Test one span. E+ and E\u2212 on white and yellow, S+ on black, and S\u2212 on the junction of two matched resistors of about 1 k\u03a9 from E+ to E\u2212. Leave red off the connector. The mini-board connector is pin 1 E+, pin 2 E\u2212, pin 3 S\u2212, pin 4 S+.",
      "The other span is E+ and E\u2212 on black and red, S+ on yellow, and the same resistor junction. Leave white off.",
      "Do not land both twist pairs on excitation and signal. That puts about half the excitation across the ADC, near 4 million counts, and a centered weight does not move it.",
    ],
    loadPrompt: "Empty readings are in. Hang a weight on the mounting axis. A finger on the metal is not this load.",
  },
];

export function cellKindGuide(kind: CellKind): CellKindGuide {
  return CELL_KINDS.find((guide) => guide.kind === kind) ?? CELL_KINDS[0];
}

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
      "Trade the two gauges in one divider: the gauge from excitation+ to a sense wire changes places with the gauge from that sense wire to excitation\u2212. Swapping the two leads of one gauge leaves the bridge unchanged, because a gauge is a resistor.",
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

type DividerKind = Exclude<CellKind, "full">;

function sameReading(readings: WiringReading[]): boolean {
  if (readings.length < 2) return false;
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  return span(readings.map((reading) => reading.rest)) < SAME_SPAN && span(readings.map((reading) => reading.load)) < SAME_SPAN;
}

/** A half-scale pair is normal when it is a sense wire against ground. It is the twist-pair mistake when only one wire sits at half. */
function halfScaleNote(kind: DividerKind, readings: WiringReading[], senseCount: number): string | null {
  if (senseCount >= 2) return null;
  const pair = readings.find((reading) => reading.kind === "pair" && isHalf(reading.rest));
  if (!pair) return null;
  if (kind === "series") {
    return `${pair.label} rests near half the excitation. On a three-gauge series cable that is the two twist pairs used as the diagonals. Excite one two-gauge span, and read its midpoint against the resistor divider.`;
  }
  return `${pair.label} rests near half the excitation, so those two wires are not a balanced pair. Match the completion resistors to the gauge, and keep the gauge midpoint on one sense wire.`;
}

function dividerCommonMode(kind: DividerKind, first: WiringReading, second: WiringReading, pair: WiringReading | undefined): string[] {
  const shared = [
    `${first.label} and ${second.label} sit near half the excitation. Under the load they both move ${direction(changeOf(first))}.`,
    pair
      ? `${pair.label} barely moves, because the reading keeps only the difference and the shared step cancels.`
      : "The difference of those two wires cancels a shared step.",
  ];
  if (kind === "series") {
    shared.push(
      "The two gauges in this span have the same strain sign, so a centered weight will not show. Wire the other span the same way: the other two-gauge pair, its midpoint on S+, and the resistor junction on S\u2212.",
    );
  } else if (kind === "quarter") {
    shared.push("A quarter bridge should move only the gauge side. Both midpoints moved, so a second gauge is in the circuit, or the load is reaching the resistor side.");
  } else {
    shared.push(
      "The two gauges between one pair of excitation wires are changing together. Trade the gauge on the excitation+ side of one sense wire with the gauge on the excitation\u2212 side. Swapping the two leads of one gauge leaves the divider unchanged.",
    );
  }
  return shared;
}

function dividerSuccess(kind: DividerKind, live: WiringReading, still: WiringReading, pair: WiringReading): WiringReport["detail"] {
  const movedSide = `${live.label} sits near half the excitation and moves ${direction(changeOf(live))} under the load. ${still.label} stays put.`;
  const difference = `${pair.label} rests near zero and moves with the load. That difference is the weight, and the live trace is on that pair.`;
  if (kind === "series") {
    return [
      movedSide,
      difference,
      "This is one span of the three-gauge string, completed with the resistor divider. The unused wire stays off the connector. If a centered weight is flat here, those two gauges have the same sign: wire the other span.",
    ];
  }
  if (kind === "quarter") {
    return [
      movedSide,
      difference,
      "The still wire is the fixed-resistor midpoint. The moving wire is the single gauge against its completion resistor.",
    ];
  }
  return [
    movedSide,
    difference,
    "The still wire is the fixed-resistor midpoint. The moving wire is the junction of the two active gauges.",
  ];
}

/**
 * Half bridge, quarter bridge, and one span of a three-gauge series string.
 * The pass is one midpoint that moves, one that stays, and a centered difference.
 * Two midpoints that move apart are a full bridge, which is a different menu choice.
 */
function interpretDivider(kind: DividerKind, readings: WiringReading[]): WiringReport {
  const rows = rowsOf(readings);
  const base = { rows, pairMux: null as number | null, ok: false };

  if (sameReading(readings)) {
    return {
      ...base,
      verdict: "same-reading",
      title: "Every input returned the same counts",
      detail: [
        "Changing the input did not change the reading. The simulator does that, because it has one signal. On a board, the chip is not switching inputs.",
      ],
    };
  }

  const pins = readings.filter((reading) => reading.kind === "pin");
  const sense = pins.filter((pin) => isHalf(pin.rest) || isHalf(pin.load));
  const movers = sense.filter(moved);
  const quietSense = sense.filter((pin) => !moved(pin));
  const groundNote = groundedSentence(pins);
  const halfNote = halfScaleNote(kind, readings, sense.length);
  const notes = [...(groundNote ? [groundNote] : []), ...(halfNote ? [halfNote] : [])];

  if (!sense.length) {
    const detail = [
      "With gain 1 and the analog supply as the reference, a sense wire rests near 4.2 million counts. None of the four inputs did.",
    ];
    if (pins.every((pin) => isGround(pin.rest))) {
      detail.push("All four inputs sit near ground. Excitation is not reaching the divider, or the cell is not on these pins.");
    }
    detail.push(...notes);
    return { ...base, verdict: "no-excitation", title: "No sense wire is at half the excitation", detail };
  }

  if (!movers.length) {
    return {
      ...base,
      verdict: "no-motion",
      title: "The load did not move a sense wire",
      detail: [
        `${sense.map((pin) => pin.label).join(" and ")} ${sense.length === 1 ? "sits" : "sit"} near half the excitation, and the load left ${sense.length === 1 ? "it" : "them"} there.`,
        kind === "series"
          ? "Use a weight on the mounting axis and run the check again. A finger on one neck is a different load."
          : "Use a firmer load and run the check again.",
        ...notes,
      ],
    };
  }

  if (movers.length >= 2) {
    const ranked = [...movers].sort((a, b) => Math.abs(changeOf(b)) - Math.abs(changeOf(a)));
    const first = ranked[0];
    const second = ranked[1];
    const pair = findPair(readings, first.pins[0], second.pins[0]);
    const firstChange = changeOf(first);
    const secondChange = changeOf(second);
    const sameWay = firstChange * secondChange > 0;
    const pairChange = pair ? changeOf(pair) : firstChange - secondChange;
    const shared = Math.min(Math.abs(firstChange), Math.abs(secondChange));
    const pairMux = pair?.mux ?? null;

    if (!sameWay && pair && isCentered(pair.rest) && Math.abs(pairChange) >= MOVE) {
      return {
        ...base,
        verdict: "other-kind",
        pairMux,
        title: "This is wired as a full bridge",
        detail: [
          `${first.label} moves ${direction(firstChange)} and ${second.label} moves ${direction(secondChange)}.`,
          `${pair.label} rests near zero and moves with the load. Both sense wires are active gauges, which is a full Wheatstone bridge. Set the menu to Full Wheatstone bridge, or replace one divider with two fixed resistors.`,
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
            ? `${pair.label} does not rest near zero. Match the completion resistors to the gauges so the empty difference sits near zero.`
            : "The difference of those two wires was not in the check.",
          ...notes,
        ],
      };
    }

    const cancels = Math.abs(pairChange) < 0.4 * shared;
    if (cancels) {
      return {
        ...base,
        verdict: "common-mode",
        pairMux,
        title: "Both sense wires move together",
        detail: [...dividerCommonMode(kind, first, second, pair), ...notes],
      };
    }

    return {
      ...base,
      verdict: "partial",
      pairMux,
      title: "The sense wires mostly move together",
      detail: [
        `${first.label} and ${second.label} both move ${direction(firstChange)}, and ${pair ? pair.label : "their difference"} still moves by a smaller amount.`,
        kind === "series"
          ? "Most of the step is common to both gauges in this span. The leftover difference is all a centered weight will show. The other span may be the one with opposite strain."
          : "Most of the step is common to both midpoints. A divider reports only the leftover difference.",
        ...notes,
      ],
    };
  }

  const live = movers[0];
  const still = quietSense
    .map((pin) => ({ pin, pair: findPair(readings, live.pins[0], pin.pins[0]) }))
    .sort((a, b) => Math.abs(a.pair?.rest ?? Number.POSITIVE_INFINITY) - Math.abs(b.pair?.rest ?? Number.POSITIVE_INFINITY))[0];

  if (!still) {
    return {
      ...base,
      verdict: "one-pin",
      title: "Only one sense wire is at half the excitation",
      detail: [
        `${live.label} sits near half the excitation and moves ${direction(changeOf(live))} under the load.`,
        kind === "series"
          ? "The other sense wire should be the resistor midpoint, also near half the excitation, and it should stay still. A wire that sits on a rail is an end of the string, not the midpoint."
          : "The other sense wire should be the fixed-resistor midpoint, also near half the excitation, and it should stay still.",
        ...notes,
      ],
    };
  }

  const pair = still.pair;
  if (pair && isCentered(pair.rest) && moved(pair)) {
    return {
      ...base,
      verdict: "working",
      ok: true,
      pairMux: pair.mux,
      title: kind === "series" ? "Working as one span of the series string" : kind === "quarter" ? "Working as a quarter bridge" : "Working as a half bridge",
      detail: dividerSuccess(kind, live, still.pin, pair),
    };
  }

  return {
    ...base,
    verdict: "unbalanced",
    pairMux: pair?.mux ?? null,
    title: "One midpoint moves, and the difference is not centered",
    detail: [
      `${live.label} moves ${direction(changeOf(live))} and ${still.pin.label} stays near half the excitation.`,
      pair
        ? `${pair.label} does not rest near zero, so the empty divider is not balanced. Match the completion resistors to the gauge resistance.`
        : "The difference of those two wires was not in the check.",
      ...notes,
    ],
  };
}

export function interpretForKind(kind: CellKind, readings: WiringReading[]): WiringReport {
  if (kind === "full") return interpretWiring(readings);
  return interpretDivider(kind, readings);
}
