import { cv } from '../dom';
import { clamp } from '../model/grid';
import { isBox } from '../model/types';
import { ed, S, type PPos } from '../state';

export function pos(e: { clientX: number; clientY: number }): PPos {
  const r = cv.getBoundingClientRect();
  const px = e.clientX - r.left;
  const py = e.clientY - r.top;
  const fx = px / ed.cwC;
  const fy = py / ed.chC;
  const st = ed.snapOn ? 0.5 : 0.01;
  return {
    px, py, fx, fy,
    x: clamp(Math.floor(fx), 0, ed.doc.cols - 1),
    y: clamp(Math.floor(fy), 0, ed.doc.rows - 1),
    snap: [Math.round(fx / st) * st, Math.round(fy / st) * st],
  };
}

function dseg(px: number, py: number, a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  const t = l ? clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/** Index of the topmost vector object under the pointer, or -1. */
export function hitObj(p: PPos): number {
  const s = S();
  for (let k = s.vec.length - 1; k >= 0; k--) {
    const o = s.vec[k];
    if (isBox(o)) {
      if (p.fx >= o.x && p.fx <= o.x + o.w && p.fy >= o.y && p.fy <= o.y + o.h) return k;
    } else {
      const P = o.pts.map((q) => [q[0] * ed.cwC, q[1] * ed.chC]);
      for (let i = 0; i < P.length - 1; i++) if (dseg(p.px, p.py, P[i], P[i + 1]) < 8) return k;
      if (P.length === 1 && Math.hypot(p.px - P[0][0], p.py - P[0][1]) < 8) return k;
    }
  }
  return -1;
}

/** Resize handle (plot) or point handle (path) of the selected object under the pointer. */
export function hitHandle(p: PPos): { k: 'br' } | { k: 'pt'; i: number } | null {
  const o = ed.selObj >= 0 ? S().vec[ed.selObj] : null;
  if (!o) return null;
  if (isBox(o)) {
    if (Math.hypot(p.px - (o.x + o.w) * ed.cwC, p.py - (o.y + o.h) * ed.chC) < 10) return { k: 'br' };
    return null;
  }
  for (let i = 0; i < o.pts.length; i++) if (Math.hypot(p.px - o.pts[i][0] * ed.cwC, p.py - o.pts[i][1] * ed.chC) < 10) return { k: 'pt', i };
  return null;
}
