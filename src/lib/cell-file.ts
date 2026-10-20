import type { BridgeKind, GaugeMount } from "./model";

export type GaugeMark = { x: number; y: number; angleDeg: number };

export type CellFile = {
  kind: "loadcell-bench-cell";
  version: 1;
  name: string;
  profileId: string | null;
  materialId: string | null;
  youngMpa: number | null;
  yieldMpa: number | null;
  thicknessMm: number | null;
  neckCount: number | null;
  neckWidthMm: number | null;
  neckLengthMm: number | null;
  gaugeId: string | null;
  gaugeFactor: number | null;
  resistanceOhm: number | null;
  gridLengthMm: number | null;
  gridWidthMm: number | null;
  bridge: BridgeKind | null;
  gaugeMount: GaugeMount | null;
  strainFraction: number | null;
  ratedGrams: number | null;
  countsPerGram: number | null;
  tareCounts: number | null;
  gauges: GaugeMark[];
};

export type SavedCell = {
  id: string;
  savedAt: string;
  file: CellFile;
};

const STORAGE_KEY = "loadcell-bench.cells";

function num(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function pos(value: unknown): number | null {
  const n = num(value);
  return n != null && n > 0 ? n : null;
}

function bridgeOf(value: unknown): BridgeKind | null {
  if (value === "full" || value === "half" || value === "quarter") return value;
  return null;
}

function mountOf(value: unknown): GaugeMount | null {
  if (value === "same-face" || value === "back-to-back") return value;
  return null;
}

export function parseCellFile(text: string): CellFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not JSON. Save the cell from this bench and upload that file.");
  }
  if (!data || typeof data !== "object") throw new Error("That file is not a load cell saved from this bench.");
  const row = data as Partial<CellFile>;
  if (row.kind !== "loadcell-bench-cell" || row.version !== 1) {
    throw new Error("That file is not a load cell saved from this bench.");
  }
  const gauges = Array.isArray(row.gauges)
    ? row.gauges.flatMap((mark) => {
        if (!mark || typeof mark !== "object") return [];
        const x = num((mark as GaugeMark).x);
        const y = num((mark as GaugeMark).y);
        const angleDeg = num((mark as GaugeMark).angleDeg);
        if (x == null || y == null || angleDeg == null) return [];
        return [{ x, y, angleDeg }];
      })
    : [];
  return {
    kind: "loadcell-bench-cell",
    version: 1,
    name: typeof row.name === "string" ? row.name : "",
    profileId: typeof row.profileId === "string" ? row.profileId : null,
    materialId: typeof row.materialId === "string" && row.materialId ? row.materialId : null,
    youngMpa: pos(row.youngMpa),
    yieldMpa: pos(row.yieldMpa),
    thicknessMm: pos(row.thicknessMm),
    neckCount: pos(row.neckCount),
    neckWidthMm: pos(row.neckWidthMm),
    neckLengthMm: pos(row.neckLengthMm),
    gaugeId: typeof row.gaugeId === "string" && row.gaugeId ? row.gaugeId : null,
    gaugeFactor: pos(row.gaugeFactor),
    resistanceOhm: pos(row.resistanceOhm),
    gridLengthMm: pos(row.gridLengthMm),
    gridWidthMm: pos(row.gridWidthMm),
    bridge: bridgeOf(row.bridge),
    gaugeMount: mountOf(row.gaugeMount),
    strainFraction: pos(row.strainFraction),
    ratedGrams: num(row.ratedGrams) != null && (num(row.ratedGrams) as number) >= 0 ? num(row.ratedGrams) : null,
    countsPerGram: pos(row.countsPerGram),
    tareCounts: num(row.tareCounts),
    gauges,
  };
}

export function cellFileName(file: CellFile): string {
  const slug = (file.name.trim() || "custom-loadcell").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "custom-loadcell"}.json`;
}

export function loadSavedCells(storage: Pick<Storage, "getItem">): SavedCell[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Partial<SavedCell>;
      if (typeof row.id !== "string" || !row.file) return [];
      try {
        return [{ id: row.id, savedAt: typeof row.savedAt === "string" ? row.savedAt : "", file: parseCellFile(JSON.stringify(row.file)) }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function writeSavedCells(storage: Pick<Storage, "setItem">, cells: SavedCell[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(cells));
}

/** Replace a saved cell with the same name, or append a new one. */
export function upsertSavedCell(cells: SavedCell[], file: CellFile, now = new Date().toISOString()): SavedCell[] {
  const name = file.name.trim().toLowerCase();
  const id = name ? (cells.find((cell) => cell.file.name.trim().toLowerCase() === name)?.id ?? `cell-${now}`) : `cell-${now}`;
  const next = cells.filter((cell) => cell.id !== id && cell.file.name.trim().toLowerCase() !== name);
  next.unshift({ id, savedAt: now, file });
  return next.slice(0, 24);
}
