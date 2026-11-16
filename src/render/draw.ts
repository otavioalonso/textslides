/*
 * Canvas primitives. Lines, blocks, shades and arrow heads are painted as shapes, never typed as font glyphs,
 * so they land exactly on the cell grid.
 */
import { ARROWS, D, FONT, L, R, U } from '../model/constants';
import { brailleRaster, isBraille } from '../model/braille';
import { heatPixels } from '../model/heat';
import { fmtTick, niceTicks, parsePlot } from '../model/plot';
import type { HeatObj, PathObj, PlotObj, Theme } from '../model/types';

/** A canvas plus the cell size (device pixels) and font size to draw with. */
export interface Pen {
  ctx: CanvasRenderingContext2D;
  cw: number;
  ch: number;
  fs: number;
}

export function drawMask(p: Pen, x: number, y: number, m: number, t: number, col: string): void {
  const { ctx, cw, ch } = p;
  const cx = x + (cw >> 1);
  const cy = y + (ch >> 1);
  const h = t >> 1;
  const lx = cx - h;
  const ly = cy - h;
  ctx.fillStyle = col;
  if (m & R) ctx.fillRect(lx, ly, x + cw - lx, t);
  if (m & L) ctx.fillRect(x, ly, lx + t - x, t);
  if (m & D) ctx.fillRect(lx, ly, t, y + ch - ly);
  if (m & U) ctx.fillRect(lx, y, t, ly + t - y);
}

export function drawArrowHead(p: Pen, x: number, y: number, c: string, col: string): void {
  const { ctx, cw, ch } = p;
  const cx = x + cw / 2;
  const cy = y + ch / 2;
  const a = cw * 0.5;
  const b = cw * 0.42;
  ctx.fillStyle = col;
  ctx.beginPath();
  if (c === '▶') { ctx.moveTo(cx - a, cy - b); ctx.lineTo(cx + a, cy); ctx.lineTo(cx - a, cy + b); }
  else if (c === '◀') { ctx.moveTo(cx + a, cy - b); ctx.lineTo(cx - a, cy); ctx.lineTo(cx + a, cy + b); }
  else if (c === '▲') { ctx.moveTo(cx - b, cy + a); ctx.lineTo(cx, cy - a); ctx.lineTo(cx + b, cy + a); }
  else { ctx.moveTo(cx - b, cy - a); ctx.lineTo(cx, cy + a); ctx.lineTo(cx + b, cy - a); }
  ctx.closePath();
  ctx.fill();
}

/** Braille dots painted as squares on whole pixels (bit layout of U+2800). */
export function drawBrailleDots(p: Pen, x: number, y: number, m: number, col: string): void {
  const { ctx, cw, ch } = p;
  const sz = Math.max(2, Math.round(cw * 0.3));
  const bx = [0.28, 0.72];
  const by = [0.125, 0.375, 0.625, 0.875];
  const map = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [1, 3]];
  ctx.fillStyle = col;
  for (let b = 0; b < 8; b++)
    if (m & (1 << b)) ctx.fillRect(Math.round(x + cw * bx[map[b][0]] - sz / 2), Math.round(y + ch * by[map[b][1]] - sz / 2), sz, sz);
}

export function drawGlyph(p: Pen, x: number, y: number, c: string, col: string): void {
  const { ctx, cw, ch, fs } = p;
  ctx.fillStyle = col;
  switch (c) {
    case '█': ctx.fillRect(x, y, cw, ch); return;
    case '▀': ctx.fillRect(x, y, cw, ch >> 1); return;
    case '▄': ctx.fillRect(x, y + (ch >> 1), cw, ch - (ch >> 1)); return;
    case '▌': ctx.fillRect(x, y, cw >> 1, ch); return;
    case '▐': ctx.fillRect(x + (cw >> 1), y, cw - (cw >> 1), ch); return;
    case '░': ctx.globalAlpha = 0.25; ctx.fillRect(x, y, cw, ch); ctx.globalAlpha = 1; return;
    case '▒': ctx.globalAlpha = 0.5; ctx.fillRect(x, y, cw, ch); ctx.globalAlpha = 1; return;
    case '▓': ctx.globalAlpha = 0.75; ctx.fillRect(x, y, cw, ch); ctx.globalAlpha = 1; return;
  }
  if (ARROWS[c]) { drawArrowHead(p, x, y, c, col); return; }
  if (isBraille(c)) { drawBrailleDots(p, x, y, c.charCodeAt(0) - 0x2800, col); return; }
  ctx.fillText(c, x, y + ch / 2 + fs * 0.04);
}

function polyPath(c: CanvasRenderingContext2D, pts: [number, number][], smooth: boolean, px: number, py: number): void {
  c.beginPath();
  const P = pts.map((p) => [p[0] * px, p[1] * py]);
  if (!P.length) return;
  c.moveTo(P[0][0], P[0][1]);
  if (!smooth || P.length < 3) {
    for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]);
    return;
  }
  for (let j = 0; j < P.length - 1; j++) {
    const p0 = P[Math.max(0, j - 1)];
    const p1 = P[j];
    const p2 = P[j + 1];
    const p3 = P[Math.min(P.length - 1, j + 2)];
    c.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
}

export function drawPathObj(
  c: CanvasRenderingContext2D, o: Pick<PathObj, 'pts' | 'smooth' | 'arrow'> & { dash?: boolean },
  px: number, py: number, col: string, lw: number,
): void {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.setLineDash(o.dash ? [lw * 3, lw * 2.5] : []);
  polyPath(c, o.pts, o.smooth, px, py);
  c.stroke();
  c.setLineDash([]);
  if (o.arrow && o.pts.length > 1) {
    const n = o.pts.length;
    const a = o.pts[n - 1];
    let b = o.pts[n - 2];
    if (o.smooth && n > 2) b = [a[0] - ((o.pts[n - 1][0] - o.pts[n - 3][0]) / 6) * 3, a[1] - ((o.pts[n - 1][1] - o.pts[n - 3][1]) / 6) * 3];
    const ang = Math.atan2((a[1] - b[1]) * py, (a[0] - b[0]) * px);
    const L1 = lw * 5.5;
    const X = a[0] * px;
    const Y = a[1] * py;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(X, Y);
    c.lineTo(X - L1 * Math.cos(ang - 0.42), Y - L1 * Math.sin(ang - 0.42));
    c.lineTo(X - L1 * Math.cos(ang + 0.42), Y - L1 * Math.sin(ang + 0.42));
    c.closePath();
    c.fill();
  }
}

export function drawPlotObj(
  c: CanvasRenderingContext2D, o: PlotObj, px: number, py: number, Th: Theme, fs: number, lw: number,
): void {
  const P = parsePlot(o.spec);
  if (P.style === 'braille') { drawBraillePlot(c, o, px, py, Th, fs); return; }
  const X = o.x * px;
  const Y = o.y * py;
  const W = o.w * px;
  const H = o.h * py;
  c.fillStyle = Th.bg;
  c.fillRect(X, Y, W, H);
  const ml = Math.min(5 * px, W * 0.28);
  let mb = Math.min(1.4 * py, H * 0.3);
  const mt = (P.title ? 1 : 0.4) * py;
  const mr = px * 1.2;
  if (P.xl) mb += py * 0.75;
  const ax = X + ml;
  const ay = Y + mt;
  const aw = W - ml - mr;
  const ah = H - mt - mb;
  if (aw < 20 || ah < 20) return;
  c.font = fs * 0.82 + 'px ' + FONT;
  c.textBaseline = 'middle';
  c.lineWidth = Math.max(1, lw * 0.5);
  const xs = niceTicks(P.xr[0], P.xr[1], Math.max(2, Math.floor(aw / (px * 8))));
  const ys = niceTicks(P.yr[0], P.yr[1], Math.max(2, Math.floor(ah / (py * 2.6))));
  const sx = (v: number) => ax + ((v - P.xr[0]) / (P.xr[1] - P.xr[0])) * aw;
  const sy = (v: number) => ay + ah - ((v - P.yr[0]) / (P.yr[1] - P.yr[0])) * ah;
  c.strokeStyle = Th.c[3];
  c.fillStyle = Th.c[3];
  c.globalAlpha = 0.22;
  for (const v of xs) { const q = Math.round(sx(v)) + 0.5; c.beginPath(); c.moveTo(q, ay); c.lineTo(q, ay + ah); c.stroke(); }
  for (const v of ys) { const q = Math.round(sy(v)) + 0.5; c.beginPath(); c.moveTo(ax, q); c.lineTo(ax + aw, q); c.stroke(); }
  c.globalAlpha = 1;
  c.strokeRect(Math.round(ax) + 0.5, Math.round(ay) + 0.5, Math.round(aw), Math.round(ah));
  c.textAlign = 'center';
  for (const v of xs) c.fillText(fmtTick(v), sx(v), ay + ah + py * 0.75);
  c.textAlign = 'right';
  for (const v of ys) c.fillText(fmtTick(v), ax - px * 0.5, sy(v));
  c.textAlign = 'left';
  if (P.title) { c.fillStyle = Th.c[1]; c.fillText(P.title, ax, Y + py * 0.45); }
  if (P.xl) { c.fillStyle = Th.c[0]; c.textAlign = 'center'; c.fillText(P.xl, ax + aw / 2, Y + H - py * 0.45); c.textAlign = 'left'; }
  if (P.yl) {
    c.save();
    c.translate(X + px * 0.6, ay + ah / 2);
    c.rotate(-Math.PI / 2);
    c.fillStyle = Th.c[0];
    c.textAlign = 'center';
    c.fillText(P.yl, 0, 0);
    c.restore();
  }
  c.save();
  c.beginPath();
  c.rect(ax, ay, aw, ah);
  c.clip();
  const cols = [Th.p, Th.q, Th.c[1], Th.c[3]];
  P.series.forEach((s, si) => {
    if (!s.pts || s.pts.length < 2) return;
    c.strokeStyle = cols[si % cols.length];
    c.lineWidth = lw * 1.15;
    c.lineJoin = 'round';
    c.beginPath();
    s.pts.forEach((p, i) => { const a = sx(p[0]); const b = sy(p[1]); if (i) c.lineTo(a, b); else c.moveTo(a, b); });
    c.stroke();
  });
  c.restore();
  c.textBaseline = 'alphabetic';
}

function hexRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/**
 * Heat map: pixels one cell wide, half a cell tall, on whole device pixels. Positive values blend from the
 * background to the primary plot colour, negative to the secondary (as in the reference player's drawdowns).
 */
export function drawHeatObj(c: CanvasRenderingContext2D, o: HeatObj, cw: number, ch: number, Th: Theme): void {
  const { px } = heatPixels(o);
  const bg = hexRgb(Th.bg);
  const pc = hexRgb(Th.p);
  const qc = hexRgb(Th.q);
  c.fillStyle = Th.bg;
  c.fillRect(o.x * cw, o.y * ch, o.w * cw, o.h * ch);
  for (let r = 0; r < px.length; r++) {
    const y0 = Math.round((o.y + r / 2) * ch);
    const y1 = Math.round((o.y + (r + 1) / 2) * ch);
    for (let k = 0; k < px[r].length; k++) {
      const v = px[r][k];
      if (v === null) continue;
      const a = Math.min(1, Math.pow(Math.abs(v), 0.85));
      const col = v >= 0 ? pc : qc;
      c.fillStyle = 'rgb(' + col.map((cc, i) => Math.round(bg[i] + (cc - bg[i]) * a)).join(',') + ')';
      c.fillRect((o.x + k) * cw, y0, cw, y1 - y0);
    }
  }
}

/** A braille plot: background, title in the first row, dots coloured per series. */
function drawBraillePlot(c: CanvasRenderingContext2D, o: PlotObj, cw: number, ch: number, Th: Theme, fs: number): void {
  const P = parsePlot(o.spec);
  const R = brailleRaster(P, o.w, o.h);
  const cols = [Th.p, Th.q, Th.c[1], Th.c[3]];
  const pen: Pen = { ctx: c, cw, ch, fs };
  c.fillStyle = Th.bg;
  c.fillRect(o.x * cw, o.y * ch, o.w * cw, o.h * ch);
  c.font = fs + 'px ' + FONT;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  R.rows.forEach((line, r) => {
    for (let k = 0; k < line.length; k++) {
      const g = line[k];
      if (g === ' ') continue;
      const X = (o.x + k) * cw;
      const Y = (o.y + r) * ch;
      if (isBraille(g)) drawBrailleDots(pen, X, Y, g.charCodeAt(0) - 0x2800, cols[R.series[r][k] % cols.length]);
      else drawGlyph(pen, X, Y, g, Th.c[1]);
    }
  });
  c.textBaseline = 'alphabetic';
}
