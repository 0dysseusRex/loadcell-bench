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
import { CELL, GAINS, estimateScale } from "@/lib/model";
import { SimulatorSource } from "@/lib/simulator";

export type Phase = "idle" | "connecting" | "ready" | "streaming" | "busy";
export type ScaleSource = "none" | "sketch" | "calibration";
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
  kind: "h36" | "simulator";
  start(opts: StreamOptions): Promise<void>;
  stop(): Promise<void>;
  subscribe(cb: (batch: Sample[]) => void): () => void;
  overflows: number;
  gaps: number;
  setLoad?(grams: number): void;
};

type BenchApi = {
  mode: "idle" | "sim" | "h36";
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
  neckWidth: number;
  setNeckWidth: (mm: number) => void;
  neckLength: number;
  setNeckLength: (mm: number) => void;
  samples: Sample[];
  rate: number | null;
  latestCounts: number | null;
  latestGrams: number | null;
  noiseCounts: number | null;
  noiseGrams: number | null;
  overflows: number;
  gaps: number;
  saturatedNow: boolean;
  busyLabel: string;
  connectSim: () => void;
  connectH36: () => Promise<void>;
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
  const [neckWidth, setNeckWidthState] = useState(CELL.defaultNeckWidthMm);
  const [neckLength, setNeckLengthState] = useState(CELL.defaultNeckLengthMm);
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
  const rateRef = useRef(sampleRate);
  const vrefRef = useRef(vref);
  const invertRef = useRef(invert);
  const neckWRef = useRef(neckWidth);
  const neckLRef = useRef(neckLength);
  const scaleSourceRef = useRef(scaleSource);
  const idRef = useRef(1);
  gainRef.current = gain;
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

  const sketch = useMemo(
    () =>
      estimateScale({
        neckWidthMm: neckWidth,
        neckLengthMm: neckLength,
        neckCount: CELL.defaultNeckCount,
        gain,
        vref,
      }),
    [neckWidth, neckLength, gain, vref],
  );

  useEffect(() => {
    simRef.current?.setGeometry(neckWidth, neckLength, CELL.defaultNeckCount);
    if (scaleSource === "sketch") setCountsPerGram(sketch.countsPerGram);
  }, [neckWidth, neckLength, sketch, scaleSource]);

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
      sim.setGeometry(neckWRef.current, neckLRef.current, CELL.defaultNeckCount);
      simRef.current = sim;
      sourceRef.current = sim;
      setMode("sim");
      setPhase("ready");
      setError(null);
      setScaleSource("sketch");
      setTare(null);
      setCountsPerGram(
        estimateScale({
          neckWidthMm: neckWRef.current,
          neckLengthMm: neckLRef.current,
          neckCount: CELL.defaultNeckCount,
          gain: gainRef.current,
          vref: vrefRef.current,
        }).countsPerGram,
      );
      pushLog("Simulator is on. Numbers come from the flexure sketch, not from the H36.");
    })();
  }, [disconnect, pushLog]);

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
      setMode("h36");
      await session.connect(port);
      setMcuLine(
        `${session.mcu || "MCU"} ${session.version} · ${(session.clockHz / 1e6).toFixed(1)} MHz`,
      );
      setPhase("ready");
      setScaleSource("none");
      setCountsPerGram(null);
      setTare(null);
      pushLog("H36 is configured for the Plimsoll mini ADS1220. Start the stream when the cell is still.");
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
    if (!source) throw new Error("Connect the H36 or start the simulator first.");
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
    let chosen = 1;
    try {
      attach(source);
      for (const candidate of GAINS) {
        if (abortRef.current) return;
        setBusyLabel(`Trying gain ${candidate}`);
        setGainState(candidate);
        gainRef.current = candidate;
        await source.start({ gain: candidate, sampleRate: 90, vref: vrefRef.current });
        const { samples } = await collectSamples(source.subscribe.bind(source), 0.45, undefined, () => abortRef.current);
        const sign = invertRef.current ? -1 : 1;
        const xs = samples.map((s) => s.counts * sign);
        const level = Math.abs(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
        const sat = xs.some((c) => isSaturated(Math.abs(c) === c ? c : -c) || isSaturated(c));
        if (sat || level > 0.22 * 8388608) break;
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
      setError("Connect the H36 or start the simulator first.");
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
        results.push(analyzeRate(samples, rate, durationSec, source.gaps, source.overflows));
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

  const publishRange = useCallback(
    (floor: number[] | null, steps: RangeStep[], ret: number | null) => {
      const best = speedResults.filter((r) => r.pass).sort((a, b) => b.measuredHz - a.measuredHz)[0];
      setRangeResult(
        analyzeRange({
          noiseCounts: floor ?? [],
          countsPerGram,
          steps,
          zeroCounts,
          returnCounts: ret,
          bestRateHz: best ? best.measuredHz : phase === "streaming" ? rollingRate(samplesRef.current) : null,
        }),
      );
    },
    [countsPerGram, phase, speedResults, zeroCounts],
  );

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
      setNoiseFloor(xs);
      const stats = signedMean(samples);
      if (stats) setZeroCounts(stats.mean);
      setReturnCounts(null);
      publishRange(xs, rangeSteps, null);
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

  const downloadCsv = useCallback(() => {
    const lines = ["host_t,t,index,counts"];
    for (const sample of samplesRef.current) {
      lines.push(`${sample.hostT.toFixed(6)},${sample.t.toFixed(6)},${sample.index},${sample.counts}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "k2-loadcell-trace.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

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

  const api: BenchApi = {
    mode,
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
    setNeckWidth: setNeckWidthState,
    neckLength,
    setNeckLength: setNeckLengthState,
    samples,
    rate,
    latestCounts,
    latestGrams,
    noiseCounts,
    noiseGrams,
    overflows,
    gaps,
    saturatedNow: samples.slice(-30).some((s) => isSaturated(s.counts)),
    busyLabel,
    connectSim,
    connectH36,
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
