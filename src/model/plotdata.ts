/*
 * Plot data files: what python/textslides.py writes from a matplotlib Axes, and what a plot draws when its spec
 * has `data: path/to/file.json` (linked) or the data was imported into the deck (`PlotObj.data`, embedded).
 *
 *   { "textslides": "plot", "v": 1, "title"?, "xlabel"?, "ylabel"?, "xscale"?: "linear"|"log", "yscale"?,
 *     "xlim"?: [a, b], "ylim"?: [a, b],
 *     "series": [
 *       { "kind": "line",    "x": [..], "y": [..], "color"?: 0, "label"?, "dash"?, "marker"?: "dot"|"ring",
 *                            "noline"?: true, "yerr"?: [[lo..], [hi..]] },
 *       { "kind": "scatter", "x": [..], "y": [..], "color"?, "label"?, "marker"?: "dot"|"ring", "yerr"? },
 *       { "kind": "bar",     "x": [..], "height": [..], "width": [..], "bottom"?: [..], "horizontal"?, "color"?, "label"? },
 *       { "kind": "image",   "z": [[..]], "extent": [x0, x1, y0, y1], "origin"?: "upper"|"lower",
 *                            "vmin"?, "vmax"?, "diverging"? },
 *       { "kind": "hline" | "vline", "v": 0, "color"?, "dash"? } ] }
 *
 * `color` is an index into the theme's plot colours (matplotlib's C0, C1, … cycle maps onto it), so plots follow
 * the deck's theme. `yerr` holds the error bar's distances below and above each point. Null in `y` or `z` is a gap.
 */

export interface DXY {
  kind: 'line' | 'scatter';
  x: number[];
  y: (number | null)[];
  color?: number;
  label?: string;
  dash?: boolean;
  marker?: 'dot' | 'ring' | null;
  noline?: boolean;
  yerr?: [number[], number[]];
}

export interface DBar {
  kind: 'bar';
  x: number[];
  height: number[];
  width: number[];
  bottom?: number[];
  horizontal?: boolean;
  color?: number;
  label?: string;
}

export interface DImage {
  kind: 'image';
  z: (number | null)[][];
  extent: [number, number, number, number];
  origin?: 'upper' | 'lower';
  vmin?: number;
  vmax?: number;
  diverging?: boolean;
}

export interface DRule {
  kind: 'hline' | 'vline';
  v: number;
  color?: number;
  dash?: boolean;
}

export type DSeries = DXY | DBar | DImage | DRule;

export interface PlotData {
  textslides: 'plot';
  v: 1;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  xscale?: 'linear' | 'log';
  yscale?: 'linear' | 'log';
  xlim?: [number, number];
  ylim?: [number, number];
  series: DSeries[];
}

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.map((x) => num(x) ?? NaN) : []);
const numsOrNull = (v: unknown): (number | null)[] => (Array.isArray(v) ? v.map(num) : []);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v.slice(0, 200) : undefined);
const idx = (v: unknown): number | undefined => (typeof v === 'number' && v >= 0 && v < 100 ? Math.floor(v) : undefined);
const pair = (v: unknown): [number, number] | undefined =>
  Array.isArray(v) && v.length === 2 && num(v[0]) !== null && num(v[1]) !== null ? [v[0] as number, v[1] as number] : undefined;
const scale = (v: unknown): 'linear' | 'log' | undefined => (v === 'log' ? 'log' : v === 'linear' ? 'linear' : undefined);
const marker = (v: unknown): 'dot' | 'ring' | null => (v === 'dot' || v === 'ring' ? v : null);

/** Check and clean a parsed data file. Throws on anything that is not a plot data file. */
export function readPlotData(j: unknown): PlotData {
  const o = j as Record<string, unknown>;
  if (!o || typeof o !== 'object' || o.textslides !== 'plot' || !Array.isArray(o.series)) throw new Error('not a textslides plot data file');
  const series: DSeries[] = [];
  for (const raw of o.series as Record<string, unknown>[]) {
    if (!raw || typeof raw !== 'object') continue;
    const k = raw.kind;
    if (k === 'line' || k === 'scatter') {
      const x = nums(raw.x);
      const y = numsOrNull(raw.y).slice(0, x.length);
      const e = Array.isArray(raw.yerr) && raw.yerr.length === 2 ? ([nums(raw.yerr[0]), nums(raw.yerr[1])] as [number[], number[]]) : undefined;
      series.push({ kind: k, x, y, color: idx(raw.color), label: str(raw.label), dash: raw.dash === true, marker: marker(raw.marker), noline: raw.noline === true, yerr: e });
    } else if (k === 'bar') {
      const x = nums(raw.x);
      const w = nums(raw.width);
      series.push({
        kind: 'bar', x, height: nums(raw.height), width: x.map((_, i) => w[i] ?? w[0] ?? 0.8),
        bottom: raw.bottom ? nums(raw.bottom) : undefined, horizontal: raw.horizontal === true, color: idx(raw.color), label: str(raw.label),
      });
    } else if (k === 'image') {
      const z = Array.isArray(raw.z) ? (raw.z as unknown[]).map(numsOrNull) : [];
      const ext = Array.isArray(raw.extent) && raw.extent.length === 4 && raw.extent.every((v) => num(v) !== null)
        ? (raw.extent as [number, number, number, number]) : ([0, z[0]?.length ?? 1, 0, z.length || 1] as [number, number, number, number]);
      series.push({ kind: 'image', z, extent: ext, origin: raw.origin === 'lower' ? 'lower' : 'upper', vmin: num(raw.vmin) ?? undefined, vmax: num(raw.vmax) ?? undefined, diverging: raw.diverging === true });
    } else if ((k === 'hline' || k === 'vline') && num(raw.v) !== null) {
      series.push({ kind: k, v: raw.v as number, color: idx(raw.color), dash: raw.dash === true });
    }
  }
  return {
    textslides: 'plot', v: 1, title: str(o.title), xlabel: str(o.xlabel), ylabel: str(o.ylabel),
    xscale: scale(o.xscale), yscale: scale(o.yscale), xlim: pair(o.xlim), ylim: pair(o.ylim), series,
  };
}

export function parsePlotData(text: string): PlotData {
  return readPlotData(JSON.parse(text));
}

/** The `data: path` line of a plot spec, if any. */
export function dataPath(spec: string): string {
  const m = spec.match(/^\s*data:\s*(\S.*?)\s*$/im);
  return m ? m[1] : '';
}

/**
 * Data loaded from linked files, by path. Filled by the editor (ui/data.ts) from the connected folder; the player
 * never uses it, because exports embed the data into each plot.
 */
export const linkedData = new Map<string, PlotData>();

/** The data a plot draws: imported into the deck, or loaded from its linked file. */
export function plotDataOf(o: { spec: string; data?: PlotData }): PlotData | null {
  if (o.data) return o.data;
  const p = dataPath(o.spec);
  return p ? linkedData.get(p) ?? null : null;
}
