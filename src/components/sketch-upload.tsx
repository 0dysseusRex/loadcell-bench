"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useBench } from "@/components/bench-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  distanceMm,
  gaugeFitMessage,
  outerPath,
  parseDxf,
  pointInPolygon,
  type DxfDrawing,
  type DxfPoint,
} from "@/lib/dxf";

type Tool = "width" | "length" | "gauge";

export function SketchUpload() {
  const bench = useBench();
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState<DxfDrawing | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("width");
  const [pending, setPending] = useState<DxfPoint | null>(null);
  const [widthLine, setWidthLine] = useState<[DxfPoint, DxfPoint] | null>(null);
  const [lengthLine, setLengthLine] = useState<[DxfPoint, DxfPoint] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function loadText(name: string, text: string) {
    try {
      const next = parseDxf(text);
      setDrawing(next);
      setFileName(name);
      setError(null);
      setPending(null);
      setNote(`${name} · ${next.bounds.width.toFixed(1)} × ${next.bounds.height.toFixed(1)} mm, read from ${next.unitName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that DXF.");
    }
  }

  function onFile(file: File) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".dwg")) {
      setError("DWG stays in the CAD program. Use Save As, choose DXF, and upload that file.");
      return;
    }
    if (!lower.endsWith(".dxf")) {
      setError("Upload a DXF sketch. Other CAD files need Save As DXF first.");
      return;
    }
    void file.text().then((text) => loadText(file.name, text));
  }

  async function openExample() {
    const response = await fetch("/cell/NewLoadcell.dxf");
    if (!response.ok) {
      setError("The Custom K2 Loadcell sketch could not be loaded.");
      return;
    }
    loadText("NewLoadcell.dxf", await response.text());
  }

  function toDrawing(event: MouseEvent<SVGSVGElement>): DxfPoint | null {
    const svg = svgRef.current;
    if (!svg || !drawing) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const local = point.matrixTransform(matrix.inverse());
    const pad = padding(drawing);
    return {
      x: local.x - pad + drawing.bounds.minX,
      y: drawing.bounds.maxY - (local.y - pad),
    };
  }

  function onSketchClick(event: MouseEvent<SVGSVGElement>) {
    if (!drawing) return;
    const point = toDrawing(event);
    if (!point) return;
    const outline = outerPath(drawing);
    const outside = outline ? !pointInPolygon(point.x, point.y, outline.pts) : false;
    if (tool === "gauge") {
      if (!pending) {
        bench.setGaugeMarks([...bench.gaugeMarks, { x: point.x, y: point.y, angleDeg: 0 }]);
        setPending(point);
        setNote(outside ? "That point is outside the outline. Click again to aim the grid along the neck." : "Click again to aim the long side of the grid along the neck.");
        return;
      }
      const aim = Math.atan2(point.y - pending.y, point.x - pending.x) * (180 / Math.PI);
      const marks = bench.gaugeMarks.slice();
      if (marks.length) marks[marks.length - 1] = { ...marks[marks.length - 1], angleDeg: aim };
      bench.setGaugeMarks(marks);
      setPending(null);
      setNote(fitNote(bench.gridLengthMm, bench.gridWidthMm, bench.neckLength, bench.neckWidth));
      return;
    }
    if (!pending) {
      setPending(point);
      setNote(tool === "width" ? "Click the other side of the neck. The distance becomes the neck width." : "Click the other end of the neck. The distance becomes the neck length.");
      return;
    }
    const length = distanceMm(pending, point);
    if (tool === "width") {
      setWidthLine([pending, point]);
      bench.setNeckWidth(length);
      setNote(`Neck width set to ${length.toFixed(2)} mm.`);
    } else {
      setLengthLine([pending, point]);
      bench.setNeckLength(length);
      setNote(`Neck length set to ${length.toFixed(2)} mm.`);
    }
    setPending(null);
  }

  const fit = gaugeFitMessage({
    gridLengthMm: bench.gridLengthMm,
    gridWidthMm: bench.gridWidthMm,
    neckLengthMm: bench.neckLength,
    neckWidthMm: bench.neckWidth,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sketch</CardTitle>
        <CardDescription>
          Upload a DXF of the flexure. Click two points to measure a neck, or click to place a gauge. This checks whether the foil fits the neck. It is not a stress analysis. A DWG file needs Save As DXF first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            Upload DXF
          </Button>
          <Button type="button" variant="outline" onClick={() => void openExample()}>
            Open the Custom K2 Loadcell sketch
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".dxf,.dwg,application/dxf"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        </div>
        {fileName && <p className="text-xs text-[#6d675e]">{fileName}</p>}
        {error && <p className="text-sm text-[#8a3324]">{error}</p>}
        {drawing && (
          <>
            <div className="flex flex-wrap gap-2">
              <ToolButton
                current={tool}
                id="width"
                onPick={(next) => {
                  setTool(next);
                  setPending(null);
                }}
              >
                Measure neck width
              </ToolButton>
              <ToolButton
                current={tool}
                id="length"
                onPick={(next) => {
                  setTool(next);
                  setPending(null);
                }}
              >
                Measure neck length
              </ToolButton>
              <ToolButton
                current={tool}
                id="gauge"
                onPick={(next) => {
                  setTool(next);
                  setPending(null);
                }}
              >
                Place a gauge
              </ToolButton>
              {bench.gaugeMarks.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => bench.setGaugeMarks([])}>
                  Clear gauges
                </Button>
              )}
            </div>
            <svg
              ref={svgRef}
              viewBox={viewBoxOf(drawing)}
              className="w-full cursor-crosshair rounded-lg border border-[#e4ddd0] bg-[#f6f3ec]"
              role="img"
              aria-label="Uploaded load cell sketch"
              onClick={onSketchClick}
            >
              {drawing.paths.map((path) => (
                <path
                  key={path.id}
                  d={pathD(drawing, path.pts, path.closed)}
                  fill={path.closed ? (path.id === outerPath(drawing)?.id ? "#d5dbe0" : "#f6f3ec") : "none"}
                  stroke="#1c1915"
                  strokeWidth={Math.max(drawing.bounds.width, drawing.bounds.height) * 0.004}
                  strokeLinejoin="round"
                />
              ))}
              {drawing.circles.map((circle) => (
                <circle
                  key={circle.id}
                  cx={sx(drawing, circle.cx)}
                  cy={sy(drawing, circle.cy)}
                  r={circle.r}
                  fill="#f6f3ec"
                  stroke="#1c1915"
                  strokeWidth={Math.max(drawing.bounds.width, drawing.bounds.height) * 0.004}
                />
              ))}
              {widthLine && <Dim drawing={drawing} line={widthLine} label="width" />}
              {lengthLine && <Dim drawing={drawing} line={lengthLine} label="length" />}
              {bench.gaugeMarks.map((mark, index) => (
                <GaugeRect key={`${index}-${mark.x}-${mark.y}`} drawing={drawing} x={mark.x} y={mark.y} angleDeg={mark.angleDeg} lengthMm={bench.gridLengthMm ?? 5.3} widthMm={bench.gridWidthMm ?? 3} />
              ))}
            </svg>
          </>
        )}
        <p className="text-sm text-[#3f3a33]">
          {bench.neckWidth == null ? "Neck width is blank." : `Neck width ${bench.neckWidth.toFixed(2)} mm.`}{" "}
          {bench.neckLength == null ? "Neck length is blank." : `Neck length ${bench.neckLength.toFixed(1)} mm.`}{" "}
          {bench.gaugeMarks.length > 0 ? `${bench.gaugeMarks.length} gauge${bench.gaugeMarks.length === 1 ? "" : "s"} placed.` : ""}
        </p>
        {note && <p className="text-sm text-[#5c564c]">{note}</p>}
        {fit && <p className="text-sm text-[#8a3324]">{fit}</p>}
      </CardContent>
    </Card>
  );
}

function ToolButton({ current, id, onPick, children }: { current: Tool; id: Tool; onPick: (tool: Tool) => void; children: string }) {
  return (
    <Button type="button" size="sm" variant={current === id ? "default" : "outline"} aria-pressed={current === id} onClick={() => onPick(id)}>
      {children}
    </Button>
  );
}

function padding(drawing: DxfDrawing): number {
  return Math.max(drawing.bounds.width, drawing.bounds.height, 1) * 0.06;
}

function viewBoxOf(drawing: DxfDrawing): string {
  const pad = padding(drawing);
  return `0 0 ${drawing.bounds.width + pad * 2} ${drawing.bounds.height + pad * 2}`;
}

function sx(drawing: DxfDrawing, x: number): number {
  return x - drawing.bounds.minX + padding(drawing);
}

function sy(drawing: DxfDrawing, y: number): number {
  return drawing.bounds.maxY - y + padding(drawing);
}

function pathD(drawing: DxfDrawing, pts: DxfPoint[], closed: boolean): string {
  const d = pts.map((p, index) => `${index === 0 ? "M" : "L"}${sx(drawing, p.x)},${sy(drawing, p.y)}`).join(" ");
  return closed ? `${d} Z` : d;
}

function fitNote(gridLength: number | null, gridWidth: number | null, neckLength: number | null, neckWidth: number | null): string {
  const fit = gaugeFitMessage({ gridLengthMm: gridLength, gridWidthMm: gridWidth, neckLengthMm: neckLength, neckWidthMm: neckWidth });
  return fit ?? "Gauge placed. The grid fits the neck size entered so far.";
}

function Dim({ drawing, line, label }: { drawing: DxfDrawing; line: [DxfPoint, DxfPoint]; label: string }) {
  const [a, b] = line;
  const midX = (sx(drawing, a.x) + sx(drawing, b.x)) / 2;
  const midY = (sy(drawing, a.y) + sy(drawing, b.y)) / 2;
  return (
    <g>
      <line x1={sx(drawing, a.x)} y1={sy(drawing, a.y)} x2={sx(drawing, b.x)} y2={sy(drawing, b.y)} stroke="#8a5a32" strokeWidth={Math.max(drawing.bounds.width, drawing.bounds.height) * 0.006} />
      <text x={midX} y={midY} fill="#8a5a32" fontSize={Math.max(drawing.bounds.width, drawing.bounds.height) * 0.035}>
        {label} {distanceMm(a, b).toFixed(2)}
      </text>
    </g>
  );
}

function GaugeRect({
  drawing,
  x,
  y,
  angleDeg,
  lengthMm,
  widthMm,
}: {
  drawing: DxfDrawing;
  x: number;
  y: number;
  angleDeg: number;
  lengthMm: number;
  widthMm: number;
}) {
  return (
    <g transform={`translate(${sx(drawing, x)} ${sy(drawing, y)}) rotate(${-angleDeg})`}>
      <rect x={-lengthMm / 2} y={-widthMm / 2} width={lengthMm} height={widthMm} fill="rgba(138,90,50,0.22)" stroke="#8a5a32" strokeWidth={Math.max(drawing.bounds.width, drawing.bounds.height) * 0.004} />
    </g>
  );
}
