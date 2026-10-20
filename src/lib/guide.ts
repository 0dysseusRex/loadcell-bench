export const GUIDE_STEP_IDS = ["connect", "name", "live", "speed", "accuracy", "range"] as const;

export type GuideStepId = (typeof GUIDE_STEP_IDS)[number];

export type GuideTab = "live" | "speed" | "accuracy" | "range" | "build";

export type GuideSnapshot = {
  cellName: string;
  mode: "idle" | "sim" | "mcu";
  phase: string;
  sampleCount: number;
  speedRuns: number;
  hasFit: boolean;
  hasRange: boolean;
};

export function isGuideTab(value: unknown): value is GuideTab {
  return value === "live" || value === "speed" || value === "accuracy" || value === "range" || value === "build";
}

export function guideStatus(snapshot: GuideSnapshot): Record<GuideStepId, boolean> {
  return {
    name: snapshot.cellName.trim().length > 0,
    connect: snapshot.mode !== "idle",
    live: snapshot.sampleCount > 0 || snapshot.phase === "streaming",
    speed: snapshot.speedRuns > 0,
    accuracy: snapshot.hasFit,
    range: snapshot.hasRange,
  };
}

/** The three bench tests. Naming and connecting are setup, not results. */
export function readyToCompile(status: Record<GuideStepId, boolean>): boolean {
  return status.speed && status.accuracy && status.range;
}

export function nextGuideStep(status: Record<GuideStepId, boolean>): GuideStepId | null {
  return GUIDE_STEP_IDS.find((id) => !status[id]) ?? null;
}
