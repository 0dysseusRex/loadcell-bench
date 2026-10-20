"use client";

import { useEffect, useState } from "react";
import { useBench } from "@/components/bench-context";
import { Button } from "@/components/ui/button";
import { gaugeById, materialById } from "@/lib/model";
import { compileReport } from "@/lib/report";

export function ResultsPage({ onBack }: { onBack: () => void }) {
  const bench = useBench();
  const [prepared, setPrepared] = useState("");
  useEffect(() => {
    setPrepared(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  const report = compileReport({
    cellName: bench.cellName,
    materialName: bench.materialId ? materialById(bench.materialId).name : "Not chosen",
    thicknessMm: bench.thicknessMm,
    neckCount: bench.neckCount,
    neckWidthMm: bench.neckWidth,
    neckLengthMm: bench.neckLength,
    gaugeName: bench.gaugeId ? gaugeById(bench.gaugeId).name : "Not chosen",
    gaugeFactor: bench.gaugeFactor,
    resistanceOhm: bench.resistanceOhm,
    bridge: bench.bridge,
    gaugeMount: bench.gaugeMount,
    frontLabel: bench.front.label,
    gain: bench.gain,
    sampleRate: bench.sampleRate,
    mode: bench.mode,
    scaleSource: bench.scaleSource,
    countsPerGram: bench.countsPerGram,
    tare: bench.tare,
    ratedGrams: bench.ratedGrams,
    speed: bench.speedResults,
    fit: bench.fit,
    verdict: bench.verdict,
    range: bench.rangeResult,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          Back to the bench
        </Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
      <article className="print-sheet rounded-xl border border-[#e0d8cc] bg-[#f7f4ee] px-5 py-7 sm:px-8 sm:py-10">
        <p className="text-[11px] font-medium tracking-[0.16em] text-[#8a5a32] uppercase">Bench report</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{report.title}</h1>
        {prepared && <p className="mt-1 text-sm text-[#6d675e]">Prepared {prepared}</p>}
        <p className="mt-5 text-[15px] leading-relaxed text-[#1c1915]">{report.lede}</p>
        {report.sections.map((section) => (
          <section key={section.id} className="mt-8">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-[#3f3a33]">
                {paragraph}
              </p>
            ))}
            {section.rows.length > 0 && (
              <dl className="mt-3 divide-y divide-[#eee6d8] border-y border-[#eee6d8]">
                {section.rows.map((row) => (
                  <div key={row.label} className="grid gap-0.5 py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-xs tracking-wide text-[#6d675e] uppercase">{row.label}</dt>
                    <dd className="text-sm text-[#1c1915]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
