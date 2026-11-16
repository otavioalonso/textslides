/* Drawing a slide's content, shared by the editor canvas, the player and exported presentations. */
import { ARROWS, EQ_C } from '../model/constants';
import type { Slide, Theme } from '../model/types';
import { drawGlyph, drawMask, drawPathObj, drawPlotObj, type Pen } from './draw';

/**
 * Draw the cells of rows [0, rowLimit): bars, junction masks and glyphs. Equations are not drawn here
 * (they are HTML overlays), only their bar fill. The pen's font must already be set.
 */
export function drawCells(p: Pen, s: Slide, cols: number, rows: number, Th: Theme, rowLimit = rows): void {
  const { ctx, cw, ch } = p;
  const lw = Math.max(1, Math.round(cw / 7));
  for (let y = 0; y < Math.min(rows, rowLimit); y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const c = s.ch[i];
      const m = s.mk[i];
      const av = s.at[i] || 0;
      const rv = av >= 4;
      if (!c && !m && !rv) continue;
      const X = x * cw;
      const Y = y * ch;
      let col = Th.c[av & 3];
      if (rv) { ctx.fillStyle = col; ctx.fillRect(X, Y, cw, ch); col = Th.bg; }
      if (c === EQ_C || c.length > 1) continue;
      if (m && (!c || ARROWS[c])) drawMask(p, X, Y, m, lw, col);
      if (c && c !== ' ') drawGlyph(p, X, Y, c, col);
    }
}

/** Draw the vector objects (plots, legacy paths) whose bottom edge is within the first `rowLimit` rows. */
export function drawVecs(p: Pen, s: Slide, Th: Theme, rowLimit = Infinity): void {
  const { ctx, cw, ch, fs } = p;
  for (const o of s.vec) {
    if (o.t === 'path') {
      if (Math.max(...o.pts.map((q) => q[1])) <= rowLimit) drawPathObj(ctx, o, cw, ch, Th.c[o.attr || 0], Math.max(1.5, cw / 6));
    } else if (o.t === 'plot') {
      if (o.y + o.h <= rowLimit) drawPlotObj(ctx, o, cw, ch, Th, fs, Math.max(1.5, cw / 6));
    }
  }
}

/** One absolutely placed equation element for an overlay, in CSS pixels. */
export function eqElement(x: number, y: number, w: number, cw: number, ch: number, color: string, html: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'eq';
  d.style.left = x * cw + 'px';
  d.style.top = y * ch + 'px';
  d.style.width = w * cw + 'px';
  d.style.height = ch + 'px';
  d.style.color = color;
  d.innerHTML = html;
  return d;
}
