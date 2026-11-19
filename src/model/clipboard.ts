/*
 * Copy and paste of slide content: a rectangle of cells together with the objects (plots, heat maps, curves)
 * lying inside it, or a single object. The clip keeps where it was copied from, so pasting on another slide
 * puts it in the same place unless a target is given.
 */
import { extract, pasteBuf } from './grid';
import type { Buf, Grid, Rect, VecObj } from './types';

export interface Clip {
  /** Where it was copied from; objects and cells are stored relative to this corner. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The cells, or null when only objects were copied. */
  buf: Buf | null;
  objs: VecObj[];
}

/** Bounding box of an object in cells. */
export function objBox(o: VecObj): Rect {
  if (o.t !== 'path') return { x: o.x, y: o.y, w: o.w, h: o.h };
  const xs = o.pts.map((p) => p[0]);
  const ys = o.pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return { x, y, w: Math.ceil(Math.max(...xs)) - x || 1, h: Math.ceil(Math.max(...ys)) - y || 1 };
}

function inside(r: Rect, b: Rect): boolean {
  return b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h;
}

function moved(o: VecObj, dx: number, dy: number): VecObj {
  const c = JSON.parse(JSON.stringify(o)) as VecObj;
  if (c.t === 'path') c.pts = c.pts.map((p) => [p[0] + dx, p[1] + dy]);
  else { c.x += dx; c.y += dy; }
  return c;
}

/** Copy the cells of `r` and every object lying entirely inside it. */
export function copyRegion(g: Grid, r: Rect): Clip {
  const objs = g.s.vec.filter((o) => inside(r, objBox(o))).map((o) => moved(o, -r.x, -r.y));
  return { ...r, buf: extract(g, r), objs };
}

/** Copy one object. */
export function copyObject(o: VecObj): Clip {
  const b = objBox(o);
  return { ...b, buf: null, objs: [moved(o, -b.x, -b.y)] };
}

/** Indices of the objects a region copy would take, e.g. to remove them on cut. */
export function objectsIn(g: Grid, r: Rect): number[] {
  return g.s.vec.map((o, i) => (inside(r, objBox(o)) ? i : -1)).filter((i) => i >= 0);
}

/**
 * Paste with the top-left corner at (x, y), moved left / up as needed so it stays on the slide.
 * Returns where it landed and the indices of the pasted objects in `g.s.vec`.
 */
export function pasteClip(g: Grid, c: Clip, x = c.x, y = c.y): { rect: Rect; objs: number[] } {
  const px = Math.max(0, Math.min(x, g.cols - c.w));
  const py = Math.max(0, Math.min(y, g.rows - c.h));
  if (c.buf) pasteBuf(g, c.buf, px, py);
  const objs: number[] = [];
  for (const o of c.objs) {
    g.s.vec.push(moved(o, px, py));
    objs.push(g.s.vec.length - 1);
  }
  return { rect: { x: px, y: py, w: Math.min(c.w, g.cols), h: Math.min(c.h, g.rows) }, objs };
}
