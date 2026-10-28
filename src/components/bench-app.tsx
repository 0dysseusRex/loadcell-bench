"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { BenchProvider, useBench, type Capture } from "@/components/bench-context";
import { HowTo } from "@/components/how-to";
import { ResultsPage } from "@/components/results-page";
import { SketchUpload } from "@/components/sketch-upload";
import { CellOutline } from "@/components/cell-outline";
import { TraceChart } from "@/components/trace-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADS_INPUTS } from "@/lib/ads1220";
import { FRONTS, printerSnippet } from "@/lib/frontends";
import { CELL_PROFILES, GAUGE_PRESETS, MATERIALS, NORMAL_RATES, TURBO_RATES, bendingStiffness, cellProfileById, estimateScale, gaugeById, materialById, rootGridFraction, type BridgeKind } from "@/lib/model";
import { GOALS } from "@/lib/analyze";
import { guideStatus, isGuideTab, readyToCompile, type GuideTab } from "@/lib/guide";

const MASS_PRESETS = [20, 50, 100, 200, 500, 1000];

export function BenchApp() {
  return (
    <BenchProvider>
      <BenchShell />
    </BenchProvider>
  );
}

function BenchShell() {
  const bench = useBench();
  const [tab, setTab] = useState<GuideTab>("build");
  const [view, setView] = useState<"bench" | "report">("bench");
  const compileReady = readyToCompile(
    guideStatus({
      cellName: bench.cellName,
      mode: bench.mode,
      phase: bench.phase,
      sampleCount: bench.samples.length,
      speedRuns: bench.speedResults.length,
      hasFit: bench.fit !== null,
      hasRange: bench.rangeResult !== null,
    }),
  );

  if (view === "report") {
    return (
      <div className="min-h-screen bg-[#f3efe6] text-[#1c1915]">
        <ResultsPage onBack={() => setView("bench")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3efe6] text-[#1c1915]">
      <header data-bench-header className="border-b border-[#e0d8cc] bg-[#f7f4ee]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-[#8a5a32] uppercase">
              {bench.cellName.trim() || "Unnamed load cell"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Load cell bench</h1>
            <p className="mt-1 max-w-xl text-sm text-[#5c564c]">
              Stream a Plimsoll ADC over Klipper USB and measure rate, accuracy, and range before the cell goes on a printer.
            </p>
          </div>
          <ConnectBar />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:items-start">
        <HowTo onJump={setTab} onCompile={() => setView("report")} />
        <main className="min-w-0">
          {bench.error && (
            <div className="mb-4 rounded-lg border border-[#e7b4a8] bg-[#fff4f0] px-3 py-2 text-sm text-[#8a3324]">
              {bench.error}
            </div>
          )}
          {bench.phase === "busy" && bench.busyLabel && (
            <div className="mb-4 rounded-lg border border-[#e4d3b0] bg-[#fff8ec] px-3 py-2 text-sm text-[#6b4e1e]">
              {bench.busyLabel}
            </div>
          )}
          {compileReady && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e0d8cc] bg-[#f7f4ee] px-3 py-2">
              <p className="text-sm text-[#3f3a33]">Speed, accuracy, and range are in. Compile them into one page.</p>
              <Button onClick={() => setView("report")}>Compile results</Button>
            </div>
          )}
          <Tabs
            id="bench-tabs"
            className="scroll-mt-4"
            value={tab}
            onValueChange={(value) => {
              if (isGuideTab(value)) setTab(value);
            }}
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="build">Build</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="speed">Speed</TabsTrigger>
              <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
              <TabsTrigger value="range">Range</TabsTrigger>
            </TabsList>
            <TabsContent value="build" className="mt-4">
              <BuildPanel />
            </TabsContent>
            <TabsContent value="live" className="mt-4">
              <LivePanel />
            </TabsContent>
            <TabsContent value="speed" className="mt-4">
              <SpeedPanel />
            </TabsContent>
            <TabsContent value="accuracy" className="mt-4">
              <AccuracyPanel />
            </TabsContent>
            <TabsContent value="range" className="mt-4">
              <RangePanel />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function ConnectBar() {
  const bench = useBench();
  const linked = bench.mode !== "idle";
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <NativeSelect className="w-64 sm:w-72" value={bench.front.id} onChange={bench.setFront} disabled={bench.mode !== "idle" || bench.phase === "busy"}>
          {FRONTS.map((front) => (
            <option key={front.id} value={front.id}>
              {front.label}
            </option>
          ))}
        </NativeSelect>
        {bench.mode !== "mcu" && (
          <Button onClick={() => void bench.connectBoard()} disabled={bench.phase === "connecting" || bench.phase === "busy"}>
            {bench.phase === "connecting" ? "Connecting…" : "Connect"}
          </Button>
        )}
        {bench.mode !== "sim" && (
          <Button variant="outline" onClick={bench.connectSim} disabled={bench.phase === "busy" || bench.phase === "connecting"}>
            Use simulator
          </Button>
        )}
        {linked && (
          <Button variant="ghost" onClick={() => void bench.disconnect()} disabled={bench.phase === "connecting"}>
            Disconnect
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5c564c]">
        <StatusBadge />
        {bench.mcuLine && <span className="font-mono">{bench.mcuLine}</span>}
        {!bench.webSerial && <span>Web Serial needs Chrome or Edge.</span>}
      </div>
    </div>
  );
}

function StatusBadge() {
  const bench = useBench();
  if (bench.mode === "idle") return <Badge variant="outline">No source</Badge>;
  if (bench.phase === "streaming") {
    return <Badge>{bench.mode === "sim" ? "Simulator streaming" : `${bench.front.short} streaming`}</Badge>;
  }
  if (bench.phase === "busy") return <Badge variant="secondary">Working</Badge>;
  if (bench.phase === "connecting") return <Badge variant="secondary">Opening USB</Badge>;
  return <Badge variant="outline">{bench.mode === "sim" ? "Simulator idle" : `${bench.front.short} idle`}</Badge>;
}

function LivePanel() {
  const bench = useBench();
  const streaming = bench.phase === "streaming";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Bridge trace</CardTitle>
              <CardDescription>
                {bench.scaleSource === "entered"
                  ? "Grams use the scale you typed on the Build tab."
                  : bench.scaleSource === "calibration"
                    ? "Scale is from the accuracy measurements."
                    : bench.scaleSource === "sketch"
                      ? "Grams use the optional leaf sketch. Type a scale, or fit one on Accuracy, to replace it."
                      : "Counts only, until you type a scale or fit one."}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {streaming ? (
                <Button variant="outline" onClick={() => void bench.stopStream()}>
                  Stop
                </Button>
              ) : (
                <Button onClick={() => void bench.startStream()} disabled={bench.mode === "idle" || bench.phase === "busy"}>
                  Start stream
                </Button>
              )}
              <Button variant="outline" onClick={() => void bench.autoGain()} disabled={bench.mode === "idle" || bench.phase === "busy"}>
                Auto gain
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-4xl tracking-tight tabular-nums sm:text-5xl">
                {bench.latestGrams !== null ? `${bench.latestGrams.toFixed(2)} g` : bench.latestCounts !== null ? fmtCounts(bench.latestCounts) : "—"}
              </div>
              <div className="mt-1 font-mono text-xs text-[#6d675e] tabular-nums">
                {bench.latestCounts !== null ? `${Math.round(bench.latestCounts).toLocaleString()} counts` : "waiting for samples"}
                {bench.rate !== null ? ` · ${bench.rate.toFixed(1)} Hz delivered` : ""}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <Stat label="Noise rms" value={bench.noiseGrams !== null ? `${bench.noiseGrams.toFixed(2)} g` : bench.noiseCounts !== null ? `${bench.noiseCounts.toFixed(0)} ct` : "—"} />
              <Stat label="Overflows" value={String(bench.overflows)} />
              <Stat label="USB gaps" value={String(bench.gaps)} />
              {bench.front.sensor === "hx717" && <Stat label="Chip errors" value={String(bench.linkErrors)} />}
            </div>
          </div>
          {bench.saturatedNow && (
            <p className="text-sm text-[#8a3324]">The ADC is against the rail. Drop the gain, or this load is past the cell.</p>
          )}
          <div className="overflow-hidden rounded-lg border border-[#e4ddd0]">
            <TraceChart
              samples={bench.samples}
              tare={bench.tare}
              countsPerGram={bench.countsPerGram}
              invert={bench.invert}
            />
          </div>
          {bench.mode === "sim" && <LoadSlider />}
          {bench.mode === "idle" && (
            <p className="text-sm text-[#5c564c]">
              Pick the board above, then connect it with Klipper flashed for USB. The simulator walks the same three tests before the board is on the bench.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{bench.front.sensor === "hx717" ? "HX717" : "ADS1220"}</CardTitle>
            <CardDescription>{bench.front.settingsNote}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Gain">
              <NativeSelect value={String(bench.gain)} onChange={(v) => bench.setGain(Number(v))} disabled={bench.phase === "busy"}>
                {bench.front.gains.map((g) => (
                  <option key={g} value={g}>
                    {bench.front.sensor === "hx717" ? (g === 128 ? "128 (A-128)" : "64 (A-64)") : g}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Sample rate">
              <NativeSelect value={String(bench.sampleRate)} onChange={(v) => bench.setSampleRate(Number(v))} disabled={bench.phase === "busy"}>
                {bench.front.sensor === "hx717" ? (
                  bench.front.rates.map((r) => (
                    <option key={r} value={r}>
                      {r} Hz jumper
                    </option>
                  ))
                ) : (
                  <>
                    <optgroup label="Normal">
                      {NORMAL_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r} Hz
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Turbo">
                      {TURBO_RATES.map((r) => (
                        <option key={`t${r}`} value={r}>
                          {r} Hz turbo
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </NativeSelect>
            </Field>
            {bench.front.sensor === "hx717" ? (
              <p className="text-xs leading-relaxed text-[#5c564c]">
                The HX717 is ratiometric. Excitation is the reference, so supply drift cancels. Channel B is not the bridge and is not offered here.
              </p>
            ) : (
            <>
            <Field label="Reference">
              <NativeSelect value={bench.vref} onChange={(v) => bench.setVref(v as "internal" | "analog_supply")} disabled={bench.phase === "busy"}>
                <option value="internal">Internal 2.048 V</option>
                <option value="analog_supply">Analog supply, ratiometric</option>
              </NativeSelect>
            </Field>
            <Field label="Input">
              <NativeSelect value={String(bench.mux)} onChange={(v) => bench.setMux(Number(v))} disabled={bench.phase === "busy"}>
                {ADS_INPUTS.map((input) => (
                  <option key={input.id} value={input.mux}>
                    {input.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <p className="text-xs leading-relaxed text-[#5c564c]">
              Signal+ minus Signal− is the bridge. When a bend leaves that flat, read one wire at a time. Those choices drop the gain to 1 so 1.65 V stays on scale. Restart the stream after changing this.
            </p>
            </>
            )}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Label htmlFor="invert">Invert sign</Label>
              <Switch id="invert" checked={bench.invert} onCheckedChange={(checked) => bench.setInvert(checked)} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={bench.tareNow} disabled={bench.phase !== "streaming"}>
                Tare
              </Button>
              <Button variant="outline" className="flex-1" onClick={bench.downloadCsv} disabled={!bench.samples.length}>
                CSV
              </Button>
            </div>
            {streaming && (
              <Button variant="outline" className="w-full" onClick={() => void bench.startStream()}>
                Restart with these settings
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link log</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-40 overflow-auto font-mono text-[11px] leading-relaxed text-[#5c564c]">
              {bench.log.length ? bench.log.join("\n") : "Nothing yet."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadSlider() {
  const bench = useBench();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>Simulator load</span>
        <span className="font-mono tabular-nums">{bench.load.toFixed(0)} g</span>
      </div>
      <Slider
        min={0}
        max={2000}
        step={5}
        value={[bench.load]}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value;
          if (typeof next === "number") bench.setLoad(next);
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        {MASS_PRESETS.map((grams) => (
          <Button key={grams} size="sm" variant={bench.load === grams ? "default" : "outline"} onClick={() => bench.setLoad(grams)}>
            {grams} g
          </Button>
        ))}
        <Button size="sm" variant={bench.load === 0 ? "default" : "outline"} onClick={() => bench.setLoad(0)}>
          Empty
        </Button>
      </div>
    </div>
  );
}

function SpeedPanel() {
  const bench = useBench();
  const rates =
    bench.front.sensor === "hx717"
      ? bench.front.rates
      : [...NORMAL_RATES, ...TURBO_RATES.filter((r) => !NORMAL_RATES.includes(r))];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Polling speed</CardTitle>
          <CardDescription>
            {bench.front.speedNote} A pass is within {(GOALS.rateTolerance * 100).toFixed(0)}% of the setting, with no overflows, no missing USB blocks, and more than one distinct count.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {rates.map((rate) => {
              const on = bench.speedRates.includes(rate);
              return (
                <Button key={rate} size="sm" variant={on ? "default" : "outline"} onClick={() => bench.toggleRate(rate)}>
                  {rate} Hz
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Seconds at each rate">
              <Input
                className="w-24"
                type="number"
                min={2}
                max={15}
                value={bench.speedSeconds}
                onChange={(event) => bench.setSpeedSeconds(Math.min(15, Math.max(2, Number(event.target.value) || 2)))}
              />
            </Field>
            <Button onClick={() => void bench.runSpeed()} disabled={bench.mode === "idle" || bench.phase === "busy"}>
              Run sweep
            </Button>
            <ScoreDialog />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          {bench.speedResults.length === 0 ? (
            <p className="text-sm text-[#5c564c]">{bench.front.speedEmpty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-wide text-[#6d675e] uppercase">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Set</th>
                    <th className="py-2 pr-3 font-medium">Measured</th>
                    <th className="py-2 pr-3 font-medium">Samples</th>
                    <th className="py-2 pr-3 font-medium">Unique</th>
                    <th className="py-2 pr-3 font-medium">Saturated</th>
                    <th className="py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {bench.speedResults.map((result) => (
                    <tr key={result.configuredHz} className="border-t border-[#eee6d8]">
                      <td className="py-2 pr-3 font-mono">{result.configuredHz}</td>
                      <td className="py-2 pr-3 font-mono">{result.measuredHz.toFixed(1)}</td>
                      <td className="py-2 pr-3 font-mono">{result.samples}</td>
                      <td className="py-2 pr-3 font-mono">{result.unique}</td>
                      <td className="py-2 pr-3 font-mono">{result.saturated}</td>
                      <td className="py-2">
                        <Badge variant={result.pass ? "default" : "destructive"}>{result.pass ? "Pass" : "Fail"}</Badge>
                        {result.notes.length > 0 && <p className="mt-1 text-xs text-[#5c564c]">{result.notes.join(" ")}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AccuracyPanel() {
  const bench = useBench();
  const entered = Number(bench.massDraft);
  const grams = bench.mode === "sim" ? bench.load : entered;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Known masses</CardTitle>
          <CardDescription>
            Capture from a stream, or type mass and counts from a notebook. Empty plus two loaded masses shows whether the line misses. Unload the same masses for hysteresis. A two-point line always looks perfect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bench.mode === "sim" ? (
            <LoadSlider />
          ) : (
            <Field label="Mass on the cell, grams">
              <Input value={bench.massDraft} onChange={(event) => bench.setMassDraft(event.target.value)} inputMode="decimal" />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={bench.phase !== "streaming"} onClick={() => bench.capturePoint("zero", 0)}>
              Capture empty
            </Button>
            <Button disabled={bench.phase !== "streaming" || !Number.isFinite(grams)} onClick={() => bench.capturePoint("load", grams)}>
              Capture {Number.isFinite(grams) ? `${grams} g` : "load"}
            </Button>
            <Button variant="outline" disabled={bench.phase !== "streaming" || !Number.isFinite(grams)} onClick={() => bench.capturePoint("unload", grams)}>
              Capture unload
            </Button>
            <Button variant="outline" disabled={bench.phase !== "streaming" || !Number.isFinite(grams)} onClick={() => bench.capturePoint("repeat", grams)}>
              Repeat this mass
            </Button>
            <Button variant="outline" disabled={bench.phase !== "streaming"} onClick={() => void bench.runCreep()}>
              30 s creep hold
            </Button>
            <Button variant="ghost" onClick={bench.clearCaptures}>
              Clear
            </Button>
          </div>
          <ManualCapture />
          {bench.captures.length === 0 ? (
            <p className="text-sm text-[#5c564c]">No measurements yet. Stream and capture a still cell, or type a mass and the counts you read.</p>
          ) : (
            <CaptureTable captures={bench.captures} onRemove={bench.removeCapture} />
          )}
          {bench.creep && (
            <p className="text-sm text-[#5c564c]">
              Creep hold started at {Math.round(bench.creep.start)} counts
              {bench.creep.end === null ? " and is still running." : ` and ended at ${Math.round(bench.creep.end)} counts.`}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fit</CardTitle>
          <CardDescription>
            A pass needs R² above {GOALS.minR2} and every point within the larger of {GOALS.linearityFloorGrams} g and {(GOALS.linearityFraction * 100).toFixed(0)}% of the heaviest mass.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {bench.fit ? (
            <>
              <div className="font-mono text-2xl tabular-nums">{bench.fit.countsPerGram.toFixed(2)} ct/g</div>
              <Stat label="Offset" value={`${Math.round(bench.fit.offsetCounts)} counts`} />
              <Stat label="R²" value={bench.fit.r2.toFixed(5)} />
              <Stat label="Largest miss" value={`${bench.fit.maxAbsErrorGrams.toFixed(2)} g`} />
              <Stat label="Hysteresis" value={bench.verdict?.hysteresisGrams === null || bench.verdict?.hysteresisGrams === undefined ? "—" : `${bench.verdict.hysteresisGrams.toFixed(2)} g`} />
              <Stat label="Repeatability" value={bench.verdict?.repeatabilityGrams === null || bench.verdict?.repeatabilityGrams === undefined ? "—" : `${bench.verdict.repeatabilityGrams.toFixed(2)} g`} />
              <Stat label="Creep" value={bench.verdict?.creepGrams === null || bench.verdict?.creepGrams === undefined ? "—" : `${bench.verdict.creepGrams.toFixed(2)} g`} />
              <Badge variant={bench.verdict?.pass ? "default" : "destructive"}>{bench.verdict?.pass ? "Pass" : "Not yet"}</Badge>
              {bench.verdict?.notes.map((note) => (
                <p key={note} className="text-[#5c564c]">
                  {note}
                </p>
              ))}
              <Button className="w-full" onClick={bench.applyCalibration} disabled={!bench.fit}>
                Use this scale on the live trace
              </Button>
            </>
          ) : (
            <p className="text-[#5c564c]">Add the empty cell and at least one loaded mass. The line is counts = offset + counts-per-gram × mass.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RangePanel() {
  const bench = useBench();
  const sketch =
    bench.neckWidth != null &&
    bench.neckLength != null &&
    bench.neckCount != null &&
    bench.thicknessMm != null &&
    bench.youngMpa != null &&
    bench.gaugeFactor != null &&
    bench.bridge != null
      ? estimateScale({
          neckWidthMm: bench.neckWidth,
          neckLengthMm: bench.neckLength,
          neckCount: bench.neckCount,
          thicknessMm: bench.thicknessMm,
          youngMpa: bench.youngMpa,
          yieldMpa: bench.yieldMpa,
          gaugeFactor: bench.gaugeFactor,
          strainFraction: bench.strainFraction,
          bridge: bench.bridge,
          gain: bench.gain,
          vref: bench.vref,
        })
      : null;
  const overRated =
    bench.ratedGrams !== null && bench.rangeSteps.some((step) => step.grams > bench.ratedGrams!);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Noise floor and usable load</CardTitle>
          <CardDescription>
            Eight seconds unloaded gives the resolution, or type a noise rms you already measured. Then add loads until the ADC saturates or the zero does not come back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void bench.runNoise()} disabled={bench.mode === "idle" || bench.phase === "busy"}>
              Measure noise floor
            </Button>
            <Button variant="secondary" onClick={bench.captureRange} disabled={bench.phase !== "streaming"}>
              Record current load
            </Button>
            <Button variant="outline" onClick={bench.captureReturn} disabled={bench.phase !== "streaming"}>
              Record return to zero
            </Button>
            <Button variant="ghost" onClick={bench.clearRange}>
              Clear
            </Button>
          </div>
          {bench.mode === "sim" ? <LoadSlider /> : bench.mode === "mcu" ? (
            <Field label="Mass on the cell, grams">
              <Input value={bench.massDraft} onChange={(event) => bench.setMassDraft(event.target.value)} inputMode="decimal" />
            </Field>
          ) : null}
          <ManualRange />
          {bench.rangeSteps.length === 0 ? (
            <p className="text-sm text-[#5c564c]">No loads recorded. Measure or type the noise with the cell empty, then step up through the masses you have.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-[#6d675e] uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Mass</th>
                  <th className="py-2 pr-3 font-medium">Counts</th>
                  <th className="py-2 pr-3 font-medium">ADC</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {bench.rangeSteps.map((step, index) => (
                  <tr key={`${index}-${step.grams}-${step.counts}`} className="border-t border-[#eee6d8]">
                    <td className="py-2 pr-3 font-mono">{step.grams} g</td>
                    <td className="py-2 pr-3 font-mono">{Math.round(step.counts)}</td>
                    <td className="py-2 pr-3">{step.saturated ? "Saturated" : "Inside range"}</td>
                    <td className="py-2 text-right">
                      <button type="button" className="text-xs text-[#8a5a32] underline underline-offset-4" onClick={() => bench.removeRangeStep(index)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What it can resolve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {bench.rangeResult ? (
            <>
              <Stat label="Noise rms" value={bench.rangeResult.noiseRmsGrams !== null ? `${bench.rangeResult.noiseRmsGrams.toFixed(3)} g` : `${bench.rangeResult.noiseRmsCounts.toFixed(1)} counts`} />
              <Stat label="3-sigma resolution" value={bench.rangeResult.resolutionGrams !== null ? `${bench.rangeResult.resolutionGrams.toFixed(2)} g` : "Needs a scale"} />
              <Stat label="Highest unsaturated load" value={bench.rangeResult.maxUnsaturatedGrams === null ? "—" : `${bench.rangeResult.maxUnsaturatedGrams} g`} />
              <Stat label="Zero shift" value={bench.rangeResult.zeroShiftGrams === null ? "—" : `${bench.rangeResult.zeroShiftGrams.toFixed(2)} g`} />
              <div className="flex flex-wrap gap-2">
                <Badge variant={bench.rangeResult.probeReady ? "default" : "outline"}>
                  {bench.rangeResult.probeReady ? "Probe candidate" : "Not a probe candidate yet"}
                </Badge>
                <Badge variant={bench.rangeResult.forceReady ? "default" : "outline"}>
                  {bench.rangeResult.forceReady ? "Force-trace candidate" : "Too noisy for pressure advance"}
                </Badge>
              </div>
              {bench.rangeResult.notes.map((note) => (
                <p key={note} className="text-[#5c564c]">
                  {note}
                </p>
              ))}
            </>
          ) : (
            <p className="text-[#5c564c]">The noise measurement fills this in. Probing wants about {GOALS.probeNoiseGrams} g of 3-sigma noise and {GOALS.probeMinHz} Hz. A force trace for pressure advance wants closer to {GOALS.forceNoiseGrams} g and {GOALS.forceMinHz} Hz.</p>
          )}
          <Separator />
          {bench.ratedGrams !== null && (
            <p className="text-xs text-[#6d675e]">
              Rated capacity you entered: {bench.ratedGrams.toLocaleString()} g.
              {overRated ? " A recorded load is past that. The return-to-zero row is what tells you the cell took a set." : " Stay under it until a return-to-zero says the cell came back."}
            </p>
          )}
          {bench.noiseRmsEntered !== null && (
            <p className="text-xs text-[#6d675e]">Noise rms is the {bench.noiseRmsEntered.toFixed(1)} counts you typed. Measuring the floor replaces it.</p>
          )}
          {sketch?.yieldKg != null && bench.neckWidth != null && bench.neckLength != null && bench.neckCount != null && bench.thicknessMm != null && bench.materialId && (
            <p className="text-xs text-[#6d675e]">
              Optional leaf sketch in {materialById(bench.materialId).name}, {bench.neckCount} necks {bench.neckWidth.toFixed(1)} mm by {bench.neckLength.toFixed(0)} mm, {bench.thicknessMm.toFixed(2)} mm thick: about {sketch.yieldKg.toFixed(1)} kg before the material yields. That figure is only a ceiling for a leaf flexure.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BuildPanel() {
  const bench = useBench();
  const hasScale = bench.scaleSource === "calibration" || bench.scaleSource === "entered";
  const snippet = printerSnippet({
    front: bench.front,
    cellName: bench.cellName,
    gain: bench.gain,
    sampleRate: bench.sampleRate,
    vref: bench.vref,
    countsPerGram: hasScale ? bench.countsPerGram : null,
    tareCounts: hasScale ? bench.tare : null,
  });
  const fileSlug = bench.cellName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "loadcell";
  return (
    <div className="space-y-4">
      <SketchUpload />
      <BendingCalculator />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cell you are testing</CardTitle>
            <CardDescription>
              Any foil-gauge cell. Name it, pick the alloy and the gauge on the sketch, and type a scale if you already know counts per gram. Accuracy and Range can take mass-and-count rows without a stream.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Name">
              <Input value={bench.cellName} onChange={(event) => bench.setCellName(event.target.value)} />
            </Field>
            <Field label="Rated capacity, grams">
              <Input
                type="number"
                min={0}
                step="10"
                placeholder="optional"
                value={bench.ratedGrams ?? ""}
                onChange={(event) => bench.setRatedGrams(event.target.value === "" ? null : Number(event.target.value))}
              />
            </Field>
            <EnteredScaleForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gauge on that flexure</CardTitle>
            <CardDescription>
              {bench.gaugeMount === "back-to-back"
                ? "Gauges sit back to back, one on each face of a neck."
                : bench.gaugeMount === "same-face"
                  ? "Gauges sit on one face. The bending calculator supplies the alloy and the neck size."
                  : "Choose the foil and how the bridge is wired. The bending calculator supplies the alloy and the neck size."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Strain gauge">
              <NativeSelect value={bench.gaugeId} onChange={bench.setGaugeId}>
                <option value="">Choose a gauge</option>
                {GAUGE_PRESETS.map((gauge) => (
                  <option key={gauge.id} value={gauge.id}>
                    {gauge.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {bench.gaugeId && <p className="text-xs text-[#5c564c]">{gaugeById(bench.gaugeId).note}</p>}
            <Field label="Bridge">
              <NativeSelect value={bench.bridge ?? ""} onChange={(value) => bench.setBridge(value === "" ? null : (value as BridgeKind))}>
                <option value="">Choose a bridge</option>
                <option value="full">Full bridge, 4 active gauges</option>
                <option value="half">Half bridge, 2 active gauges</option>
                <option value="quarter">Quarter bridge, 1 active gauge</option>
              </NativeSelect>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Gauge factor">
                <Input
                  type="number"
                  step="0.01"
                  min={0.1}
                  placeholder="from the package"
                  value={bench.gaugeFactor ?? ""}
                  onChange={(event) => bench.setGaugeFactor(event.target.value === "" ? null : Number(event.target.value))}
                />
              </Field>
              <Field label="Resistance, ohms">
                <Input
                  type="number"
                  step="1"
                  min={1}
                  placeholder="from the package"
                  value={bench.resistanceOhm ?? ""}
                  onChange={(event) => bench.setResistanceOhm(event.target.value === "" ? null : Number(event.target.value))}
                />
              </Field>
              <Field label="Grid length, mm">
                <Input
                  type="number"
                  step="0.1"
                  min={0.2}
                  placeholder="along the neck"
                  value={bench.gridLengthMm ?? ""}
                  onChange={(event) => bench.setGridLengthMm(event.target.value === "" ? null : Number(event.target.value))}
                />
              </Field>
              <Field label="Grid width, mm">
                <Input
                  type="number"
                  step="0.1"
                  min={0.2}
                  value={bench.gridWidthMm ?? ""}
                  onChange={(event) => bench.setGridWidthMm(event.target.value === "" ? null : Number(event.target.value))}
                />
              </Field>
              <Field label="Share of peak strain">
                <Input type="number" step="0.05" min={0.05} max={1} value={bench.strainFraction} onChange={(event) => bench.setStrainFraction(Number(event.target.value) || 1)} />
              </Field>
            </div>
            <p className="text-xs text-[#5c564c]">
              {rootGridFraction(bench.gridLengthMm ?? 0, bench.neckLength ?? 0) === null
                ? "The grid is longer than half the neck, or a length is blank. The sketch uses the peak strain until you type the share the foil actually averages."
                : `A grid this long, bonded at the root, averages about ${((rootGridFraction(bench.gridLengthMm ?? 0, bench.neckLength ?? 0) ?? 1) * 100).toFixed(0)}% of the peak.`}
              {" "}Resistance does not change counts per gram. It sets how warm the foil gets at a given excitation.
            </p>
            <SketchPreview />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={bench.applyRootGridFraction}>
                Use root-grid average
              </Button>
              <Button variant="outline" className="flex-1" onClick={bench.useSketchScale}>
                Use this sketch as the live scale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On the printer, after this bench passes</CardTitle>
          <CardDescription>
            Klipper on the printer takes the USB port. Close this bench first. Probing and pressure advance are not run from here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#3c3832]">
          <ol className="list-decimal space-y-2 pl-5">
            {bench.front.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <pre className="overflow-auto rounded-lg bg-[#1c1915] p-3 font-mono text-[11px] leading-relaxed text-[#f3efe6]">{snippet}</pre>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([snippet], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${fileSlug}.cfg`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download config snippet
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">The Custom K2 Loadcell, as a worked example</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#5c564c]">
            The Custom K2 Loadcell is 38.0 × 24.0 mm, 0.100 in 6061-T6, four necks, four BA1000-3AA gauges on one face. The photos and the cut file below are that cell.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-xl border border-[#e0d8cc] bg-white">
            <div className="relative aspect-[4/3] w-full">
              <Image src="/cell/gauges.jpg" alt="Four BA1000-3AA gauges bonded to the flexure arms with Loctite 401, red jumper wires, and a four-conductor cable" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
            </div>
            <figcaption className="px-3 py-2 text-xs text-[#5c564c]">Gauges bonded with Loctite 401. All four are on this face of the Custom K2 Loadcell.</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-xl border border-[#e0d8cc] bg-white">
            <div className="relative aspect-[4/3] w-full">
              <Image src="/cell/coated.jpg" alt="The same loadcell after the gauges and wiring were covered in grey Loctite 9460 epoxy" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
            </div>
            <figcaption className="px-3 py-2 text-xs text-[#5c564c]">Loctite 9460 over the gauges and the jumper wires. Let it finish curing before you trust a zero.</figcaption>
          </figure>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cut file</CardTitle>
              <CardDescription>The closed paths inside the outline are the laser cuts: triangular windows, the lower slot, and the mounting holes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CellOutline className="w-full rounded-lg border border-[#e4ddd0] bg-[#f6f3ec]" />
              <a className="text-sm text-[#8a5a32] underline underline-offset-4" href="/cell/NewLoadcell.dxf" download>
                Download NewLoadcell.dxf
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This bridge</CardTitle>
            </CardHeader>
            <CardContent>
              <BridgeNotes />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CellLibrary() {
  const bench = useBench();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2 rounded-lg border border-[#e4ddd0] bg-[#f7f4ee] p-3">
      <p className="text-sm text-[#3c3832]">Save this cell to a file, then upload it the next time you test. A copy also stays in this browser.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={bench.saveCurrentCell}>
          Save this cell
        </Button>
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
          Upload a cell file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void file.text().then((text) => bench.loadCellFileText(text));
          }}
        />
      </div>
      {bench.savedCells.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bench.savedCells.map((cell) => (
            <span key={cell.id} className="inline-flex items-center gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => bench.applySavedCell(cell.id)}>
                {cell.file.name.trim() || "Untitled cell"}
              </Button>
              <button type="button" className="text-xs text-[#8a5a32] underline underline-offset-4" onClick={() => bench.removeSavedCell(cell.id)}>
                Remove
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BendingCalculator() {
  const bench = useBench();
  const bend =
    bench.neckWidth != null && bench.neckLength != null && bench.neckCount != null && bench.thicknessMm != null && bench.youngMpa != null
      ? bendingStiffness({
          youngMpa: bench.youngMpa,
          yieldMpa: bench.yieldMpa,
          thicknessMm: bench.thicknessMm,
          neckWidthMm: bench.neckWidth,
          neckLengthMm: bench.neckLength,
          neckCount: bench.neckCount,
        })
      : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bending calculator</CardTitle>
        <CardDescription>
          Guided necks bending out of the plate. Pick a load-cell alloy, the thickness, and the neck size. Stiffness is E × count × width × thickness³ / length³.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          {CELL_PROFILES.map((profile) => (
            <Button
              key={profile.id}
              variant={bench.cellProfileId === profile.id ? "default" : "outline"}
              className="flex-1"
              onClick={() => bench.setCellProfileId(profile.id)}
            >
              {profile.name}
            </Button>
          ))}
        </div>
        <p className="text-xs text-[#5c564c]">{cellProfileById(bench.cellProfileId).note}</p>
        <CellLibrary />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Material">
            <NativeSelect value={bench.materialId} onChange={bench.setMaterialId}>
              <option value="">Choose a material</option>
              {MATERIALS.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Young's modulus, MPa">
            <Input
              type="number"
              step="100"
              min={1}
              placeholder="from the alloy sheet"
              value={bench.youngMpa ?? ""}
              onChange={(event) => bench.setYoungMpa(event.target.value === "" ? null : Number(event.target.value))}
            />
          </Field>
          <Field label="Thickness, mm">
            <Input
              type="number"
              step="0.01"
              min={0.2}
              placeholder="blank"
              value={bench.thicknessMm ?? ""}
              onChange={(event) => bench.setThicknessMm(event.target.value === "" ? null : Number(event.target.value))}
            />
          </Field>
          <Field label="Neck count">
            <Input
              type="number"
              step="1"
              min={1}
              placeholder="blank"
              value={bench.neckCount ?? ""}
              onChange={(event) => bench.setNeckCount(event.target.value === "" ? null : Number(event.target.value))}
            />
          </Field>
          <Field label="Neck width, mm">
            <Input
              type="number"
              step="0.1"
              min={0.2}
              placeholder="unknown"
              value={bench.neckWidth ?? ""}
              onChange={(event) => bench.setNeckWidth(event.target.value === "" ? null : Number(event.target.value))}
            />
          </Field>
          <Field label="Neck length, mm">
            <Input
              type="number"
              step="0.5"
              min={0.5}
              placeholder="unknown"
              value={bench.neckLength ?? ""}
              onChange={(event) => bench.setNeckLength(event.target.value === "" ? null : Number(event.target.value))}
            />
          </Field>
          <Field label="Yield strength, MPa">
            <Input
              type="number"
              step="1"
              min={1}
              placeholder="unknown"
              value={bench.yieldMpa ?? ""}
              onChange={(event) => bench.setYieldMpa(event.target.value === "" ? null : Number(event.target.value))}
            />
          </Field>
        </div>
        <p className="text-xs text-[#5c564c]">{bench.materialId ? materialById(bench.materialId).note : "Pick the alloy this flexure is cut from, or type a modulus and a yield."}</p>
        {bend ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Young's modulus" value={`${bend.youngGpa.toFixed(1)} GPa`} />
            <Stat label="Bending stiffness" value={`${bend.stiffnessKgPerMm.toFixed(0)} kg/mm`} />
            <Stat label="Flexural rigidity" value={`${bend.flexuralRigidityNm2.toFixed(3)} N·m²`} />
            <Stat label="Yield load" value={bend.yieldKg == null ? "Needs a yield" : `${bend.yieldKg.toFixed(1)} kg`} />
          </div>
        ) : (
          <p className="text-sm text-[#5c564c]">
            {bench.neckWidth == null || bench.neckLength == null
              ? "Neck width and length are blank, so the stiffness is not invented. Type them, or measure them on the sketch."
              : "Pick a material or type a modulus, plus a thickness and a neck count, before the stiffness can be calculated."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SketchPreview() {
  const bench = useBench();
  if (
    bench.neckWidth == null ||
    bench.neckLength == null ||
    bench.neckCount == null ||
    bench.thicknessMm == null ||
    bench.youngMpa == null ||
    bench.gaugeFactor == null ||
    bench.bridge == null
  ) {
    return <p className="text-sm text-[#5c564c]">The leaf scale waits for a material, a thickness, a neck size, and a gauge factor.</p>;
  }
  const sketch = estimateScale({
    neckWidthMm: bench.neckWidth,
    neckLengthMm: bench.neckLength,
    neckCount: bench.neckCount,
    thicknessMm: bench.thicknessMm,
    youngMpa: bench.youngMpa,
    yieldMpa: bench.yieldMpa,
    gaugeFactor: bench.gaugeFactor,
    strainFraction: bench.strainFraction,
    bridge: bench.bridge,
    gain: bench.gain,
    vref: bench.vref,
  });
  return (
    <p className="font-mono text-sm tabular-nums text-[#3c3832]">
      Sketch {sketch.countsPerGram.toFixed(1)} ct/g at gain {bench.gain}.
      {sketch.yieldKg == null ? " Yield is not set." : ` Yield about ${sketch.yieldKg.toFixed(1)} kg.`}
    </p>
  );
}

function EnteredScaleForm() {
  const bench = useBench();
  const [cpg, setCpg] = useState(() => (bench.countsPerGram === null ? "" : String(bench.countsPerGram)));
  const [tare, setTare] = useState(() => (bench.tare === null ? "" : String(Math.round(bench.tare))));
  const live =
    bench.countsPerGram !== null &&
    bench.tare !== null &&
    (bench.scaleSource === "entered" || bench.scaleSource === "calibration");
  return (
    <div className="space-y-3 rounded-lg border border-[#e4ddd0] bg-[#f7f4ee] p-3">
      <p className="text-sm text-[#3c3832]">Type a scale you already trust. The simulator and the live grams follow it instead of the leaf sketch. A blank field keeps the number already in use.</p>
      <Field label="Counts per gram">
        <Input value={cpg} inputMode="decimal" placeholder="e.g. 40" onChange={(event) => setCpg(event.target.value)} />
      </Field>
      <Field label="Tare counts">
        <Input value={tare} inputMode="decimal" placeholder="empty-cell counts" onChange={(event) => setTare(event.target.value)} />
      </Field>
      <Button
        className="w-full"
        variant="secondary"
        onClick={() =>
          bench.applyEnteredScale(
            cpg.trim() === "" ? (bench.countsPerGram ?? Number.NaN) : Number(cpg),
            tare.trim() === "" ? (bench.tare ?? Number.NaN) : Number(tare),
          )
        }
      >
        Use this scale
      </Button>
      {live && (
        <p className="text-xs text-[#5c564c]">
          Live scale is {bench.countsPerGram!.toFixed(2)} ct/g, tare {Math.round(bench.tare!).toLocaleString()} counts.
        </p>
      )}
    </div>
  );
}

function ManualCapture() {
  const bench = useBench();
  const [kind, setKind] = useState<Capture["kind"]>("load");
  const [grams, setGrams] = useState("100");
  const [counts, setCounts] = useState("");
  return (
    <div className="space-y-3 rounded-lg border border-[#e4ddd0] p-3">
      <p className="text-sm text-[#3c3832]">Add a row by hand. Empty forces the mass to 0 g. Counts are the signed reading after invert, if you use it.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kind">
          <NativeSelect value={kind} onChange={(value) => setKind(value as Capture["kind"])}>
            <option value="zero">Empty</option>
            <option value="load">Load</option>
            <option value="unload">Unload</option>
            <option value="repeat">Repeat</option>
          </NativeSelect>
        </Field>
        <Field label="Mass, grams">
          <Input value={kind === "zero" ? "0" : grams} disabled={kind === "zero"} inputMode="decimal" onChange={(event) => setGrams(event.target.value)} />
        </Field>
        <Field label="Counts">
          <Input value={counts} inputMode="decimal" placeholder="e.g. 5200" onChange={(event) => setCounts(event.target.value)} />
        </Field>
      </div>
      <Button
        variant="secondary"
        onClick={() => bench.insertCapture(kind, kind === "zero" ? 0 : Number(grams), counts.trim() === "" ? Number.NaN : Number(counts))}
      >
        Add measurement
      </Button>
    </div>
  );
}

function ManualRange() {
  const bench = useBench();
  const [grams, setGrams] = useState("500");
  const [counts, setCounts] = useState("");
  const [saturated, setSaturated] = useState(false);
  const [rms, setRms] = useState("");
  return (
    <div className="space-y-3 rounded-lg border border-[#e4ddd0] p-3">
      <p className="text-sm text-[#3c3832]">Or type a load point and a noise figure. A measured 8 second floor replaces a typed noise rms.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mass, grams">
          <Input value={grams} inputMode="decimal" onChange={(event) => setGrams(event.target.value)} />
        </Field>
        <Field label="Counts">
          <Input value={counts} inputMode="decimal" placeholder="mean counts at that mass" onChange={(event) => setCounts(event.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-[#3c3832]">
        <input type="checkbox" checked={saturated} onChange={(event) => setSaturated(event.target.checked)} />
        ADC was on the rail at this mass
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => bench.insertRangeStep(Number(grams), counts.trim() === "" ? Number.NaN : Number(counts), saturated)}
        >
          Add load point
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="Noise rms, counts">
            <Input value={rms} inputMode="decimal" placeholder="unloaded scatter" onChange={(event) => setRms(event.target.value)} />
          </Field>
        </div>
        <Button variant="outline" onClick={() => bench.useEnteredNoise(rms.trim() === "" ? Number.NaN : Number(rms))}>
          Use this noise
        </Button>
      </div>
    </div>
  );
}

function BridgeNotes() {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-[#5c564c]">
      <p>The Custom K2 Loadcell uses four 1000 Ω gauges, gauge factor about 2.0, as a full bridge of two in tension and two in compression. Another cell can be a half or quarter bridge, or a different foil. The cable in the photos is red, green, blue, and black. Land those on the Plimsoll E+, E−, S+, and S− pads.</p>
      <p>If pressing the nozzle side drives the live reading the wrong way, turn on Invert sign. Do not swap excitation with signal.</p>
      <p>Loctite 401 grabs fast and creeps. Loctite 9460 protects the grid and also changes the stiffness until it has cured. The 30 second hold is there to show that, not to hide it.</p>
      <svg viewBox="0 0 220 120" className="mt-2 w-full rounded-md border border-[#e4ddd0] bg-[#f7f4ee]" aria-label="Full bridge wiring">
        <text x="110" y="14" textAnchor="middle" fontSize="10" fill="#5c564c">Full bridge, looking from the ADC</text>
        <line x1="40" y1="30" x2="180" y2="30" stroke="#1c1915" />
        <line x1="40" y1="90" x2="180" y2="90" stroke="#1c1915" />
        <line x1="40" y1="30" x2="40" y2="90" stroke="#1c1915" />
        <line x1="180" y1="30" x2="180" y2="90" stroke="#1c1915" />
        <text x="28" y="64" fontSize="9" fill="#8a5a32">E−</text>
        <text x="184" y="64" fontSize="9" fill="#8a5a32">E+</text>
        <text x="100" y="26" textAnchor="middle" fontSize="9" fill="#1c1915">S+</text>
        <text x="100" y="104" textAnchor="middle" fontSize="9" fill="#1c1915">S−</text>
        <text x="70" y="48" fontSize="8" fill="#5c564c">tension</text>
        <text x="118" y="48" fontSize="8" fill="#5c564c">compression</text>
        <text x="70" y="80" fontSize="8" fill="#5c564c">compression</text>
        <text x="118" y="80" fontSize="8" fill="#5c564c">tension</text>
      </svg>
    </div>
  );
}

function CaptureTable({ captures, onRemove }: { captures: Capture[]; onRemove: (id: number) => void }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs tracking-wide text-[#6d675e] uppercase">
        <tr>
          <th className="py-2 pr-3 font-medium">Kind</th>
          <th className="py-2 pr-3 font-medium">Mass</th>
          <th className="py-2 pr-3 font-medium">Counts</th>
          <th className="py-2 pr-3 font-medium">Scatter</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {captures.map((capture) => (
          <tr key={capture.id} className="border-t border-[#eee6d8]">
            <td className="py-2 pr-3 capitalize">{capture.kind}</td>
            <td className="py-2 pr-3 font-mono">{capture.grams} g</td>
            <td className="py-2 pr-3 font-mono">{Math.round(capture.counts)}</td>
            <td className="py-2 pr-3 font-mono">{capture.n <= 1 && capture.stdev === 0 ? "—" : capture.stdev.toFixed(0)}</td>
            <td className="py-2 text-right">
              <button type="button" className="text-xs text-[#8a5a32] underline underline-offset-4" onClick={() => onRemove(capture.id)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScoreDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" />}>How a pass is decided</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What the three tests are willing to call good</DialogTitle>
          <DialogDescription>
            These bars are for a DIY cell glued with cyanoacrylate, not for a metrology load cell.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-[#3c3832]">
          <p>Speed passes when the delivered rate is within {(GOALS.rateTolerance * 100).toFixed(0)}% of the ADS1220 setting, the MCU reports no overflows, no bulk blocks go missing, and the counts are not stuck on one value.</p>
          <p>Accuracy passes when the line through the captures has R² of at least {GOALS.minR2} and no point misses by more than {GOALS.linearityFloorGrams} g or {(GOALS.linearityFraction * 100).toFixed(0)}% of the heaviest mass. Hysteresis above {(GOALS.hysteresisFraction * 100).toFixed(0)}% is called out. It does not have to be zero.</p>
          <p>Range is a probe candidate under about {GOALS.probeNoiseGrams} g of 3-sigma noise at {GOALS.probeMinHz} Hz or faster, with the zero coming back. A force trace for pressure advance wants about {GOALS.forceNoiseGrams} g and {GOALS.forceMinHz} Hz.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  disabled,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 ${className ?? "w-full"} rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50`}
    >
      {children}
    </select>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-[#6d675e] uppercase">{label}</div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}

function fmtCounts(n: number): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 100000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}
