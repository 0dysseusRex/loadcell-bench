export type DxfPoint = { x: number; y: number };

export type DxfPath = {
  id: string;
  closed: boolean;
  pts: DxfPoint[];
};

export type DxfCircle = {
  id: string;
  cx: number;
  cy: number;
  r: number;
};

export type DxfBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type DxfDrawing = {
  paths: DxfPath[];
  circles: DxfCircle[];
  bounds: DxfBounds;
  /** Millimeters per drawing unit after conversion. */
  unitName: string;
};

const UNIT_TO_MM: Record<number, { mm: number; name: string }> = {
  0: { mm: 1, name: "unitless, read as millimeters" },
  1: { mm: 25.4, name: "inches" },
  2: { mm: 304.8, name: "feet" },
  4: { mm: 1, name: "millimeters" },
  5: { mm: 10, name: "centimeters" },
  6: { mm: 1000, name: "meters" },
};

type Pair = { code: number; value: string };

function pairsOf(text: string): Pair[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    pairs.push({ code, value: lines[i + 1].trim() });
  }
  return pairs;
}

type Vertex = DxfPoint & { bulge: number };

/** Sample a DXF bulge arc. Positive bulge bows to the left of start → end. */
export function bulgePoints(start: DxfPoint, end: DxfPoint, bulge: number): DxfPoint[] {
  if (!(Math.abs(bulge) > 1e-6)) return [end];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.hypot(dx, dy);
  if (!(chord > 1e-9)) return [end];
  const theta = 4 * Math.atan(bulge);
  const radius = chord / (2 * Math.sin(theta / 2));
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const offset = Math.sqrt(Math.max(0, radius * radius - (chord / 2) ** 2));
  const nx = -dy / chord;
  const ny = dx / chord;
  const sign = bulge > 0 ? 1 : -1;
  const cx = mx + sign * offset * nx;
  const cy = my + sign * offset * ny;
  const a0 = Math.atan2(start.y - cy, start.x - cx);
  const a1 = Math.atan2(end.y - cy, end.x - cx);
  let sweep = a1 - a0;
  if (bulge > 0) {
    if (sweep > 0) sweep -= Math.PI * 2;
  } else if (sweep < 0) {
    sweep += Math.PI * 2;
  }
  const steps = Math.max(4, Math.ceil(Math.abs(theta) / (Math.PI / 16)));
  const pts: DxfPoint[] = [];
  const r = Math.abs(radius);
  for (let i = 1; i <= steps; i++) {
    const a = a0 + (sweep * i) / steps;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function expand(verts: Vertex[], closed: boolean): DxfPoint[] {
  if (verts.length === 0) return [];
  const pts: DxfPoint[] = [{ x: verts[0].x, y: verts[0].y }];
  const last = closed ? verts.length : verts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    pts.push(...bulgePoints(a, b, a.bulge));
  }
  return pts;
}

function boundsOf(paths: DxfPath[], circles: DxfCircle[]): DxfBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const path of paths) for (const p of path.pts) add(p.x, p.y);
  for (const circle of circles) {
    add(circle.cx - circle.r, circle.cy - circle.r);
    add(circle.cx + circle.r, circle.cy + circle.r);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function parseDxf(text: string): DxfDrawing {
  if (text.startsWith("AutoCAD Binary DXF")) {
    throw new Error("This is a binary DXF. In the CAD program, use Save As and choose an ASCII DXF.");
  }
  const pairs = pairsOf(text);
  let section = "";
  let headerVar = "";
  let unitCode = 0;
  let entity = "";
  let x = 0;
  let y = 0;
  let x2: number | null = null;
  let y2: number | null = null;
  let radius = 0;
  let startDeg = 0;
  let endDeg = 0;
  let closed = false;
  let verts: Vertex[] = [];
  let pending: Vertex | null = null;
  let inPolyline = false;
  const paths: DxfPath[] = [];
  const circles: DxfCircle[] = [];
  let seq = 0;

  const flushVertex = () => {
    if (!pending) return;
    verts.push(pending);
    pending = null;
  };

  const flush = () => {
    flushVertex();
    if (entity === "LWPOLYLINE" || entity === "POLYLINE") {
      const pts = expand(verts, closed);
      if (pts.length >= 2) paths.push({ id: `p${seq++}`, closed, pts });
    } else if (entity === "LINE" && x2 != null && y2 != null) {
      paths.push({ id: `p${seq++}`, closed: false, pts: [{ x, y }, { x: x2, y: y2 }] });
    } else if (entity === "CIRCLE" && radius > 0) {
      circles.push({ id: `c${seq++}`, cx: x, cy: y, r: radius });
    } else if (entity === "ARC" && radius > 0) {
      const start = (startDeg * Math.PI) / 180;
      let sweep = ((endDeg - startDeg) * Math.PI) / 180;
      if (sweep <= 0) sweep += Math.PI * 2;
      const steps = Math.max(8, Math.ceil(sweep / (Math.PI / 16)));
      const pts: DxfPoint[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = start + (sweep * i) / steps;
        pts.push({ x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) });
      }
      paths.push({ id: `p${seq++}`, closed: false, pts });
    }
    entity = "";
    verts = [];
    pending = null;
    closed = false;
    x2 = null;
    y2 = null;
    radius = 0;
    inPolyline = false;
  };

  for (let i = 0; i < pairs.length; i++) {
    const { code, value } = pairs[i];
    if (code === 0) {
      if (value === "SECTION") {
        section = "";
        continue;
      }
      if (value === "ENDSEC") {
        flush();
        section = "";
        continue;
      }
      if (section === "ENTITIES" || inPolyline) {
        if (value === "VERTEX") {
          flushVertex();
          entity = "VERTEX";
          pending = { x: 0, y: 0, bulge: 0 };
          continue;
        }
        if (value === "SEQEND") {
          entity = "POLYLINE";
          flush();
          continue;
        }
        flush();
        if (value === "LWPOLYLINE" || value === "LINE" || value === "CIRCLE" || value === "ARC" || value === "POLYLINE") {
          entity = value;
          inPolyline = value === "POLYLINE";
        }
      }
      continue;
    }
    if (code === 2 && section === "" && i > 0 && pairs[i - 1].code === 0 && pairs[i - 1].value === "SECTION") {
      section = value;
      continue;
    }
    if (section === "HEADER" && code === 9) {
      headerVar = value;
      continue;
    }
    if (section === "HEADER" && headerVar === "$INSUNITS" && code === 70) {
      unitCode = Number(value);
      continue;
    }
    if (!entity) continue;
    if (entity === "LWPOLYLINE" || entity === "VERTEX") {
      if (code === 10) {
        flushVertex();
        pending = { x: Number(value), y: 0, bulge: 0 };
      } else if (code === 20 && pending) pending.y = Number(value);
      else if (code === 42 && pending) pending.bulge = Number(value);
      else if (code === 70 && entity === "LWPOLYLINE") closed = (Number(value) & 1) === 1;
      continue;
    }
    if (code === 10) x = Number(value);
    else if (code === 20) y = Number(value);
    else if (code === 11) x2 = Number(value);
    else if (code === 21) y2 = Number(value);
    else if (code === 40) radius = Number(value);
    else if (code === 50) startDeg = Number(value);
    else if (code === 51) endDeg = Number(value);
    else if (code === 70 && entity === "POLYLINE") closed = (Number(value) & 1) === 1;
  }
  flush();

  const unit = UNIT_TO_MM[unitCode] ?? UNIT_TO_MM[0];
  const scale = unit.mm;
  if (scale !== 1) {
    for (const path of paths) for (const p of path.pts) {
      p.x *= scale;
      p.y *= scale;
    }
    for (const circle of circles) {
      circle.cx *= scale;
      circle.cy *= scale;
      circle.r *= scale;
    }
  }
  const drawing = { paths, circles, bounds: boundsOf(paths, circles), unitName: unit.name };
  if (paths.length + circles.length === 0) {
    throw new Error("No lines or curves were found in that DXF. Save the model space as an ASCII DXF and try again.");
  }
  return drawing;
}

export function distanceMm(a: DxfPoint, b: DxfPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function outerPath(drawing: DxfDrawing): DxfPath | null {
  let best: DxfPath | null = null;
  let bestArea = 0;
  for (const path of drawing.paths) {
    if (!path.closed || path.pts.length < 3) continue;
    let area = 0;
    for (let i = 0; i < path.pts.length; i++) {
      const a = path.pts[i];
      const b = path.pts[(i + 1) % path.pts.length];
      area += a.x * b.y - b.x * a.y;
    }
    const abs = Math.abs(area) / 2;
    if (abs > bestArea) {
      bestArea = abs;
      best = path;
    }
  }
  return best;
}

export function pointInPolygon(x: number, y: number, pts: DxfPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const yi = pts[i].y;
    const yj = pts[j].y;
    const xi = pts[i].x;
    const xj = pts[j].x;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function gaugeFitMessage(input: {
  gridLengthMm: number | null;
  gridWidthMm: number | null;
  neckLengthMm: number | null;
  neckWidthMm: number | null;
}): string | null {
  const notes: string[] = [];
  if (input.gridWidthMm != null && input.neckWidthMm != null && input.gridWidthMm > input.neckWidthMm + 0.05) {
    notes.push(`The ${input.gridWidthMm.toFixed(1)} mm grid is wider than the ${input.neckWidthMm.toFixed(2)} mm neck.`);
  }
  if (input.gridLengthMm != null && input.neckLengthMm != null && input.gridLengthMm > input.neckLengthMm + 0.05) {
    notes.push(`The ${input.gridLengthMm.toFixed(1)} mm grid is longer than the ${input.neckLengthMm.toFixed(1)} mm neck.`);
  }
  return notes.length ? notes.join(" ") : null;
}
