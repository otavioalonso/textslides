/* Select tool: cell rectangles (drag to move), vector objects (drag to move, handle to resize). */
import { commit } from '../editor';
import { eqAt, expandToEquations } from '../model/equations';
import { clamp, clearRect, cloneGrid, extract, inRect, pasteBuf, rectOf, restoreGrid } from '../model/grid';
import { isBox } from '../model/types';
import { ed, G, mark, S, ui, type Drag, type PPos } from '../state';
import { hitHandle, hitObj } from './hit';

export function selectDown(p: PPos, pre: string): void {
  const hh = hitHandle(p);
  if (hh) { ed.drag = { kind: 'handle', h: hh, pre }; return; }
  const k = hitObj(p);
  if (k >= 0) {
    ed.selObj = k;
    ed.sel = null;
    const o = S().vec[k];
    ed.drag = { kind: 'objmove', pre, orig: JSON.parse(JSON.stringify(o)), sx: p.fx, sy: p.fy };
    ui.refreshInspector();
    mark();
    return;
  }
  if (ed.selObj >= 0) { ed.selObj = -1; ui.refreshInspector(); }
  const g = G();
  const geq = eqAt(g, p.x, p.y);
  if (geq && !(ed.sel && inRect(ed.sel, p.x, p.y))) ed.sel = { x: geq.x, y: geq.y, w: geq.w, h: 1 };
  const sel = ed.sel;
  if (sel && inRect(sel, p.x, p.y)) {
    ed.drag = { kind: 'selmove', pre, buf: extract(g, sel), base: cloneGrid(g), r0: { ...sel }, p0: p, moved: false };
  } else {
    ed.sel = { x: p.x, y: p.y, w: 1, h: 1 };
    ed.drag = { kind: 'selrect', p0: p, pre };
  }
  mark();
}

export function selectMove(p: PPos): void {
  const d = ed.drag;
  if (!d) return;
  const s = S();
  if (d.kind === 'selrect') ed.sel = expandToEquations(G(), rectOf(d.p0, p));
  else if (d.kind === 'selmove') {
    const g = G();
    const dx = p.x - d.p0.x;
    const dy = p.y - d.p0.y;
    restoreGrid(g, d.base);
    clearRect(g, d.r0);
    pasteBuf(g, d.buf, d.r0.x + dx, d.r0.y + dy);
    ed.sel = { x: d.r0.x + dx, y: d.r0.y + dy, w: d.r0.w, h: d.r0.h };
    d.moved = dx !== 0 || dy !== 0;
  } else if (d.kind === 'objmove') {
    const o = s.vec[ed.selObj];
    const dfx = p.fx - d.sx;
    const dfy = p.fy - d.sy;
    if (isBox(o)) {
      o.x = clamp(Math.round(d.orig.x + dfx), 0, ed.doc.cols - o.w);
      o.y = clamp(Math.round(d.orig.y + dfy), 0, ed.doc.rows - o.h);
    } else {
      const st = ed.snapOn ? 0.5 : 0.01;
      o.pts = (d.orig.pts as [number, number][]).map((q) => [Math.round((q[0] + dfx) / st) * st, Math.round((q[1] + dfy) / st) * st]);
    }
  } else if (d.kind === 'handle') {
    const ob = s.vec[ed.selObj];
    if (d.h.k === 'br' && isBox(ob)) {
      const [mw, mh] = ob.t === 'plot' ? [4, 3] : [1, 1];
      ob.w = clamp(Math.round(p.fx - ob.x), mw, ed.doc.cols - ob.x);
      ob.h = clamp(Math.round(p.fy - ob.y), mh, ed.doc.rows - ob.y);
    } else if (d.h.k === 'pt' && ob.t === 'path') ob.pts[d.h.i] = p.snap;
  }
}

export function selectUp(d: Drag): void {
  if (d.kind === 'selmove') {
    if (!d.moved) restoreGrid(G(), d.base);
    else commit(d.pre);
  } else if (d.kind === 'objmove' || d.kind === 'handle') commit(d.pre);
  // selrect: the selection simply stays.
}

/** Move the cell selection by one step (arrow keys). */
export function moveSel(dx: number, dy: number, pre: string): void {
  const sel = ed.sel;
  if (!sel) return;
  const g = G();
  const buf = extract(g, sel);
  clearRect(g, sel);
  const nx = clamp(sel.x + dx, 0, ed.doc.cols - sel.w);
  const ny = clamp(sel.y + dy, 0, ed.doc.rows - sel.h);
  pasteBuf(g, buf, nx, ny);
  ed.sel = { x: nx, y: ny, w: sel.w, h: sel.h };
  commit(pre);
  mark();
}
