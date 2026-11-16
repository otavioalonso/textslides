/* Plot spec parser. See CLAUDE.md for the format. */

export interface Series {
  expr?: string;
  pts: [number, number][] | null;
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

export function parsePlot(spec: string): ParsedPlot {
  if (cache[spec]) return cache[spec];
  let xr: [number, number] | null = null;
  let yr: [number, number] | null = null;
  const o = { title: '', style: '', xl: '', yl: '', series: [] as Series[], err: '' };
  let block: Series | null = null;
  let m: RegExpMatchArray | null;
  for (const raw of spec.split('\n')) {
    const l = raw.trim();
    if (!l || l[0] === '#') { block = null; continue; }
    if ((m = l.match(/^x:\s*(\S+)\s+(\S+)/i))) { xr = [+m[1], +m[2]]; block = null; continue; }
    if ((m = l.match(/^y:\s*(\S+)\s+(\S+)/i))) { yr = [+m[1], +m[2]]; block = null; continue; }
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
  if (!yr) {
    let ylo = Infinity;
    let yhi = -Infinity;
    for (const s of o.series) for (const p of s.pts || []) { ylo = Math.min(ylo, p[1]); yhi = Math.max(yhi, p[1]); }
    if (!isFinite(ylo)) { ylo = 0; yhi = 1; }
    if (ylo === yhi) { ylo -= 1; yhi += 1; }
    const pad = (yhi - ylo) * 0.06;
    yr = [ylo - pad, yhi + pad];
  }
  const res: ParsedPlot = { ...o, xr: X, yr };
  cache[spec] = res;
  const ks = Object.keys(cache);
  if (ks.length > 60) delete cache[ks[0]];
  return res;
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
