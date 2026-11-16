/* Cell-level drawing operations. Every function works on an explicit Grid so it can be tested on its own. */
import { D, L, R, U } from './constants';
import { eqAt, eqClear } from './equations';
import { inb, ix } from './grid-base';
import type { Attr, Buf, Grid, Pt, Rect } from './types';

export { clamp, inb, ix, mkSlide } from './grid-base';

/** Write one character, removing any line junction and any equation it lands on. */
export function putCh(g: Grid, x: number, y: number, c: string, a: Attr): void {
  if (!inb(g, x, y)) return;
  const e = eqAt(g, x, y);
  if (e) eqClear(g, e);
  const i = ix(g, x, y);
  g.s.ch[i] = c;
  g.s.mk[i] = 0;
  g.s.at[i] = a;
}

export function putText(g: Grid, x: number, y: number, str: string, a: Attr): void {
  for (let i = 0; i < str.length; i++) putCh(g, x + i, y, str[i], a);
}

/** Erase a cell completely and cut the neighbours' line stubs that pointed into it. */
export function clearCell(g: Grid, x: number, y: number): void {
  if (!inb(g, x, y)) return;
  const e = eqAt(g, x, y);
  if (e) eqClear(g, e);
  const s = g.s;
  const i = ix(g, x, y);
  s.ch[i] = '';
  s.mk[i] = 0;
  s.at[i] = 0;
  if (inb(g, x, y - 1)) s.mk[ix(g, x, y - 1)] &= ~D;
  if (inb(g, x + 1, y)) s.mk[ix(g, x + 1, y)] &= ~L;
  if (inb(g, x, y + 1)) s.mk[ix(g, x, y + 1)] &= ~U;
  if (inb(g, x - 1, y)) s.mk[ix(g, x - 1, y)] &= ~R;
}

function bits(g: Grid, x: number, y: number, m: number, a: Attr): void {
  if (!inb(g, x, y)) return;
  const s = g.s;
  const i = ix(g, x, y);
  s.mk[i] |= m;
  s.at[i] = a;
  if (s.ch[i] === ' ') s.ch[i] = '';
}

/** Join two orthogonally adjacent cells: set the facing bits on both. */
export function linkStep(g: Grid, x0: number, y0: number, x1: number, y1: number, a: Attr): void {
  if (x1 > x0) { bits(g, x0, y0, R, a); bits(g, x1, y1, L, a); }
  else if (x1 < x0) { bits(g, x0, y0, L, a); bits(g, x1, y1, R, a); }
  else if (y1 > y0) { bits(g, x0, y0, D, a); bits(g, x1, y1, U, a); }
  else if (y1 < y0) { bits(g, x0, y0, U, a); bits(g, x1, y1, D, a); }
}

/** Straight (or diagonal-stepping) segment of joined cells from (x0, y0) to (x1, y1). */
export function seg(g: Grid, x0: number, y0: number, x1: number, y1: number, a: Attr): void {
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    const nx = x + dx;
    const ny = y + dy;
    linkStep(g, x, y, nx, ny, a);
    x = nx;
    y = ny;
  }
}

/** L-shaped route from a to b: horizontal first, or vertical first. Returns the corner. */
export function route(g: Grid, a: Pt, b: Pt, vfirst: boolean, at: Attr): { cx: number; cy: number } {
  const cx = vfirst ? a.x : b.x;
  const cy = vfirst ? b.y : a.y;
  seg(g, a.x, a.y, cx, cy, at);
  seg(g, cx, cy, b.x, b.y, at);
  return { cx, cy };
}

export function drawLine(g: Grid, a: Pt, b: Pt, vfirst: boolean, arrow: boolean, at: Attr): void {
  route(g, a, b, vfirst, at);
  if (arrow && (a.x !== b.x || a.y !== b.y)) {
    const cx = vfirst ? a.x : b.x;
    const cy = vfirst ? b.y : a.y;
    let px: number;
    let py: number;
    if (cx === b.x && cy === b.y) { px = a.x; py = a.y; }
    else { px = cx; py = cy; }
    const ch = b.x > px ? '▶' : b.x < px ? '◀' : b.y > py ? '▼' : '▲';
    if (inb(g, b.x, b.y)) {
      const i = ix(g, b.x, b.y);
      g.s.ch[i] = ch;
      g.s.at[i] = at;
    }
  }
}

export function drawBox(g: Grid, a: Pt, b: Pt, at: Attr): void {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  if (x0 === x1 || y0 === y1) { seg(g, x0, y0, x1, y1, at); return; }
  seg(g, x0, y0, x1, y0, at);
  seg(g, x0, y1, x1, y1, at);
  seg(g, x0, y0, x0, y1, at);
  seg(g, x1, y0, x1, y1, at);
}

/** Bresenham walk over the cells between two points (inclusive). */
export function bres(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => void): void {
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

export interface GridCopy {
  ch: string[];
  mk: number[];
  at: Attr[];
}

export function cloneGrid(g: Grid): GridCopy {
  return { ch: g.s.ch.slice(), mk: g.s.mk.slice(), at: g.s.at.slice() };
}

export function restoreGrid(g: Grid, c: GridCopy): void {
  g.s.ch = c.ch.slice();
  g.s.mk = c.mk.slice();
  g.s.at = c.at.slice();
}

export function rectOf(a: Pt, b: Pt): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 };
}

export function inRect(r: Rect | null, x: number, y: number): boolean {
  return !!r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function extract(g: Grid, r: Rect): Buf {
  const o: Buf = { w: r.w, h: r.h, ch: [], mk: [], at: [] };
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      if (inb(g, r.x + x, r.y + y)) {
        const i = ix(g, r.x + x, r.y + y);
        o.ch.push(g.s.ch[i]);
        o.mk.push(g.s.mk[i]);
        o.at.push(g.s.at[i]);
      } else {
        o.ch.push('');
        o.mk.push(0);
        o.at.push(0);
      }
    }
  return o;
}

/** Clear characters and junctions in a rectangle (attributes, including bars, stay). */
export function clearRect(g: Grid, r: Rect): void {
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++)
      if (inb(g, r.x + x, r.y + y)) {
        const i = ix(g, r.x + x, r.y + y);
        g.s.ch[i] = '';
        g.s.mk[i] = 0;
      }
}

/**
 * Paste the non-empty cells of a buffer with its top-left at (px, py). Equations in the grid that a pasted
 * cell lands on are removed first, as when typing over them, so no broken equation group is left behind.
 */
export function pasteBuf(g: Grid, b: Buf, px: number, py: number): void {
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const k = y * b.w + x;
      if (!b.ch[k] && !b.mk[k]) continue;
      const e = eqAt(g, px + x, py + y);
      if (e) eqClear(g, e);
    }
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const k = y * b.w + x;
      if (!b.ch[k] && !b.mk[k]) continue;
      if (!inb(g, px + x, py + y)) continue;
      const i = ix(g, px + x, py + y);
      g.s.ch[i] = b.ch[k];
      g.s.mk[i] = b.mk[k];
      g.s.at[i] = b.at[k];
    }
}

/** Copy a slide into a new grid size, keeping the top-left overlap. */
export function resizeSlide(from: Grid, cols: number, rows: number): Grid['s'] {
  const n = { ch: new Array(cols * rows).fill(''), mk: new Array(cols * rows).fill(0), at: new Array(cols * rows).fill(0), vec: from.s.vec };
  for (let y = 0; y < Math.min(rows, from.rows); y++)
    for (let x = 0; x < Math.min(cols, from.cols); x++) {
      const a = y * from.cols + x;
      const b = y * cols + x;
      n.ch[b] = from.s.ch[a];
      n.mk[b] = from.s.mk[a];
      n.at[b] = from.s.at[a];
    }
  return n;
}
