"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  analyzeRange,
  analyzeRate,
  captureMean,
  collectSamples,
  fitLine,
  hysteresisOf,
  judgeAccuracy,
  mean,
  rollingRate,
  stdev,
  windowDrift,
  windowTail,
  type AccuracyVerdict,
  type Fit,
  type RangeResult,
  type Sample,
  type SpeedResult,
  type StreamOptions,
} from "@/lib/analyze";
import { isSaturated } from "@/lib/ads1220";
import { H36Session } from "@/lib/klipper/session";
import { FRONTS, frontById, type FrontEnd } from "@/lib/frontends";
import { CELL, cellProfileById, estimateScale, gaugeById, materialById, rootGridFraction, type BridgeKind, type GaugeMount } from "@/lib/model";
import { SimulatorSource } from "@/lib/simulator";

export type Phase = "idle" | "connecting" | "ready" | "streaming" | "busy";
export type ScaleSource = "none" | "sketch" | "calibration" | "entered";
export type Vref = "internal" | "analog_supply";

export type Capture = {
  id: number;
  kind: "zero" | "load" | "unload" | "repeat";
  grams: number;
  counts: number;
  stdev: number;
  n: number;
};

export type RangeStep = { grams: number; counts: number; saturated: boolean; stdev: number };

type Source = {
  kind: "mcu" | "simulator";
  start(opts: StreamOptions): Promise<void>;
  stop(): Promise<void>;
  subscribe(cb: (batch: Sample[]) => void): () => void;
  overflows: number;
  gaps: number;
  errors: number;
  setLoad?(grams: number): void;
};

type BenchApi = {
  mode: "idle" | "sim" | "mcu";
  front: FrontEnd;
  setFront: (id: string) => void;
  phase: Phase;
  error: string | null;
  log: string[];
  mcuLine: string;
  gain: number;
  setGain: (gain: number) => void;
  sampleRate: number;
  setSampleRate: (rate: number) => void;
  vref: Vref;
  setVref: (vref: Vref) => void;
  invert: boolean;
  setInvert: (invert: boolean) => void;
  tare: number | null;
  countsPerGram: number | null;
  scaleSource: ScaleSource;
  load: number;
  setLoad: (grams: number) => void;
  neckWidth: number | null;
  setNeckWidth: (mm: number | null) => void;
  neckLength: number | null;
  setNeckLength: (mm: number | null) => void;
  neckCount: number;
  setNeckCount: (count: number) => void;
  cellName: string;
  setCellName: (name: string) => void;
  thicknessMm: number;
  setThicknessMm: (mm: number) => void;
  youngMpa: number;
  setYoungMpa: (mpa: number) => void;
  yieldMpa: number | null;
  setYieldMpa: (mpa: number | null) => void;
  cellProfileId: string;
  setCellProfileId: (id: string) => void;
  gaugeMount: GaugeMount;
  gaugeFactor: number;
  setGaugeFactor: (factor: number) => void;
  materialId: string;
  setMaterialId: (id: string) => void;
  gaugeId: string;
  setGaugeId: (id: string) => void;
  resistanceOhm: number | null;
  setResistanceOhm: (ohm: number | null) => void;
  gridLengthMm: number | null;
  setGridLengthMm: (mm: number | null) => void;
  gridWidthMm: number | null;
  setGridWidthMm: (mm: number | null) => void;
  bridge: BridgeKind;
  setBridge: (bridge: BridgeKind) => void;
  strainFraction: number;
  setStrainFraction: (fraction: number) => void;
  applyRootGridFraction: () => void;
  ratedGrams: number | null;
  setRatedGrams: (grams: number | null) => void;
  insertCapture: (kind: Capture["kind"], grams: number, counts: number) => void;
  removeCapture: (id: number) => void;
  insertRangeStep: (grams: number, counts: number, saturated: boolean) => void;
  removeRangeStep: (index: number) => void;
  useEnteredNoise: (rmsCounts: number) => void;
  noiseRmsEntered: number | null;
  applyEnteredScale: (countsPerGram: number, tareCounts: number) => void;
  useSketchScale: () => void;
  samples: Sample[];
  rate: number | null;
  latestCounts: number | null;
  latestGrams: number | null;
  noiseCounts: number | null;
  noiseGrams: number | null;
  overflows: number;
  gaps: number;
  linkErrors: number;
  saturatedNow: boolean;
  busyLabel: string;
  connectSim: () => void;
  connectBoard: () => Promise<void>;
  disconnect: () => Promise<void>;
  startStream: () => Promise<void>;
  stopStream: () => Promise<void>;
  tareNow: () => void;
  autoGain: () => Promise<void>;
  speedRates: number[];
  toggleRate: (rate: number) => void;
  speedSeconds: number;
  setSpeedSeconds: (seconds: number) => void;
  speedResults: SpeedResult[];
  runSpeed: () => Promise<void>;
  captures: Capture[];
  massDraft: string;
  setMassDraft: (value: string) => void;
  capturePoint: (kind: Capture["kind"], grams: number) => void;
  clearCaptures: () => void;
  creepSeconds: number;
  creep: { start: number; end: number | null } | null;
  runCreep: () => Promise<void>;
  fit: Fit | null;
  verdict: AccuracyVerdict | null;
  applyCalibration: () => void;
  rangeSteps: RangeStep[];
  rangeResult: RangeResult | null;
  runNoise: () => Promise<void>;
  captureRange: () => void;
  captureReturn: () => void;
  clearRange: () => void;
  noiseFloor: number[] | null;
  zeroCounts: number | null;
  returnCounts: number | null;
  downloadCsv: () => void;
  webSerial: boolean;
};

const Ctx = createContext<BenchApi | null>(null);

export function useBench(): BenchApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("Bench controls are outside the bench");
  return value;
}

const SPEED_DEFAULT = [90, 175, 330, 660];

export function BenchProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<BenchApi["mode"]>("idle");
  const [front, setFrontState] = useState<FrontEnd>(FRONTS[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [mcuLine, setMcuLine] = useState("");
  const [gain, setGainState] = useState(64);
  const [sampleRate, setSampleRateState] = useState(330);
  const [vref, setVrefState] = useState<Vref>("internal");
  const [invert, setInvertState] = useState(false);
  const [tare, setTare] = useState<number | null>(null);
  const [countsPerGram, setCountsPerGram] = useState<number | null>(null);
  const [scaleSource, setScaleSource] = useState<ScaleSource>("none");
  const [load, setLoadState] = useState(0);
  const [neckWidth, setNeckWidthState] = useState<number | null>(CELL.defaultNeckWidthMm);
  const [neckLength, setNeckLengthState] = useState<number | null>(CELL.defaultNeckLengthMm);
  const [neckCount, setNeckCountState] = useState(CELL.defaultNeckCount);
  const [cellName, setCellName] = useState(CELL.name);
  const [thicknessMm, setThicknessMm] = useState(CELL.thicknessMm);
  const [youngMpa, setYoungMpa] = useState(CELL.youngMpa);
  const [yieldMpa, setYieldMpa] = useState<number | null>(CELL.yieldMpa);
  const [gaugeFactor, setGaugeFactor] = useState(CELL.gauge.gaugeFactor);
  const [materialId, setMaterialIdState] = useState("6061-t6");
  const [cellProfileId, setCellProfileId] = useState("custom-k2");
  const [gaugeMount, setGaugeMount] = useState<GaugeMount>("same-face");
  const [gaugeId, setGaugeIdState] = useState("ba1000-3aa");
  const [resistanceOhm, setResistanceOhm] = useState<number | null>(CELL.gauge.resistanceOhm);
  const [gridLengthMm, setGridLengthMm] = useState<number | null>(CELL.gauge.gridMm[1]);
  const [gridWidthMm, setGridWidthMm] = useState<number | null>(CELL.gauge.gridMm[0]);
  const [bridge, setBridge] = useState<BridgeKind>("full");
  const [strainFraction, setStrainFractionState] = useState(1);
  const [ratedGrams, setRatedGrams] = useState<number | null>(null);
  const [noiseRmsEntered, setNoiseRmsEntered] = useState<number | null>(null);
  const [rev, setRev] = useState(0);
  const [busyLabel, setBusyLabel] = useState("");
  const [speedRates, setSpeedRates] = useState<number[]>(SPEED_DEFAULT);
  const [speedSeconds, setSpeedSeconds] = useState(4);
  const [speedResults, setSpeedResults] = useState<SpeedResult[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [massDraft, setMassDraft] = useState("100");
  const [creep, setCreep] = useState<{ start: number; end: number | null } | null>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [verdict, setVerdict] = useState<AccuracyVerdict | null>(null);
  const [rangeSteps, setRangeSteps] = useState<RangeStep[]>([]);
  const [rangeResult, setRangeResult] = useState<RangeResult | null>(null);
  const [noiseFloor, setNoiseFloor] = useState<number[] | null>(null);
  const [zeroCounts, setZeroCounts] = useState<number | null>(null);
  const [returnCounts, setReturnCounts] = useState<number | null>(null);
  const [webSerial, setWebSerial] = useState(false);

  const samplesRef = useRef<Sample[]>([]);
  const dirtyRef = useRef(false);
  const sourceRef = useRef<Source | null>(null);
  const simRef = useRef<SimulatorSource | null>(null);
  const h36Ref = useRef<H36Session | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const abortRef = useRef(false);
  const gainRef = useRef(gain);
  const frontRef = useRef(front);
  const rateRef = useRef(sampleRate);
  const vrefRef = useRef(vref);
  const invertRef = useRef(invert);
  const neckWRef = useRef(neckWidth);
  const neckLRef = useRef(neckLength);
  const scaleSourceRef = useRef(scaleSource);
  const idRef = useRef(1);
  gainRef.current = gain;
  frontRef.current = front;
  rateRef.current = sampleRate;
  vrefRef.current = vref;
  invertRef.current = invert;
  neckWRef.current = neckWidth;
  neckLRef.current = neckLength;
  scaleSourceRef.current = scaleSource;

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-40), line]);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setRev((n) => n + 1);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setWebSerial("serial" in navigator);
  }, []);

  const geometry = useMemo(() => {
    if (neckWidth == null || neckLength == null || !(neckWidth > 0) || !(neckLength > 0)) return null;
    return {
      neckWidthMm: neckWidth,
      neckLengthMm: neckLength,
      neckCount,
      thicknessMm,
      youngMpa,
      yieldMpa,
      gaugeFactor,
      strainFraction,
      bridge,
    };
  }, [neckWidth, neckLength, neckCount, thicknessMm, youngMpa, yieldMpa, gaugeFactor, strainFraction, bridge]);
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;
  const cellProfileRef = useRef(cellProfileId);
  cellProfileRef.current = cellProfileId;
  const cpgRef = useRef(countsPerGram);
  cpgRef.current = countsPerGram;

  const sketch = useMemo(
    () => (geometry ? estimateScale({ ...geometry, gain, vref }) : null),
    [geometry, gain, vref],
  );

  useEffect(() => {
    simRef.current?.setGeometry(geometry);
    if (scaleSource !== "sketch") return;
    if (sketch) setCountsPerGram(sketch.countsPerGram);
    else setCountsPerGram(null);
  }, [geometry, sketch, scaleSource]);

  useEffect(() => {
    if (scaleSource === "sketch") simRef.current?.setSensitivity(null);
    else if (countsPerGram) simRef.current?.setSensitivity(countsPerGram);
  }, [scaleSource, countsPerGram]);

  const attach = useCallback((source: Source) => {
    unsubRef.current?.();
    unsubRef.current = source.subscribe((batch) => {
      const buf = samplesRef.current;
      for (const sample of batch) buf.push(sample);
      if (buf.length > 24000) buf.splice(0, buf.length - 20000);
      dirtyRef.current = true;
    });
  }, []);

  const opts = useCallback((): StreamOptions => {
    return { gain: gainRef.current, sampleRate: rateRef.current, vref: vrefRef.current };
  }, []);

  const signedMean = useCallback((samples: Sample[]) => {
    const sign = invertRef.current ? -1 : 1;
    const stats = captureMean(samples, 1.2);
    if (!stats) return null;
    return { ...stats, mean: stats.mean * sign, stdev: stats.stdev };
  }, []);

  const stopQuiet = useCallback(async () => {
    try {
      await sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const disconnect = useCallback(async () => {
    abortRef.current = true;
    await stopQuiet();
    unsubRef.current?.();
    unsubRef.current = null;
    try {
      await h36Ref.current?.close();
    } catch {
      /* port already closed */
    }
    h36Ref.current = null;
    simRef.current = null;
    sourceRef.current = null;
    samplesRef.current = [];
    setMode("idle");
    setPhase("idle");
    setMcuLine("");
    dirtyRef.current = true;
  }, [stopQuiet]);

  const connectSim = useCallback(() => {
    void (async () => {
      await disconnect();
      const sim = new SimulatorSource();
      sim.setGeometry(geometryRef.current);
      simRef.current = sim;
      sourceRef.current = sim;
      setMode("sim");
      setPhase("ready");
      setError(null);
      const keepScale = scaleSourceRef.current === "entered" || scaleSourceRef.current === "calibration";
      const ready = geometryRef.current;
      if (!keepScale) {
        setTare(null);
        if (!ready) {
          setScaleSource("none");
          setCountsPerGram(null);
          sim.setSensitivity(null);
        } else {
          setScaleSource("sketch");
          const cpg = estimateScale({ ...ready, gain: gainRef.current, vref: vrefRef.current }).countsPerGram;
          setCountsPerGram(cpg);
          sim.setSensitivity(null);
        }
      } else if (cpgRef.current) {
        sim.setSensitivity(cpgRef.current);
      }
      const profileName = cellProfileById(cellProfileRef.current).name;
      pushLog(
        keepScale
          ? `Simulator is on for ${frontRef.current.label}, using the scale you entered.`
          : ready
            ? `Simulator is on for ${frontRef.current.label}. Grams use the ${profileName} leaf sketch until you enter a scale or run Accuracy.`
            : `Simulator is on for ${frontRef.current.label}. ${profileName} has no published neck size, so grams wait for a neck width and length or a scale you type.`,
      );
    })();
  }, [disconnect, pushLog]);

  const setFront = useCallback((id: string) => {
    if (sourceRef.current) return;
    const next = frontById(id);
    setFrontState(next);
    frontRef.current = next;
    setGainState(next.defaultGain);
    gainRef.current = next.defaultGain;
    setSampleRateState(next.defaultRate);
    rateRef.current = next.defaultRate;
    setVrefState(next.vref);
    vrefRef.current = next.vref;
    setSpeedRates(next.speedRates);
    setSpeedResults([]);
    setCaptures([]);
    setFit(null);
    setVerdict(null);
    setCreep(null);
    setRangeSteps([]);
    setRangeResult(null);
    setNoiseFloor(null);
    setNoiseRmsEntered(null);
    setZeroCounts(null);
    setReturnCounts(null);
    setError(null);
  }, []);

  const connectH36 = useCallback(async () => {
    if (!("serial" in navigator)) {
      setError("This browser cannot open a USB serial port. Chrome or Edge can. The simulator still runs in any browser.");
      return;
    }
    setError(null);
    setPhase("connecting");
    try {
      const port = await navigator.serial.requestPort();
      await disconnect();
      const session = new H36Session();
      session.onLog = pushLog;
      h36Ref.current = session;
      sourceRef.current = session;
      setMode("mcu");
      await session.connect(port, frontRef.current, gainRef.current);
      setMcuLine(
        `${session.mcu || "MCU"} ${session.version} · ${(session.clockHz / 1e6).toFixed(1)} MHz`,
      );
      setPhase("ready");
      const keepScale = scaleSourceRef.current === "entered" || scaleSourceRef.current === "calibration";
      if (!keepScale) {
        setScaleSource("none");
        setCountsPerGram(null);
        setTare(null);
      }
      pushLog(
        keepScale
          ? `${frontRef.current.label} is configured. Grams stay on the scale you entered.`
          : `${frontRef.current.label} is configured. Start the stream when the cell is still.`,
      );
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotFoundError" || err.name === "AbortError")) {
        setPhase("idle");
        setMode("idle");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
      setMode("idle");
      try {
        await h36Ref.current?.close();
      } catch {
        /* ignore */
      }
      h36Ref.current = null;
      sourceRef.current = null;
    }
  }, [disconnect, pushLog]);

  const startStream = useCallback(async () => {
    const source = sourceRef.current;
    if (!source) return;
    setError(null);
    samplesRef.current = [];
    dirtyRef.current = true;
    try {
      attach(source);
      await source.start(opts());
      setPhase("streaming");
      pushLog(`Streaming at ${rateRef.current} Hz, gain ${gainRef.current}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(sourceRef.current ? "ready" : "idle");
    }
  }, [attach, opts, pushLog]);

  const stopStream = useCallback(async () => {
    abortRef.current = true;
    await stopQuiet();
    setPhase(sourceRef.current ? "ready" : "idle");
    setBusyLabel("");
  }, [stopQuiet]);

  const ensureStreaming = useCallback(async () => {
    const source = sourceRef.current;
    if (!source) throw new Error("Connect a board or start the simulator first.");
    if (phase !== "streaming") {
      attach(source);
      await source.start(opts());
      setPhase("streaming");
    }
    return source;
  }, [attach, opts, phase]);

  const stillMoving = useCallback((samples: Sample[]) => {
    const drift = windowDrift(samples, 1.2);
    if (!drift) return false;
    const spread = (2 * drift.stdev) / Math.sqrt(drift.n);
    return Math.abs(drift.drift) > Math.max(8 * spread, 30);
  }, []);

  const tareNow = useCallback(() => {
    const stats = signedMean(samplesRef.current);
    if (!stats) {
      setError("Need about a second of samples before tare.");
      return;
    }
    if (stillMoving(samplesRef.current)) {
      setError("The reading is still moving. Wait until it holds still, then tare.");
      return;
    }
    setTare(stats.mean);
    setError(null);
    pushLog(`Tare set to ${Math.round(stats.mean)} counts.`);
  }, [pushLog, signedMean, stillMoving]);

  const autoGain = useCallback(async () => {
    const source = sourceRef.current;
    if (!source) return;
    abortRef.current = false;
    setPhase("busy");
    setError(null);
    const sensor = frontRef.current.sensor;
    const hardwareHx = source.kind === "mcu" && sensor === "hx717";
    const gains = hardwareHx ? [gainRef.current] : sensor === "hx717" ? [64, 128] : frontRef.current.gains;
    const probeRate = sensor === "hx717" ? frontRef.current.defaultRate : 90;
    let chosen = gains[0];
    try {
      attach(source);
      for (const candidate of gains) {
        if (abortRef.current) return;
        setBusyLabel(`Trying gain ${candidate}`);
        setGainState(candidate);
        gainRef.current = candidate;
        await source.start({ gain: candidate, sampleRate: probeRate, vref: vrefRef.current });
        const { samples } = await collectSamples(source.subscribe.bind(source), 0.45, undefined, () => abortRef.current);
        const sign = invertRef.current ? -1 : 1;
        const xs = samples.map((s) => s.counts * sign);
        const level = Math.abs(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
        const sat = xs.some((c) => isSaturated(Math.abs(c) === c ? c : -c) || isSaturated(c));
        if (sat || level > 0.22 * 8388608) {
          if (hardwareHx) {
            const other = candidate === 128 ? 64 : 128;
            throw new Error(
              `Gain ${candidate} is against the rail. Disconnect, choose ${other}, and connect again. HX717 gain is fixed until the board is configured again.`,
            );
          }
          break;
        }
        chosen = candidate;
      }
      setGainState(chosen);
      gainRef.current = chosen;
      pushLog(`Auto gain settled on ${chosen}.`);
      await source.start({ gain: chosen, sampleRate: rateRef.current, vref: vrefRef.current });
      setPhase("streaming");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(sourceRef.current ? "ready" : "idle");
    } finally {
      setBusyLabel("");
    }
  }, [attach, pushLog]);

  const runSpeed = useCallback(async () => {
    const source = sourceRef.current;
    if (!source) {
      setError("Connect a board or start the simulator first.");
      return;
    }
    if (!speedRates.length) {
      setError("Pick at least one sample rate.");
      return;
    }
    abortRef.current = false;
    setPhase("busy");
    setError(null);
    setSpeedResults([]);
    const results: SpeedResult[] = [];
    try {
      attach(source);
      const ordered = [...speedRates].sort((a, b) => a - b);
      for (const rate of ordered) {
        if (abortRef.current) break;
        setBusyLabel(`${rate} Hz`);
        await source.start({ gain: gainRef.current, sampleRate: rate, vref: vrefRef.current });
        const { samples, durationSec } = await collectSamples(
          source.subscribe.bind(source),
          speedSeconds,
          (fraction) => setBusyLabel(`${rate} Hz · ${(fraction * speedSeconds).toFixed(1)} s`),
          () => abortRef.current,
        );
        results.push(analyzeRate(samples, rate, durationSec, source.gaps, source.overflows, source.errors));
        setSpeedResults([...results]);
      }
      if (!abortRef.current) {
        await source.start(opts());
        setPhase("streaming");
        const passed = results.filter((r) => r.pass).length;
        pushLog(`Speed sweep done. ${passed} of ${results.length} rates passed.`);
      } else {
        setPhase(sourceRef.current ? "ready" : "idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(sourceRef.current ? "ready" : "idle");
    } finally {
      setBusyLabel("");
    }
  }, [attach, opts, pushLog, speedRates, speedSeconds]);

  const capturePoint = useCallback(
    (kind: Capture["kind"], grams: number) => {
      const stats = signedMean(samplesRef.current);
      if (!stats) {
        setError("Let the trace settle for a second, then capture.");
        return;
      }
      if (stillMoving(samplesRef.current)) {
        setError("The reading is still moving. Wait until it holds still, then capture again.");
        return;
      }
      const recent = samplesRef.current.slice(-400);
      if (recent.some((s) => isSaturated(s.counts))) {
        setError("The ADC is on the rail. Lower the gain before capturing this mass.");
      } else setError(null);
      const capture: Capture = {
        id: idRef.current++,
        kind,
        grams,
        counts: stats.mean,
        stdev: stats.stdev,
        n: stats.n,
      };
      setCaptures((prev) => [...prev, capture]);
    },
    [signedMean, stillMoving],
  );

  useEffect(() => {
    const loads = captures.filter((c) => c.kind === "zero" || c.kind === "load");
    if (loads.length < 2) {
      setFit(null);
      setVerdict(null);
      return;
    }
    try {
      const fitted = fitLine(loads.map((c) => ({ grams: c.grams, counts: c.counts })));
      const unloads = captures.filter((c) => c.kind === "unload");
      const repeats = captures.filter((c) => c.kind === "repeat");
      const hyst = hysteresisOf(
        loads.map((c) => ({ grams: c.grams, counts: c.counts })),
        unloads.map((c) => ({ grams: c.grams, counts: c.counts })),
        fitted.countsPerGram,
      );
      const repeatability =
        repeats.length >= 3 && fitted.countsPerGram
          ? stdev(repeats.map((c) => c.counts)) / Math.abs(fitted.countsPerGram)
          : null;
      const creepGrams =
        creep && creep.end !== null && fitted.countsPerGram
          ? (creep.end - creep.start) / fitted.countsPerGram
          : null;
      setFit(fitted);
      setVerdict(
        judgeAccuracy(fitted, {
          maxGrams: Math.max(...loads.map((c) => c.grams)),
          hysteresisGrams: hyst,
          repeatabilityGrams: repeatability,
          creepGrams,
        }),
      );
    } catch (err) {
      setFit(null);
      setVerdict(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [captures, creep]);

  const runCreep = useCallback(async () => {
    abortRef.current = false;
    const start = signedMean(samplesRef.current);
    if (!start) {
      setError("Stream for a second so the hold has a starting count.");
      return;
    }
    setPhase("busy");
    setCreep({ start: start.mean, end: null });
    setBusyLabel("Holding for creep");
    try {
      await ensureStreaming();
      await collectSamples(sourceRef.current!.subscribe.bind(sourceRef.current!), 30, (fraction) => {
        setBusyLabel(`Creep hold · ${(fraction * 30).toFixed(0)} s`);
      }, () => abortRef.current);
      const end = signedMean(samplesRef.current);
      if (end) {
        setCreep({ start: start.mean, end: end.mean });
        pushLog(`Creep hold moved ${(end.mean - start.mean).toFixed(0)} counts.`);
      }
      setPhase("streaming");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(sourceRef.current ? "streaming" : "idle");
    } finally {
      setBusyLabel("");
    }
  }, [ensureStreaming, pushLog, signedMean]);

  const applyCalibration = useCallback(() => {
    if (!fit) return;
    setCountsPerGram(fit.countsPerGram);
    setTare(fit.offsetCounts);
    setScaleSource("calibration");
    pushLog(`Calibration applied: ${fit.countsPerGram.toFixed(2)} counts per gram.`);
  }, [fit, pushLog]);

  const insertCapture = useCallback((kind: Capture["kind"], grams: number, counts: number) => {
    if (!Number.isFinite(grams) || grams < 0) {
      setError("Enter a mass in grams.");
      return;
    }
    if (!Number.isFinite(counts)) {
      setError("Enter the counts for that mass.");
      return;
    }
    setCaptures((prev) => [
      ...prev,
      {
        id: idRef.current++,
        kind,
        grams: kind === "zero" ? 0 : grams,
        counts,
        stdev: 0,
        n: 1,
      },
    ]);
    setError(null);
  }, []);

  const removeCapture = useCallback((id: number) => {
    setCaptures((prev) => prev.filter((capture) => capture.id !== id));
  }, []);

  const applyEnteredScale = useCallback((cpg: number, tareCounts: number) => {
    if (!Number.isFinite(cpg) || cpg <= 0) {
      setError("Enter a positive counts-per-gram. Use Invert sign if the bridge reads the other way.");
      return;
    }
    if (!Number.isFinite(tareCounts)) {
      setError("Enter the tare counts.");
      return;
    }
    setCountsPerGram(cpg);
    setTare(tareCounts);
    setScaleSource("entered");
    simRef.current?.setSensitivity(cpg > 0 ? cpg : null);
    setError(null);
    pushLog(`Entered scale: ${cpg.toFixed(2)} counts per gram, tare ${Math.round(tareCounts)} counts.`);
  }, [pushLog]);

  const useSketchScale = useCallback(() => {
    const ready = geometryRef.current;
    if (!ready) {
      setError("Type a neck width and length. The OEM listing does not include them.");
      return;
    }
    const cpg = estimateScale({
      ...ready,
      gain: gainRef.current,
      vref: vrefRef.current,
    }).countsPerGram;
    if (!Number.isFinite(cpg) || cpg === 0) {
      setError("The leaf sketch needs a positive thickness, neck size, and gauge factor.");
      return;
    }
    setCountsPerGram(cpg);
    setScaleSource("sketch");
    simRef.current?.setSensitivity(null);
    setError(null);
    pushLog(`Leaf sketch is the scale: ${cpg.toFixed(2)} counts per gram.`);
  }, [pushLog]);

  const publishRange = useCallback(
    (floor: number[] | null, steps: RangeStep[], ret: number | null, rms: number | null = noiseRmsEntered) => {
      const best = speedResults.filter((r) => r.pass).sort((a, b) => b.measuredHz - a.measuredHz)[0];
      setRangeResult(
        analyzeRange({
          noiseCounts: floor ?? [],
          countsPerGram,
          steps,
          zeroCounts,
          returnCounts: ret,
          bestRateHz: best ? best.measuredHz : phase === "streaming" ? rollingRate(samplesRef.current) : null,
          noiseRmsCounts: rms,
        }),
      );
    },
    [countsPerGram, noiseRmsEntered, phase, speedResults, zeroCounts],
  );

  useEffect(() => {
    if (!rangeSteps.length && !noiseFloor && noiseRmsEntered === null && returnCounts === null && zeroCounts === null) return;
    publishRange(noiseFloor, rangeSteps, returnCounts);
  }, [countsPerGram, noiseFloor, noiseRmsEntered, publishRange, rangeSteps, returnCounts, zeroCounts]);

  const runNoise = useCallback(async () => {
    if (load !== 0 && mode === "sim") {
      setError("Set the simulator to Empty before measuring the noise floor.");
      return;
    }
    abortRef.current = false;
    setPhase("busy");
    setError(null);
    try {
      const source = await ensureStreaming();
      const { samples } = await collectSamples(source.subscribe.bind(source), 8, (fraction) => {
        setBusyLabel(`Noise floor · ${(fraction * 8).toFixed(1)} s`);
      }, () => abortRef.current);
      const sign = invertRef.current ? -1 : 1;
      const xs = samples.map((s) => s.counts * sign);
      setNoiseRmsEntered(null);
      setNoiseFloor(xs);
      const stats = signedMean(samples);
      if (stats) setZeroCounts(stats.mean);
      setReturnCounts(null);
      publishRange(xs, rangeSteps, null, null);
      setPhase("streaming");
      pushLog(`Noise floor: ${stdev(xs).toFixed(1)} counts rms over ${xs.length} samples.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(sourceRef.current ? "ready" : "idle");
    } finally {
      setBusyLabel("");
    }
  }, [ensureStreaming, load, mode, publishRange, pushLog, rangeSteps, signedMean]);

  const captureRange = useCallback(() => {
    const stats = signedMean(samplesRef.current);
    if (!stats) {
      setError("Need a second of samples to record this load.");
      return;
    }
    if (stillMoving(samplesRef.current)) {
      setError("The reading is still moving. Wait until it holds still, then record this load.");
      return;
    }
    const grams = mode === "sim" ? load : Number(massDraft);
    if (!Number.isFinite(grams) || grams < 0) {
      setError("Enter the mass that is on the cell.");
      return;
    }
    const step: RangeStep = {
      grams,
      counts: stats.mean,
      saturated: samplesRef.current.slice(-200).some((s) => isSaturated(s.counts)),
      stdev: stats.stdev,
    };
    const steps = [...rangeSteps, step].sort((a, b) => a.grams - b.grams);
    setRangeSteps(steps);
    publishRange(noiseFloor, steps, returnCounts);
    setError(step.saturated ? "That capture is saturated. The usable range stops at the previous mass." : null);
  }, [load, massDraft, mode, noiseFloor, publishRange, rangeSteps, returnCounts, signedMean, stillMoving]);

  const captureReturn = useCallback(() => {
    const stats = signedMean(samplesRef.current);
    if (!stats) {
      setError("Unload the cell and let it settle, then record the return.");
      return;
    }
    if (stillMoving(samplesRef.current)) {
      setError("The reading is still moving. Wait until it holds still, then record the return.");
      return;
    }
    setReturnCounts(stats.mean);
    publishRange(noiseFloor, rangeSteps, stats.mean);
  }, [noiseFloor, publishRange, rangeSteps, signedMean, stillMoving]);

  const insertRangeStep = useCallback((grams: number, counts: number, saturated: boolean) => {
    if (!Number.isFinite(grams) || grams < 0) {
      setError("Enter a mass in grams.");
      return;
    }
    if (!Number.isFinite(counts)) {
      setError("Enter the counts for that mass.");
      return;
    }
    const step: RangeStep = { grams, counts, saturated, stdev: 0 };
    const steps = [...rangeSteps, step].sort((a, b) => a.grams - b.grams);
    setRangeSteps(steps);
    publishRange(noiseFloor, steps, returnCounts);
    setError(saturated ? "That point is marked saturated. The usable range stops at the previous mass." : null);
  }, [noiseFloor, publishRange, rangeSteps, returnCounts]);

  const removeRangeStep = useCallback((index: number) => {
    const steps = rangeSteps.filter((_, i) => i !== index);
    setRangeSteps(steps);
    publishRange(noiseFloor, steps, returnCounts);
  }, [noiseFloor, publishRange, rangeSteps, returnCounts]);

  const useEnteredNoise = useCallback((rmsCounts: number) => {
    if (!Number.isFinite(rmsCounts) || rmsCounts < 0) {
      setError("Enter the noise as counts rms, zero or greater.");
      return;
    }
    setNoiseRmsEntered(rmsCounts);
    setNoiseFloor(null);
    publishRange(null, rangeSteps, returnCounts, rmsCounts);
    setError(null);
    pushLog(`Noise floor entered as ${rmsCounts.toFixed(1)} counts rms.`);
  }, [publishRange, pushLog, rangeSteps, returnCounts]);

  const downloadCsv = useCallback(() => {
    const lines = ["host_t,t,index,counts"];
    for (const sample of samplesRef.current) {
      lines.push(`${sample.hostT.toFixed(6)},${sample.t.toFixed(6)},${sample.index},${sample.counts}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = (cellName.trim() || "loadcell").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "loadcell";
    link.href = url;
    link.download = `${slug}-trace.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [cellName]);

  const samples = useMemo(() => {
    void rev;
    return samplesRef.current.slice();
  }, [rev]);
  const readoutWindow = windowTail(samples, 0.45);
  const latestRaw = readoutWindow.length
    ? mean(readoutWindow.map((sample) => sample.counts))
    : samples.length
      ? samples[samples.length - 1].counts
      : null;
  const latestCounts = latestRaw === null ? null : invert ? -latestRaw : latestRaw;
  const tail = windowTail(samples, 2);
  const noiseCounts = tail.length > 8 ? stdev(tail.map((s) => s.counts)) : null;
  const noiseGrams =
    noiseCounts !== null && countsPerGram ? noiseCounts / Math.abs(countsPerGram) : null;
  const latestGrams =
    latestCounts !== null && tare !== null && countsPerGram
      ? (latestCounts - tare) / countsPerGram
      : null;
  const rate = rollingRate(samples);
  const overflows = sourceRef.current?.overflows ?? 0;
  const gaps = sourceRef.current?.gaps ?? 0;
  const linkErrors = sourceRef.current?.errors ?? 0;

  const api: BenchApi = {
    mode,
    front,
    setFront,
    phase,
    error,
    log,
    mcuLine,
    gain,
    setGain: (value) => {
      setGainState(value);
      gainRef.current = value;
    },
    sampleRate,
    setSampleRate: (value) => {
      setSampleRateState(value);
      rateRef.current = value;
    },
    vref,
    setVref: (value) => {
      setVrefState(value);
      vrefRef.current = value;
    },
    invert,
    setInvert: setInvertState,
    tare,
    countsPerGram,
    scaleSource,
    load,
    setLoad: (grams) => {
      setLoadState(grams);
      simRef.current?.setLoad(grams);
    },
    neckWidth,
    setNeckWidth: (mm) => {
      if (mm === null) {
        setNeckWidthState(null);
        return;
      }
      if (Number.isFinite(mm) && mm > 0) setNeckWidthState(mm);
    },
    neckLength,
    setNeckLength: (mm) => {
      if (mm === null) {
        setNeckLengthState(null);
        return;
      }
      if (Number.isFinite(mm) && mm > 0) setNeckLengthState(mm);
    },
    neckCount,
    setNeckCount: (count) => {
      if (Number.isFinite(count) && count > 0) setNeckCountState(count);
    },
    cellName,
    setCellName,
    thicknessMm,
    setThicknessMm: (mm) => {
      if (Number.isFinite(mm) && mm > 0) setThicknessMm(mm);
    },
    youngMpa,
    setYoungMpa: (mpa) => {
      if (Number.isFinite(mpa) && mpa > 0) {
        setYoungMpa(mpa);
        setMaterialIdState("custom");
      }
    },
    yieldMpa,
    setYieldMpa: (mpa) => {
      if (mpa === null) {
        setYieldMpa(null);
        setMaterialIdState("custom");
        return;
      }
      if (Number.isFinite(mpa) && mpa > 0) {
        setYieldMpa(mpa);
        setMaterialIdState("custom");
      }
    },
    cellProfileId,
    setCellProfileId: (id) => {
      const profile = cellProfileById(id);
      const material = materialById(profile.materialId);
      setCellProfileId(profile.id);
      cellProfileRef.current = profile.id;
      setCellName(profile.name);
      setMaterialIdState(profile.materialId);
      if (material.youngMpa != null) setYoungMpa(material.youngMpa);
      setYieldMpa(material.yieldMpa);
      setThicknessMm(profile.thicknessMm);
      setNeckCountState(profile.neckCount);
      setNeckWidthState(profile.neckWidthMm);
      setNeckLengthState(profile.neckLengthMm);
      setGaugeIdState(profile.gaugeId);
      setGaugeFactor(profile.gaugeFactor);
      setResistanceOhm(profile.resistanceOhm);
      setGridLengthMm(profile.gridLengthMm);
      setGridWidthMm(profile.gridWidthMm);
      setBridge(profile.bridge);
      setGaugeMount(profile.gaugeMount);
      setStrainFractionState(1);
    },
    gaugeMount,
    gaugeFactor,
    setGaugeFactor: (factor) => {
      if (Number.isFinite(factor) && factor > 0) {
        setGaugeFactor(factor);
        setGaugeIdState("custom");
      }
    },
    materialId,
    setMaterialId: (id) => {
      const material = materialById(id);
      setMaterialIdState(material.id);
      if (material.youngMpa != null) setYoungMpa(material.youngMpa);
      setYieldMpa(material.yieldMpa);
    },
    gaugeId,
    setGaugeId: (id) => {
      const gauge = gaugeById(id);
      setGaugeIdState(gauge.id);
      if (gauge.id === "custom") return;
      if (gauge.gaugeFactor != null) setGaugeFactor(gauge.gaugeFactor);
      setResistanceOhm(gauge.resistanceOhm);
      setGridLengthMm(gauge.gridLengthMm);
      setGridWidthMm(gauge.gridWidthMm);
    },
    resistanceOhm,
    setResistanceOhm: (ohm) => {
      if (ohm === null) {
        setResistanceOhm(null);
        setGaugeIdState("custom");
        return;
      }
      if (Number.isFinite(ohm) && ohm > 0) {
        setResistanceOhm(ohm);
        setGaugeIdState("custom");
      }
    },
    gridLengthMm,
    setGridLengthMm: (mm) => {
      if (mm === null) {
        setGridLengthMm(null);
        setGaugeIdState("custom");
        return;
      }
      if (Number.isFinite(mm) && mm > 0) {
        setGridLengthMm(mm);
        setGaugeIdState("custom");
      }
    },
    gridWidthMm,
    setGridWidthMm: (mm) => {
      if (mm === null) {
        setGridWidthMm(null);
        setGaugeIdState("custom");
        return;
      }
      if (Number.isFinite(mm) && mm > 0) {
        setGridWidthMm(mm);
        setGaugeIdState("custom");
      }
    },
    bridge,
    setBridge,
    strainFraction,
    setStrainFraction: (fraction) => {
      if (Number.isFinite(fraction) && fraction > 0 && fraction <= 1) setStrainFractionState(fraction);
    },
    applyRootGridFraction: () => {
      const fraction = rootGridFraction(gridLengthMm ?? 0, neckLength ?? 0);
      if (fraction === null) {
        setError("This grid is longer than half the neck, so the average depends on where you bond it. Type the share of the peak strain it sees.");
        return;
      }
      setStrainFractionState(fraction);
      setError(null);
    },
    ratedGrams,
    setRatedGrams: (grams) => {
      if (grams === null) {
        setRatedGrams(null);
        return;
      }
      if (Number.isFinite(grams) && grams >= 0) setRatedGrams(grams);
    },
    insertCapture,
    removeCapture,
    insertRangeStep,
    removeRangeStep,
    useEnteredNoise,
    noiseRmsEntered,
    applyEnteredScale,
    useSketchScale,
    samples,
    rate,
    latestCounts,
    latestGrams,
    noiseCounts,
    noiseGrams,
    overflows,
    gaps,
    linkErrors,
    saturatedNow: samples.slice(-30).some((s) => isSaturated(s.counts)),
    busyLabel,
    connectSim,
    connectBoard: connectH36,
    disconnect,
    startStream,
    stopStream,
    tareNow,
    autoGain,
    speedRates,
    toggleRate: (rateToToggle) =>
      setSpeedRates((prev) =>
        prev.includes(rateToToggle) ? prev.filter((r) => r !== rateToToggle) : [...prev, rateToToggle],
      ),
    speedSeconds,
    setSpeedSeconds,
    speedResults,
    runSpeed,
    captures,
    massDraft,
    setMassDraft,
    capturePoint,
    clearCaptures: () => {
      setCaptures([]);
      setFit(null);
      setVerdict(null);
      setCreep(null);
    },
    creepSeconds: 30,
    creep,
    runCreep,
    fit,
    verdict,
    applyCalibration,
    rangeSteps,
    rangeResult,
    runNoise,
    captureRange,
    captureReturn,
    clearRange: () => {
      setRangeSteps([]);
      setRangeResult(null);
      setNoiseFloor(null);
      setNoiseRmsEntered(null);
      setZeroCounts(null);
      setReturnCounts(null);
    },
    noiseFloor,
    zeroCounts,
    returnCounts,
    downloadCsv,
    webSerial,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
