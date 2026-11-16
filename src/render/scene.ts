/* Draws the current slide and the editing marks (selection, caret, hover cell) on the main canvas. */
import { ctx, cv } from '../dom';
import { FONT } from '../model/constants';
import { isBox, type Theme, type VecObj } from '../model/types';
import { ed, S, T } from '../state';
import { drawPathObj, type Pen } from './draw';
import { drawCells, drawVecs } from './slide';

export function renderCanvas(): void {
  const Th = T();
  const s = S();
  const W = ed.doc.cols;
  const H = ed.doc.rows;
  const { cwD, chD, fsD, dpr } = ed;
  const pen: Pen = { ctx, cw: cwD, ch: chD, fs: fsD };
  ctx.fillStyle = Th.bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = fsD + 'px ' + FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const edit = !ed.previewOn;
  if (edit) {
    ctx.fillStyle = Th.c[3];
    ctx.globalAlpha = 0.28;
    const dpx = Math.max(1, Math.round(dpr));
    for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) ctx.fillRect(gx * cwD + (cwD >> 1), gy * chD + (chD >> 1), dpx, dpx);
    ctx.globalAlpha = 1;
  }
  drawCells(pen, s, W, H, Th);
  drawVecs(pen, s, Th);
  if (ed.creating) {
    const pts = ed.creating.pts.slice();
    if (ed.hover) pts.push(ed.hover.snap);
    drawPathObj(ctx, { pts, smooth: ed.creating.smooth, arrow: ed.creating.arrow }, cwD, chD, Th.c[ed.attr], Math.max(1.5, cwD / 6));
  }
  const d = ed.drag;
  if (d && d.kind === 'plotnew') {
    const r = d.rect;
    ctx.strokeStyle = Th.c[2];
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x * cwD, r.y * chD, r.w * cwD, r.h * chD);
    ctx.setLineDash([]);
  }
  if (edit) {
    const sel = ed.sel;
    if (sel) {
      ctx.fillStyle = Th.c[2];
      ctx.globalAlpha = 0.16;
      ctx.fillRect(sel.x * cwD, sel.y * chD, sel.w * cwD, sel.h * chD);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = Th.c[2];
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(sel.x * cwD + 0.5, sel.y * chD + 0.5, sel.w * cwD - 1, sel.h * chD - 1);
    }
    if (ed.selObj >= 0 && s.vec[ed.selObj]) drawSelObj(s.vec[ed.selObj], Th);
    const cur = ed.cursor;
    if (ed.tool === 'text' && cur && ed.caretOn) {
      ctx.fillStyle = Th.c[2];
      ctx.fillRect(cur.x * cwD, cur.y * chD + chD - Math.max(2, dpr * 2), cwD, Math.max(2, dpr * 2));
      ctx.globalAlpha = 0.25;
      ctx.fillRect(cur.x * cwD, cur.y * chD, cwD, chD);
      ctx.globalAlpha = 1;
    }
    const t = ed.tool;
    const hv = ed.hover;
    if (hv && (t === 'box' || t === 'line' || t === 'arrow' || t === 'brush' || t === 'erase') && !ed.drag) {
      ctx.strokeStyle = Th.c[3];
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(hv.x * cwD + 0.5, hv.y * chD + 0.5, cwD - 1, chD - 1);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

function drawSelObj(o: VecObj, Th: Theme): void {
  const { cwD, chD, dpr } = ed;
  ctx.strokeStyle = Th.c[2];
  ctx.fillStyle = Th.bg;
  ctx.lineWidth = Math.max(1.5, dpr * 1.5);
  const hs = Math.max(5, Math.round(dpr * 4));
  const handle = (X: number, Y: number) => { ctx.fillRect(X - hs, Y - hs, hs * 2, hs * 2); ctx.strokeRect(X - hs, Y - hs, hs * 2, hs * 2); };
  if (isBox(o)) {
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(o.x * cwD, o.y * chD, o.w * cwD, o.h * chD);
    ctx.setLineDash([]);
    handle((o.x + o.w) * cwD, (o.y + o.h) * chD);
  } else {
    for (const p of o.pts) handle(p[0] * cwD, p[1] * chD);
  }
}
