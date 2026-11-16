/*
 * Heat-map / drawdown spec. Lines, in any combination:
 *   = expr          one value per pixel; x = column, y = pixel row (0-based), u, v = x, y scaled to 0..1,
 *                   rnd() and gauss() are seeded. Clamped to [-1, 1].
 *   #..#.           a pattern row: # X █ = -1 (secondary colour, "warp up"), . o = +1 (primary), anything
 *                   else = empty. Pattern and number rows are tiled to fill the object.
 *   0.2 -1 0.5      a row of numbers
 *   // comment
 */
import { mkRng } from './plot';
import type { HeatObj } from './types';

export type Px = number | null;

export interface ParsedHeat {
  px: Px[][];
  err: string;
}

function patternValue(c: string): Px {
  if (c === '#' || c === 'X' || c === 'x' || c === '█') return -1;
  if (c === '.' || c === 'o' || c === 'O') return 1;
  return null;
}

/** Pixel values for a heat object `cols` pixels wide and `prows` pixel rows tall. */
export function parseHeat(spec: string, cols: number, prows: number): ParsedHeat {
  let expr = '';
  const rows: Px[][] = [];
  for (const raw of spec.split('\n')) {
    const l = raw.replace(/\s+$/, '');
    if (!l.trim() || l.trim().startsWith('//')) continue;
    if (l.trim()[0] === '=') { expr = l.trim().slice(1).trim(); continue; }
    const toks = l.trim().split(/[\s,;]+/);
    const nums = toks.map(Number);
    if (toks.length >= 2 && nums.every(isFinite)) rows.push(nums.map((v) => Math.max(-1, Math.min(1, v))));
    else if (toks.length === 1 && /^-?\d*\.?\d+$/.test(toks[0])) rows.push([Math.max(-1, Math.min(1, +toks[0]))]);
    else rows.push(l.split('').map(patternValue));
  }
  const px: Px[][] = [];
  let err = '';
  if (expr) {
    let f: (x: number, y: number, u: number, v: number, rnd: () => number, gauss: () => number) => unknown;
    try {
      f = new Function('x', 'y', 'u', 'v', 'rnd', 'gauss', 'with(Math){return (' + expr + ')}') as typeof f;
    } catch (e) {
      return { px: [], err: String((e as Error).message || e) };
    }
    const rng = mkRng(11);
    for (let y = 0; y < prows; y++) {
      const row: Px[] = [];
      for (let x = 0; x < cols; x++) {
        let v: number;
        try { v = +(f(x, y, cols > 1 ? x / (cols - 1) : 0, prows > 1 ? y / (prows - 1) : 0, rng.rnd, rng.gauss) as number); }
        catch (e) { err = String((e as Error).message || e); v = NaN; }
        row.push(isFinite(v) ? Math.max(-1, Math.min(1, v)) : null);
      }
      px.push(row);
      if (err) break;
    }
    return { px, err };
  }
  if (!rows.length) return { px: [], err: '' };
  for (let y = 0; y < prows; y++) {
    const src = rows[y % rows.length];
    const row: Px[] = [];
    for (let x = 0; x < cols; x++) row.push(src.length ? src[x % src.length] : null);
    px.push(row);
  }
  return { px, err };
}

export function heatPixels(o: HeatObj): ParsedHeat {
  return parseHeat(o.spec, o.w, o.h * 2);
}

/**
 * The heat object as text, one string per cell row, using half blocks (top/bottom pixel → ' ▀▄█').
 * Plain text has one colour, so as in the reference drawdowns the negative (secondary-colour, "warp up")
 * pixels are the blocks; a map with no negative values shows its pixels of 0.5 and above instead.
 */
export function heatText(o: HeatObj): string[] {
  const { px } = heatPixels(o);
  const anyNeg = px.some((r) => r.some((v) => v !== null && v < 0));
  const on = (v: Px): boolean => v !== null && (anyNeg ? v < 0 : v >= 0.5);
  const out: string[] = [];
  for (let r = 0; r < o.h; r++) {
    let line = '';
    for (let c = 0; c < o.w; c++) {
      const t = on(px[2 * r]?.[c] ?? null);
      const b = on(px[2 * r + 1]?.[c] ?? null);
      line += t && b ? '█' : t ? '▀' : b ? '▄' : ' ';
    }
    out.push(line);
  }
  return out;
}

/** Spec for a newly placed heat object: a small twill drawdown. */
export const NEW_HEAT_SPEC = '// rows of # (warp up) and . (weft up) are tiled, or = expression in x, y\n#..#..\n.#..#.\n..#..#';
