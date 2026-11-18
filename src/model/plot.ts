/* Plot spec parser. See CLAUDE.md for the format; data files are described in plotdata.ts. */
import { plotDataOf, type DImage, type DRule, type PlotData } from './plotdata';

export interface Series {
  /** 'line' also covers the spec's own function and number series. */
  kind?: 'line' | 'scatter' | 'bar' | 'image' | 'hline' | 'vline';
  expr?: string;
  /** Points of a line or scatter; a NaN y breaks the line. */
  pts: [number, number][] | null;
  /** Index into the theme's plot colours; defaults to the series' position. */
  color?: number;
  label?: string;
  dash?: boolean;
  marker?: 'dot' | 'ring' | null;
  /** Markers only (matplotlib linestyle 'none'). */
  noline?: boolean;
  /** Error bar ends per point: [low, high] in data units. */
  err?: [number, number][];
  bars?: { x: number[]; w: number[]; h: number[]; b: number[]; horizontal: boolean };
  image?: DImage;
  /** Position of an hline / vline. */
  v?: number;
}

export interface ParsedPlot {
  xr: [number, number];
  yr: [number, number];
  title: string;
  /** 'braille' draws the series as braille dots in the cells (model/braille.ts); '' is the vector plot. */
  style: string;
  xl: string;
  yl: string;
  series: Series[];
  err: string;
  xlog: boolean;
  ylog: boolean;
  /** Draw a legend for labelled series (spec `legend: off` hides it). */
  legend: boolean;
}

/** Small seeded PRNG (mulberry32) plus a Box–Muller gaussian, so plots with noise are stable. */
export function mkRng(seed: number): { rnd: () => number; gauss: () => number } {
  let a = seed >>> 0;
  function rnd(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gauss(): number {
    let u = 0;
    while (!u) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  }
  return { rnd, gauss };
}

const cache: Record<string, ParsedPlot> = {};
const dataCache = new WeakMap<PlotData, Record<string, ParsedPlot>>();

/** Parse a plot spec, merged with its data file if it has one (spec lines override the file's labels and ranges). */
export function parsePlot(spec: string, data?: PlotData | null): ParsedPlot {
  if (data) {
    let c = dataCache.get(data);
    if (!c) dataCache.set(data, (c = {}));
    return c[spec] || (c[spec] = parseWithData(spec, data));
  }
  if (cache[spec]) return cache[spec];
  const res = parseWithData(spec, null);
  cache[spec] = res;
  const ks = Object.keys(cache);
  if (ks.length > 60) delete cache[ks[0]];
  return res;
}

function parseWithData(spec: string, data: PlotData | null): ParsedPlot {
  let xr: [number, number] | null = null;
  let yr: [number, number] | null = null;
  let xlog: boolean | null = null;
  let ylog: boolean | null = null;
  let legend = true;
  const o = { title: '', style: '', xl: '', yl: '', series: [] as Series[], err: '' };
  let block: Series | null = null;
  let m: RegExpMatchArray | null;
  for (const raw of spec.split('\n')) {
    const l = raw.trim();
    if (!l || l[0] === '#') { block = null; continue; }
    if ((m = l.match(/^x:\s*(\S+)\s+(\S+)/i))) { xr = [+m[1], +m[2]]; block = null; continue; }
    if ((m = l.match(/^y:\s*(\S+)\s+(\S+)/i))) { yr = [+m[1], +m[2]]; block = null; continue; }
    if ((m = l.match(/^data:/i))) continue;
    if ((m = l.match(/^(x|y)scale:\s*(\S+)/i))) { const lg = m[2].toLowerCase() === 'log'; if (m[1].toLowerCase() === 'x') xlog = lg; else ylog = lg; continue; }
    if ((m = l.match(/^legend:\s*(\S+)/i))) { legend = !/^(off|no|false|0)$/i.test(m[1]); continue; }
    if ((m = l.match(/^(title|xlabel|ylabel|style):\s*(.*)$/i))) {
      const k = m[1].toLowerCase();
      if (k === 'title') o.title = m[2];
      else if (k === 'style') o.style = m[2].trim().toLowerCase();
      else if (k === 'xlabel') o.xl = m[2];
      else o.yl = m[2];
      continue;
    }
    if (l[0] === '=') { o.series.push({ expr: l.slice(1).trim(), pts: null }); block = null; continue; }
    const nums = l.split(/[\s,;]+/).map(Number);
    if (nums.length >= 2 && nums.every(isFinite)) {
      if (!block) { block = { pts: [] }; o.series.push(block); }
      block.pts!.push([nums[0], nums[1]]);
    }
  }
  if (data) {
    addData(o.series, data);
    o.title = o.title || data.title || '';
    o.xl = o.xl || data.xlabel || '';
    o.yl = o.yl || data.ylabel || '';
    if (xlog === null) xlog = data.xscale === 'log';
    if (ylog === null) ylog = data.yscale === 'log';
    if (!xr && data.xlim) xr = data.xlim;
    if (!yr && data.ylim) yr = data.ylim;
  }
  const XL = !!xlog;
  const YL = !!ylog;
  if (!xr && data) xr = autoRange(o.series, 'x', XL, 0);
  if (!xr) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of o.series) if (s.pts) for (const p of s.pts) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }
    xr = isFinite(lo) ? [lo, hi] : [0, 10];
  }
  const X = xr;
  o.series.forEach((s, si) => {
    if (!s.expr) return;
    const rng = mkRng(7 + si * 13);
    let f: (x: number, rnd: () => number, gauss: () => number) => unknown;
    try {
      // Expressions are the deck author's own; `with(Math)` lets them write sin(x) instead of Math.sin(x).
      f = new Function('x', 'rnd', 'gauss', 'with(Math){return (' + s.expr + ')}') as typeof f;
    } catch (e) {
      o.err = String((e as Error).message || e);
      s.pts = [];
      return;
    }
    s.pts = [];
    for (let i = 0; i <= 300; i++) {
      const x = X[0] + ((X[1] - X[0]) * i) / 300;
      let y: number;
      try { y = +(f(x, rng.rnd, rng.gauss) as number); }
      catch (e) { o.err = String((e as Error).message || e); break; }
      if (isFinite(y)) s.pts.push([x, y]);
    }
  });
  if (!yr && data) yr = autoRange(o.series, 'y', YL, 0.06);
  if (!yr) {
    let ylo = Infinity;
    let yhi = -Infinity;
    for (const s of o.series) for (const p of s.pts || []) { ylo = Math.min(ylo, p[1]); yhi = Math.max(yhi, p[1]); }
    if (!isFinite(ylo)) { ylo = 0; yhi = 1; }
    if (ylo === yhi) { ylo -= 1; yhi += 1; }
    const pad = (yhi - ylo) * 0.06;
    yr = [ylo - pad, yhi + pad];
  }
  return { ...o, xr: X, yr, xlog: XL, ylog: YL, legend };
}

/** Turn a data file's series into plot series. */
function addData(out: Series[], d: PlotData): void {
  let auto = 0;
  for (const s of d.series) {
    if (s.kind === 'line' || s.kind === 'scatter') {
      const pts: [number, number][] = s.x.map((x, i) => [x, s.y[i] ?? NaN]);
      const err = s.yerr ? pts.map((p, i): [number, number] => [p[1] - (s.yerr![0][i] ?? 0), p[1] + (s.yerr![1][i] ?? 0)]) : undefined;
      out.push({
        kind: s.kind, pts, color: s.color ?? auto++, label: s.label, dash: s.dash,
        marker: s.kind === 'scatter' ? s.marker || 'dot' : s.marker, noline: s.kind === 'scatter' || s.noline, err,
      });
    } else if (s.kind === 'bar') {
      out.push({
        kind: 'bar', pts: null, color: s.color ?? auto++, label: s.label,
        bars: { x: s.x, w: s.width, h: s.height, b: s.x.map((_, i) => s.bottom?.[i] ?? 0), horizontal: !!s.horizontal },
      });
    } else if (s.kind === 'image') out.push({ kind: 'image', pts: null, image: s });
    else if (s.kind === 'hline' || s.kind === 'vline') { const r = s as DRule; out.push({ kind: r.kind, pts: null, v: r.v, color: r.color, dash: r.dash }); }
  }
}

/** Data range on one axis over every series, padded by `pad` of the span (multiplicatively on a log axis). */
function autoRange(series: Series[], ax: 'x' | 'y', log: boolean, pad: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  const add = (v: number) => { if (isFinite(v) && (!log || v > 0)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } };
  const k = ax === 'x' ? 0 : 1;
  for (const s of series) {
    for (const p of s.pts || []) if (isFinite(p[1])) add(p[k]);
    if (ax === 'y') for (const e of s.err || []) { add(e[0]); add(e[1]); }
    if (s.bars) {
      const b = s.bars;
      const along = (ax === 'x') !== b.horizontal; // the axis the bars sit along
      b.x.forEach((x, i) => {
        if (along) { add(x - b.w[i] / 2); add(x + b.w[i] / 2); }
        else { add(b.b[i]); add(b.b[i] + b.h[i]); }
      });
    }
    if (s.image) { const e = s.image.extent; add(ax === 'x' ? e[0] : e[2]); add(ax === 'x' ? e[1] : e[3]); }
    if ((s.kind === 'hline' && ax === 'y') || (s.kind === 'vline' && ax === 'x')) add(s.v!);
  }
  if (!isFinite(lo)) return log ? [1, 10] : [0, 1];
  if (lo === hi) return log ? [lo / 10, hi * 10] : [lo - 1, hi + 1];
  if (log) { const f = Math.pow(hi / lo, pad); return [lo / f, hi * f]; }
  const p = (hi - lo) * pad;
  return [lo - p, hi + p];
}

/** Ticks on a log axis: every decade, with 2 and 5 between when the range is under three decades. */
export function logTicks(a: number, b: number): number[] {
  if (!(a > 0 && b > a)) return [a];
  const out: number[] = [];
  const steps = Math.log10(b / a) < 3 ? [1, 2, 5] : [1];
  for (let e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++)
    for (const m of steps) {
      const v = +(m * Math.pow(10, e)).toPrecision(6);
      if (v >= a * (1 - 1e-9) && v <= b * (1 + 1e-9)) out.push(v);
    }
  return out;
}

export function niceTicks(a: number, b: number, n: number): number[] {
  const span = b - a;
  if (!(span > 0)) return [a];
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / mag;
  const st = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const o: number[] = [];
  for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-9; v += st) o.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return o;
}

export function fmtTick(v: number): string {
  return String(+v.toPrecision(6));
}

/** Parse a plot object's spec together with its data. */
export function parseOf(o: { spec: string; data?: PlotData }): ParsedPlot {
  return parsePlot(o.spec, plotDataOf(o));
}

/** Tick label; on a log axis large and small powers are written as 1e5 / 2e-4. */
export function fmtLogTick(v: number): string {
  if (v !== 0 && (Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3)) {
    const e = Math.floor(Math.log10(Math.abs(v)));
    const m = +(v / Math.pow(10, e)).toPrecision(3);
    return (m === 1 ? '1' : String(m)) + 'e' + e;
  }
  return fmtTick(v);
}
