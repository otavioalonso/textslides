/*
 * Equations live in the grid as a group of cells: one anchor cell holding the LaTeX source and the
 * reserved width in cells, followed by `width - 1` continuation cells. The source never occupies grid space.
 */
import { EQ_A, EQ_C } from './constants';
import type { Attr, Grid } from './types';
import { inb, ix } from './grid-base';

export interface EqInfo {
  disp: boolean;
  w: number;
  tex: string;
}

export interface EqGroup extends EqInfo {
  x: number;
  y: number;
  at: Attr;
}

export function eqEncode(tex: string, disp: boolean, w: number): string {
  return EQ_A + (disp ? 'D' : 'I') + w + ':' + tex;
}

export function eqParse(c: string | undefined): EqInfo | null {
  const m = c && c.charCodeAt(0) === 2 ? c.match(/^\u0002([DI])(\d+):([\s\S]*)$/) : null;
  return m ? { disp: m[1] === 'D', w: +m[2], tex: m[3] } : null;
}

/** The equation group covering cell (x, y), if any. */
export function eqAt(g: Grid, x: number, y: number): EqGroup | null {
  if (!inb(g, x, y)) return null;
  const s = g.s;
  const c = s.ch[ix(g, x, y)];
  if (c === EQ_C) {
    for (let k = x - 1; k >= 0; k--) {
      const ck = s.ch[ix(g, k, y)];
      const a = eqParse(ck);
      if (a) {
        if (k + a.w > x) return { ...a, x: k, y, at: s.at[ix(g, k, y)] || 0 };
        return null;
      }
      if (ck !== EQ_C) return null;
    }
    return null;
  }
  const a = eqParse(c);
  if (a) return { ...a, x, y, at: s.at[ix(g, x, y)] || 0 };
  return null;
}

/** Clear the characters of a whole equation group (attributes are kept). */
export function eqClear(g: Grid, e: EqGroup): void {
  const s = g.s;
  for (let k = 0; k < e.w; k++) {
    const X = e.x + k;
    if (!inb(g, X, e.y)) continue;
    const i = ix(g, X, e.y);
    if (k === 0 || s.ch[i] === EQ_C) s.ch[i] = '';
  }
}

/** All equation anchors on a slide, in reading order. */
export function eqList(g: Grid): EqGroup[] {
  const out: EqGroup[] = [];
  for (let y = 0; y < g.rows; y++)
    for (let x = 0; x < g.cols; x++) {
      const c = g.s.ch[ix(g, x, y)];
      if (!c || c.charCodeAt(0) !== 2) continue;
      const a = eqParse(c);
      if (a) out.push({ ...a, x, y, at: g.s.at[ix(g, x, y)] || 0 });
    }
  return out;
}

/**
 * Place an equation at (x, y). `cells` is its rendered width in cells (measured by the caller);
 * it is cut at the right edge of the grid. Any equation it overlaps is removed.
 * Returns the width actually used, 0 if nothing was placed.
 */
export function putEq(g: Grid, x: number, y: number, tex: string, disp: boolean, at: Attr, cells: number): number {
  const w = Math.min(cells, g.cols - x);
  if (w < 1) return 0;
  for (let k = 0; k < w; k++) {
    const e = eqAt(g, x + k, y);
    if (e) eqClear(g, e);
  }
  const s = g.s;
  for (let j = 0; j < w; j++) {
    const i = ix(g, x + j, y);
    s.ch[i] = j === 0 ? eqEncode(tex, disp, w) : EQ_C;
    s.mk[i] = 0;
    s.at[i] = at;
  }
  return w;
}

/**
 * Grow a rectangle sideways until it cuts no equation group in two, so moving or copying a selection
 * always carries whole equations.
 */
export function expandToEquations(g: Grid, r: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = r;
  for (let changed = true; changed;) {
    changed = false;
    for (let yy = y; yy < y + h; yy++)
      for (const xx of [x, x + w - 1]) {
        const e = eqAt(g, xx, yy);
        if (!e) continue;
        const x0 = Math.min(x, e.x);
        const x1 = Math.max(x + w, e.x + e.w);
        if (x0 !== x || x1 !== x + w) { x = x0; w = x1 - x0; changed = true; }
      }
  }
  return { x, y, w, h };
}
