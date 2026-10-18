"use client";

import { useEffect, useRef } from "react";
import type { Sample } from "@/lib/analyze";

type Props = {
  samples: Sample[];
  seconds?: number;
  tare: number | null;
  countsPerGram: number | null;
  invert: boolean;
};

export function TraceChart({ samples, seconds = 8, tare, countsPerGram, invert }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const draw = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, width, height, samples, seconds, tare, countsPerGram, invert);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [samples, seconds, tare, countsPerGram, invert]);

  return (
    <div className="relative h-[240px] w-full sm:h-[320px]">
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}

function paint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Sample[],
  seconds: number,
  tare: number | null,
  countsPerGram: number | null,
  invert: boolean,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(0, 0, width, height);
  const pad = { l: 58, r: 12, t: 14, b: 26 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  ctx.strokeStyle = "#e4ddd0";
  ctx.lineWidth = 1;
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillStyle = "#6d675e";
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
  }
  const end = samples.length ? samples[samples.length - 1].t : 0;
  const start = end - seconds;
  const visible = samples.filter((s) => s.t >= start);
  const useGrams = countsPerGram !== null && countsPerGram !== 0 && tare !== null;
  const valueOf = (counts: number) => {
    const signed = invert ? -counts : counts;
    return useGrams ? (signed - tare) / (countsPerGram as number) : signed;
  };
  if (visible.length < 2) {
    ctx.fillStyle = "#6d675e";
    ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("The trace appears here once samples are arriving.", pad.l, pad.t + plotH / 2);
    return;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const sample of visible) {
    const v = valueOf(sample.counts);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;
  const xOf = (t: number) => pad.l + ((t - start) / seconds) * plotW;
  const yOf = (v: number) => pad.t + ((max - v) / (max - min)) * plotH;

  ctx.fillStyle = "#6d675e";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(useGrams ? `${max.toFixed(2)} g` : formatCounts(max), 6, pad.t + 10);
  ctx.fillText(useGrams ? `${min.toFixed(2)} g` : formatCounts(min), 6, pad.t + plotH);
  ctx.fillText(`${seconds.toFixed(0)} s`, width - pad.r - 24, height - 8);
  ctx.fillText("now", pad.l, height - 8);

  ctx.beginPath();
  ctx.strokeStyle = "#c45c26";
  ctx.lineWidth = 1.4;
  let pen = false;
  for (const sample of visible) {
    const x = xOf(sample.t);
    const y = yOf(valueOf(sample.counts));
    if (!pen) {
      ctx.moveTo(x, y);
      pen = true;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function formatCounts(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}e6`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}e3`;
  return n.toFixed(0);
}
