"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useBench } from "@/components/bench-context";
import { Button } from "@/components/ui/button";
import {
  GUIDE_STEP_IDS,
  guideStatus,
  nextGuideStep,
  readyToCompile,
  type GuideStepId,
  type GuideTab,
} from "@/lib/guide";

const STEPS: { id: GuideStepId; tab: GuideTab; title: string; body: string }[] = [
  {
    id: "connect",
    tab: "build",
    title: "Select the amp, then connect",
    body: "The amp is the menu at the top right. Pick the board on your cable: H36 with a mini ADS1220, H36 with a mini HX717, or the alpha board with its own USB port. Then press Connect. Chrome or Edge is required for a real board. Use simulator if you want to practice with nothing plugged in.",
  },
  {
    id: "name",
    tab: "build",
    title: "Name the cell",
    body: "A load cell is a small metal spring with foil sensors glued to it. On Build, give this one a name you will recognize on the report. The Custom K2 Loadcell button fills the worked example. CUSTOM LOADCELL leaves every field blank so you can type your own, or upload a cell file you saved before.",
  },
  {
    id: "live",
    tab: "live",
    title: "Watch the live reading",
    body: "Press Start stream. The large number is grams once a scale is known, and counts until then. A count is the chip’s raw reading. Press on the cell and that number should move. If it moves the wrong way, turn on Invert on this screen. On an ADS1220, Check wiring above the chip settings reads each pin empty and loaded and says whether the bridge is working. The smaller noise figure is how much the reading jitters while the cell sits still.",
  },
  {
    id: "speed",
    tab: "speed",
    title: "See how fast readings arrive",
    body: "A printer that taps the bed needs a fresh reading many times a second. Run the sweep. It asks the board for each speed and counts how many readings actually show up. A pass means the board kept up, the USB link stayed intact, and the numbers were not frozen on one value.",
  },
  {
    id: "accuracy",
    tab: "accuracy",
    title: "Weigh something you already know",
    body: "Start with the cell empty, then put on a weight you trust. You can also type the mass and the counts from a notebook. The bench fits a straight line through those points: how many counts equal one gram. Take the weight off and capture again. A disagreement on the way down is hysteresis, which glue often causes.",
  },
  {
    id: "range",
    tab: "range",
    title: "Find the lightest change and the heaviest load",
    body: "With nothing on the cell, measure the noise floor. That jitter, turned into grams, is the smallest change worth believing. Then add weight in steps until the chip maxes out, or until zero fails to come back when you unload. A zero that returns means the metal sprang back.",
  },
];

export function HowTo({ onJump, onCompile }: { onJump: (tab: GuideTab) => void; onCompile: () => void }) {
  const bench = useBench();
  const status = guideStatus({
    cellName: bench.cellName,
    mode: bench.mode,
    phase: bench.phase,
    sampleCount: bench.samples.length,
    speedRuns: bench.speedResults.length,
    hasFit: bench.fit !== null,
    hasRange: bench.rangeResult !== null,
  });
  const [mobileOpen, setMobileOpen] = useState(true);
  const [picked, setPicked] = useState<GuideStepId | null>(null);
  const open = picked ?? nextGuideStep(status) ?? "range";
  const doneCount = GUIDE_STEP_IDS.filter((id) => status[id]).length;
  const testsDone = ["speed", "accuracy", "range"].filter((id) => status[id as GuideStepId]).length;
  const compileReady = readyToCompile(status);

  function choose(id: GuideStepId) {
    setPicked(id);
    const step = STEPS.find((item) => item.id === id);
    if (!step) return;
    onJump(step.tab);
    const target = id === "connect" ? document.querySelector("[data-bench-header]") : document.getElementById("bench-tabs");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hint(id: GuideStepId): string | null {
    if (!status[id]) return null;
    if (id === "name") return bench.cellName.trim();
    if (id === "connect") return bench.mode === "sim" ? "Simulator" : bench.front.short;
    if (id === "live") return bench.phase === "streaming" ? "Streaming" : "Readings captured";
    if (id === "speed") {
      const passed = bench.speedResults.filter((row) => row.pass).length;
      return `${passed} of ${bench.speedResults.length} passed`;
    }
    if (id === "accuracy" && bench.fit) return `${bench.fit.countsPerGram.toFixed(1)} counts per gram`;
    if (id === "range" && bench.rangeResult?.resolutionGrams != null) {
      return `${bench.rangeResult.resolutionGrams.toFixed(2)} g smallest change`;
    }
    if (id === "range") return "Noise recorded";
    return null;
  }

  return (
    <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <div className="rounded-xl border border-[#e0d8cc] bg-[#f7f4ee]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span>
            <span className="block text-sm font-semibold">How to test this cell</span>
            <span className="block text-xs text-[#6d675e]">
              {doneCount} of {GUIDE_STEP_IDS.length} steps
            </span>
          </span>
          <span className="text-xs text-[#8a5a32]">{mobileOpen ? "Hide" : "Show"}</span>
        </button>
        <div className={mobileOpen ? "block" : "hidden lg:block"}>
          <div className="hidden px-4 pt-4 lg:block">
            <p className="text-[11px] font-medium tracking-[0.16em] text-[#8a5a32] uppercase">Start to finish</p>
            <h2 className="mt-1 text-base font-semibold">How to test this cell</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5c564c]">
              {doneCount} of {GUIDE_STEP_IDS.length} steps. Open a step and the matching screen comes up.
            </p>
          </div>
          <ol className="space-y-1 px-2 py-3">
            {STEPS.map((step, index) => {
              const done = status[step.id];
              const expanded = open === step.id;
              const detail = hint(step.id);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => choose(step.id)}
                    className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left ${expanded ? "bg-white" : "hover:bg-white/70"}`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${done ? "bg-[#3d6b4f] text-white" : "bg-[#efe6d8] text-[#6b4e1e]"}`}
                    >
                      {done ? <Check className="size-3" aria-hidden /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{step.title}</span>
                      {detail && <span className="block truncate text-xs text-[#6d675e]">{detail}</span>}
                    </span>
                  </button>
                  {expanded && <p className="px-2 pt-1 pb-2 pl-10 text-[13px] leading-relaxed text-[#3f3a33]">{step.body}</p>}
                </li>
              );
            })}
          </ol>
          <div className="border-t border-[#e0d8cc] px-4 py-3">
            <p className="text-sm font-medium">Compile a results page</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5c564c]">
              {compileReady
                ? "Speed, accuracy, and range all have numbers. Open one page that explains them, then print it if you want a copy."
                : `Finish the speed sweep, the known-weight fit, and the noise check. ${testsDone} of 3 are in.`}
            </p>
            <Button className="mt-3 w-full" disabled={!compileReady} onClick={onCompile}>
              Compile results
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
