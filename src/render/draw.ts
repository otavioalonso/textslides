/*
 * Canvas primitives. Lines, blocks, shades and arrow heads are painted as shapes, never typed as font glyphs,
 * so they land exactly on the cell grid.
 */
import { ARROWS, D, FONT, L, R, U } from '../model/constants';
import { brailleRaster, isBraille } from '../model/braille';
import { heatPixels } from '../model/heat';
import { fmtLogTick, fmtTick, logTicks, niceTicks, parseOf, type ParsedPlot, type Series } from '../model/plot';
import type { DImage } from '../model/plotdata';
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

/** Geometry of a vector plot in canvas pixels: outer box, axes box, and value → pixel maps. */
export function plotFrame(o: PlotObj, P: ParsedPlot, px: number, py: number) {
  const X = o.x * px;
  const Y = o.y * py;
  const W = o.w * px;
  const H = o.h * py;
  const ml = Math.min(5 * px, W * 0.28);
  let mb = Math.min(1.4 * py, H * 0.3);
  const mt = (P.title ? 1 : 0.4) * py;
  const mr = px * 1.2;
  if (P.xl) mb += py * 0.75;
  const ax = X + ml;
  const ay = Y + mt;
  const aw = W - ml - mr;
  const ah = H - mt - mb;
  const lg = Math.log10;
  const sx = P.xlog
    ? (v: number) => ax + ((lg(v) - lg(P.xr[0])) / (lg(P.xr[1]) - lg(P.xr[0]))) * aw
    : (v: number) => ax + ((v - P.xr[0]) / (P.xr[1] - P.xr[0])) * aw;
  const sy = P.ylog
    ? (v: number) => ay + ah - ((lg(v) - lg(P.yr[0])) / (lg(P.yr[1]) - lg(P.yr[0]))) * ah
    : (v: number) => ay + ah - ((v - P.yr[0]) / (P.yr[1] - P.yr[0])) * ah;
  return { X, Y, W, H, ax, ay, aw, ah, sx, sy };
}

/**
 * Hover read-out on a vector plot (player): a vertical line at data x `xv` and, per series, a dot where it
 * crosses and its value, plus x, written in the plot's top-right corner.
 */
export function drawPlotHover(c: CanvasRenderingContext2D, o: PlotObj, px: number, py: number, Th: Theme, fs: number, xv: number): void {
  const P = parseOf(o);
  if (P.style === 'braille') return;
  const { ax, ay, aw, ah, sx, sy } = plotFrame(o, P, px, py);
  if (aw < 20 || ah < 20) return;
  const X = Math.round(sx(xv)) + 0.5;
  c.save();
  c.strokeStyle = Th.c[1];
  c.globalAlpha = 0.55;
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(X, ay); c.lineTo(X, ay + ah); c.stroke();
  c.globalAlpha = 1;
  const cols = [Th.p, Th.q, Th.c[1], Th.c[3]];
  const lines: [string, string][] = [['x ' + fmtTick(+xv.toPrecision(4)), Th.c[1]]];
  P.series.forEach((s, si) => {
    const pts = (s.pts || []).filter((p) => isFinite(p[1]));
    if (!pts.length) return;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - xv) < Math.abs(best[0] - xv)) best = p;
    const col = cols[(s.color ?? si) % cols.length];
    c.fillStyle = col;
    c.beginPath(); c.arc(sx(best[0]), sy(best[1]), Math.max(2.5, px * 0.3), 0, 6.2832); c.fill();
    lines.push([fmtTick(+best[1].toPrecision(3)), col]);
  });
  c.font = fs * 0.82 + 'px ' + FONT;
  c.textAlign = 'right';
  c.textBaseline = 'top';
  lines.forEach(([t, col], i) => {
    const ty = ay + 4 + i * fs * 1.1;
    c.fillStyle = Th.bg;
    const w = c.measureText(t).width;
    c.fillRect(ax + aw - 6 - w - 3, ty - 1, w + 6, fs);
    c.fillStyle = col;
    c.fillText(t, ax + aw - 6, ty);
  });
  c.restore();
}

export function drawPlotObj(
  c: CanvasRenderingContext2D, o: PlotObj, px: number, py: number, Th: Theme, fs: number, lw: number,
): void {
  const P = parseOf(o);
  if (P.style === 'braille') { drawBraillePlot(c, o, px, py, Th, fs); return; }
  const { X, Y, W, H, ax, ay, aw, ah, sx, sy } = plotFrame(o, P, px, py);
  c.fillStyle = Th.bg;
  c.fillRect(X, Y, W, H);
  if (aw < 20 || ah < 20) return;
  c.font = fs * 0.82 + 'px ' + FONT;
  c.textBaseline = 'middle';
  c.lineWidth = Math.max(1, lw * 0.5);
  // Ranges may run backwards (an inverted axis, e.g. imshow's y): ticks are found on the sorted range.
  const [x0, x1] = P.xr[0] <= P.xr[1] ? P.xr : [P.xr[1], P.xr[0]];
  const [y0, y1] = P.yr[0] <= P.yr[1] ? P.yr : [P.yr[1], P.yr[0]];
  const xs = P.xlog ? logTicks(x0, x1) : niceTicks(x0, x1, Math.max(2, Math.floor(aw / (px * 8))));
  const ys = P.ylog ? logTicks(y0, y1) : niceTicks(y0, y1, Math.max(2, Math.floor(ah / (py * 2.6))));
  const fx = P.xlog ? fmtLogTick : fmtTick;
  const fy = P.ylog ? fmtLogTick : fmtTick;
  c.strokeStyle = Th.c[3];
  c.fillStyle = Th.c[3];
  c.globalAlpha = 0.22;
  for (const v of xs) { const q = Math.round(sx(v)) + 0.5; c.beginPath(); c.moveTo(q, ay); c.lineTo(q, ay + ah); c.stroke(); }
  for (const v of ys) { const q = Math.round(sy(v)) + 0.5; c.beginPath(); c.moveTo(ax, q); c.lineTo(ax + aw, q); c.stroke(); }
  c.globalAlpha = 1;
  c.strokeRect(Math.round(ax) + 0.5, Math.round(ay) + 0.5, Math.round(aw), Math.round(ah));
  c.textAlign = 'center';
  for (const v of xs) c.fillText(fx(v), sx(v), ay + ah + py * 0.75);
  c.textAlign = 'right';
  for (const v of ys) c.fillText(fy(v), ax - px * 0.5, sy(v));
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
  // Data-file series are drawn back to front: images, bars, lines and markers, reference lines.
  const order = (k: string | undefined) => (k === 'image' ? 0 : k === 'bar' ? 1 : k === 'hline' || k === 'vline' ? 3 : 2);
  const byLayer = P.series.map((s, si) => ({ s, si })).sort((a, b) => order(a.s.kind) - order(b.s.kind));
  const geo = { ax, ay, aw, ah, sx, sy, fs, lw };
  for (const { s, si } of byLayer) {
    if (!s.kind) {
      // The spec's own series (functions, number rows): plain lines, as always.
      if (!s.pts || s.pts.length < 2) continue;
      c.strokeStyle = cols[si % cols.length];
      c.lineWidth = lw * 1.15;
      c.lineJoin = 'round';
      c.beginPath();
      s.pts.forEach((p, i) => { const a = sx(p[0]); const b = sy(p[1]); if (i) c.lineTo(a, b); else c.moveTo(a, b); });
      c.stroke();
      continue;
    }
    drawDataSeries(c, s, cols[(s.color ?? si) % cols.length], Th, geo);
  }
  c.restore();
  if (P.legend) drawLegend(c, P, cols, Th, geo);
  c.textBaseline = 'alphabetic';
}

interface Geo { ax: number; ay: number; aw: number; ah: number; sx: (v: number) => number; sy: (v: number) => number; fs: number; lw: number }

function drawMarker(c: CanvasRenderingContext2D, m: 'dot' | 'ring', X: number, Y: number, col: string, bg: string, fs: number, lw: number): void {
  c.beginPath();
  if (m === 'dot') { c.arc(X, Y, Math.max(2, fs * 0.17), 0, 6.2832); c.fillStyle = col; c.fill(); return; }
  c.arc(X, Y, Math.max(3, fs * 0.27), 0, 6.2832);
  c.fillStyle = bg;
  c.fill();
  c.strokeStyle = col;
  c.lineWidth = Math.max(1.2, lw * 0.75);
  c.stroke();
}

/** One series from a data file, inside the (clipped) axes. */
function drawDataSeries(c: CanvasRenderingContext2D, s: Series, col: string, Th: Theme, g: Geo): void {
  const { ax, ay, aw, ah, sx, sy, fs, lw } = g;
  if (s.kind === 'image' && s.image) { drawImage(c, s.image, Th, g); return; }
  if (s.kind === 'bar' && s.bars) {
    const b = s.bars;
    c.fillStyle = col;
    c.globalAlpha = 0.85;
    b.x.forEach((x, i) => {
      const lo = b.b[i];
      const hi = b.b[i] + b.h[i];
      const r = b.horizontal
        ? [sx(Math.min(lo, hi)), sy(x + b.w[i] / 2), sx(Math.max(lo, hi)), sy(x - b.w[i] / 2)]
        : [sx(x - b.w[i] / 2), sy(Math.max(lo, hi)), sx(x + b.w[i] / 2), sy(Math.min(lo, hi))];
      if (r.every(isFinite)) {
        const x0 = Math.round(r[0]);
        const y0 = Math.round(r[1]);
        c.fillRect(x0, y0, Math.max(1, Math.round(r[2]) - x0 - 1), Math.max(1, Math.round(r[3]) - y0));
      }
    });
    c.globalAlpha = 1;
    return;
  }
  if (s.kind === 'hline' || s.kind === 'vline') {
    c.strokeStyle = s.color === undefined ? Th.c[3] : col;
    c.lineWidth = Math.max(1, lw * 0.6);
    c.setLineDash(s.dash ? [lw * 3, lw * 2.5] : []);
    c.beginPath();
    if (s.kind === 'hline') { const Y = Math.round(sy(s.v!)) + 0.5; c.moveTo(ax, Y); c.lineTo(ax + aw, Y); }
    else { const X = Math.round(sx(s.v!)) + 0.5; c.moveTo(X, ay); c.lineTo(X, ay + ah); }
    c.stroke();
    c.setLineDash([]);
    return;
  }
  const pts = s.pts || [];
  if (s.err) {
    c.strokeStyle = col;
    c.lineWidth = Math.max(1, lw * 0.6);
    const cap = Math.max(2, fs * 0.2);
    s.err.forEach((e, i) => {
      const X = sx(pts[i][0]);
      const a = sy(e[0]);
      const b = sy(e[1]);
      if (![X, a, b].every(isFinite)) return;
      c.beginPath();
      c.moveTo(X, a); c.lineTo(X, b);
      c.moveTo(X - cap, a); c.lineTo(X + cap, a);
      c.moveTo(X - cap, b); c.lineTo(X + cap, b);
      c.stroke();
    });
  }
  if (!s.noline) {
    c.strokeStyle = col;
    c.lineWidth = lw * 1.15;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.setLineDash(s.dash ? [lw * 3, lw * 2.5] : []);
    c.beginPath();
    let pen = false;
    for (const p of pts) {
      const X = sx(p[0]);
      const Y = sy(p[1]);
      if (!isFinite(X) || !isFinite(Y)) { pen = false; continue; } // a gap (null, or ≤ 0 on a log axis)
      if (pen) c.lineTo(X, Y); else c.moveTo(X, Y);
      pen = true;
    }
    c.stroke();
    c.setLineDash([]);
  }
  if (s.marker) for (const p of pts) {
    const X = sx(p[0]);
    const Y = sy(p[1]);
    if (isFinite(X) && isFinite(Y)) drawMarker(c, s.marker, X, Y, col, Th.bg, fs, lw);
  }
}

/** imshow: one rectangle per value. Diverging maps blend to the secondary colour below the middle, primary above. */
function drawImage(c: CanvasRenderingContext2D, im: DImage, Th: Theme, g: Geo): void {
  const z = im.z;
  const rows = z.length;
  const cols = rows ? z[0].length : 0;
  if (!rows || !cols) return;
  let lo = im.vmin;
  let hi = im.vmax;
  if (lo === undefined || hi === undefined) {
    let a = Infinity;
    let b = -Infinity;
    for (const r of z) for (const v of r) if (v !== null && isFinite(v)) { a = Math.min(a, v); b = Math.max(b, v); }
    lo ??= a;
    hi ??= b;
  }
  const bg = hexRgb(Th.bg);
  const pc = hexRgb(Th.p);
  const qc = hexRgb(Th.q);
  // Diverging maps are centred on the middle of [vmin, vmax], as in matplotlib.
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2 || 1;
  const [x0, x1, y0, y1] = im.extent;
  const xs = Array.from({ length: cols + 1 }, (_, i) => Math.round(g.sx(x0 + ((x1 - x0) * i) / cols)));
  const ys = Array.from({ length: rows + 1 }, (_, j) => Math.round(g.sy(y0 + ((y1 - y0) * j) / rows)));
  for (let r = 0; r < rows; r++) {
    const j = im.origin === 'lower' ? r : rows - 1 - r; // row r of z sits at y-step j from y0
    for (let k = 0; k < cols; k++) {
      const v = z[r][k];
      if (v === null || !isFinite(v)) continue;
      let col: [number, number, number];
      let a: number;
      if (im.diverging) { a = Math.min(1, Math.abs(v - mid) / half); col = v >= mid ? pc : qc; }
      else { a = hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 1; col = pc; }
      c.fillStyle = 'rgb(' + col.map((cc, i) => Math.round(bg[i] + (cc - bg[i]) * a)).join(',') + ')';
      const X = Math.min(xs[k], xs[k + 1]);
      const Y = Math.min(ys[j], ys[j + 1]);
      c.fillRect(X, Y, Math.abs(xs[k + 1] - xs[k]), Math.abs(ys[j + 1] - ys[j]));
    }
  }
}

/** Legend for labelled series, top left inside the axes. */
function drawLegend(c: CanvasRenderingContext2D, P: ParsedPlot, cols: string[], Th: Theme, g: Geo): void {
  const items = P.series.map((s, si) => ({ s, si })).filter(({ s }) => s.label);
  if (!items.length) return;
  const { ax, ay, fs, lw } = g;
  c.font = fs * 0.82 + 'px ' + FONT;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  const lh = fs * 1.15;
  const sw = fs * 1.6;
  const w = Math.max(...items.map(({ s }) => c.measureText(s.label!).width)) + sw + fs * 0.9;
  c.fillStyle = Th.bg;
  c.globalAlpha = 0.85;
  c.fillRect(ax + 4, ay + 4, w, items.length * lh + fs * 0.3);
  c.globalAlpha = 1;
  items.forEach(({ s, si }, i) => {
    const col = cols[(s.color ?? si) % cols.length];
    const Y = ay + 4 + fs * 0.15 + lh * (i + 0.5);
    const X = ax + 4 + fs * 0.3;
    if (s.kind === 'bar') { c.fillStyle = col; c.fillRect(X, Y - fs * 0.3, sw, fs * 0.6); }
    else {
      if (!s.noline) { c.strokeStyle = col; c.lineWidth = lw * 1.15; c.beginPath(); c.moveTo(X, Y); c.lineTo(X + sw, Y); c.stroke(); }
      if (s.marker) drawMarker(c, s.marker, X + sw / 2, Y, col, Th.bg, fs, lw);
    }
    c.fillStyle = Th.c[0];
    c.fillText(s.label!, X + sw + fs * 0.4, Y);
  });
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
  const P = parseOf(o);
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
