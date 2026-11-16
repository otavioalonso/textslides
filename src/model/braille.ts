/*
 * Braille plots: a plot's series rasterised into braille characters, 2×4 dots per cell, so the curve is part
 * of the character grid (and of the plain text). Consecutive points are joined with straight dot lines.
 */
import type { ParsedPlot } from './plot';

/** Bit of the braille dot at column c (0–1), row r (0–3) of a cell. */
const DOT = [[0x01, 0x02, 0x04, 0x40], [0x08, 0x10, 0x20, 0x80]];

export interface BrailleRaster {
  /** One string per cell row; ' ' where no dot is set. */
  rows: string[];
  /** Series index that last drew in each cell (for colour), -1 if none; [row][col]. */
  series: number[][];
}

/** Rasterise into `w` × `h` cells. The first row holds the title when there is one. */
export function brailleRaster(P: ParsedPlot, w: number, h: number): BrailleRaster {
  const top = P.title ? 1 : 0;
  const ph = h - top;
  const bits: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  const series: number[][] = Array.from({ length: h }, () => new Array(w).fill(-1));
  const W = w * 2;
  const H = ph * 4;
  const dot = (X: number, Y: number, si: number) => {
    if (X < 0 || Y < 0 || X >= W || Y >= H) return;
    const cx = X >> 1;
    const cy = (Y >> 2) + top;
    bits[cy][cx] |= DOT[X & 1][Y & 3];
    series[cy][cx] = si;
  };
  if (ph > 0 && P.xr[1] !== P.xr[0] && P.yr[1] !== P.yr[0]) {
    P.series.forEach((s, si) => {
      let last: [number, number] | null = null;
      for (const [x, y] of s.pts || []) {
        const X = Math.round(((x - P.xr[0]) / (P.xr[1] - P.xr[0])) * (W - 1));
        const Y = Math.round((1 - (y - P.yr[0]) / (P.yr[1] - P.yr[0])) * (H - 1));
        if (last) line(last[0], last[1], X, Y, (a, b) => dot(a, b, si));
        else dot(X, Y, si);
        last = [X, Y];
      }
    });
  }
  const rows = bits.map((r) => r.map((b) => (b ? String.fromCharCode(0x2800 + b) : ' ')).join(''));
  if (top) rows[0] = (P.title + ' '.repeat(w)).slice(0, w);
  return { rows, series };
}

function line(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => void): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let e = dx - dy;
  for (;;) {
    fn(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 > -dy) { e -= dy; x0 += sx; }
    if (e2 < dx) { e += dx; y0 += sy; }
  }
}

export function isBraille(c: string): boolean {
  const k = c.charCodeAt(0);
  return c.length === 1 && k >= 0x2800 && k <= 0x28ff;
}
