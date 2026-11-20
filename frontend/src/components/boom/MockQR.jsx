import { useMemo } from "react";

// Decorative QR-style grid for the MOCK KHQR screen (not a scannable payment code).
export const MockQR = ({ seed }) => {
  const N = 25;
  const cells = useMemo(() => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const out = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const finder = (x < 7 && y < 7) || (x > N - 8 && y < 7) || (x < 7 && y > N - 8);
        if (finder) continue;
        h = (h * 1103515245 + 12345) >>> 0;
        if ((h >>> 16) % 2) out.push([x, y]);
      }
    return out;
  }, [seed]);
  const finder = (x, y) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#06070D" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#06070D" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className="w-48 h-48 bg-white rounded-lg" data-testid="mock-khqr-code" shapeRendering="crispEdges">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#06070D" />)}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
};
