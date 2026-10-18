import outline from "@/data/outline.json";

const KIND_FILL: Record<string, string> = {
  outline: "#d5dbe0",
  window: "#f6f3ec",
  slot: "#f6f3ec",
  hole: "#f6f3ec",
};

export function CellOutline({ className }: { className?: string }) {
  const { widthMm, heightMm, loops } = outline;
  return (
    <svg
      viewBox={`-0.8 -0.8 ${widthMm + 1.6} ${heightMm + 1.6}`}
      className={className}
      role="img"
      aria-label="Laser-cut outline of the 38 by 24 millimeter loadcell"
    >
      <rect x={-0.8} y={-0.8} width={widthMm + 1.6} height={heightMm + 1.6} fill="#f6f3ec" />
      {loops.map((loop) => (
        <polygon
          key={loop.id}
          points={loop.pts.map(([x, y]) => `${x},${heightMm - y}`).join(" ")}
          fill={KIND_FILL[loop.kind] ?? "#f6f3ec"}
          stroke="#1c1915"
          strokeWidth={loop.kind === "outline" ? 0.18 : 0.1}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
