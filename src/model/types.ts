/** Colour index 0–3 in bits 0–1, highlighted bar (reverse video) in bit 2. */
export type Attr = number;

export interface PlotObj {
  t: 'plot';
  x: number;
  y: number;
  w: number;
  h: number;
  spec: string;
}

/**
 * Heat map / drawdown: a grid of square pixels, one cell wide and half a cell tall, so `w` pixel columns and
 * `2 * h` pixel rows. Values in [-1, 1]: positive in the theme's primary plot colour, negative in the secondary,
 * intensity by magnitude; null pixels are transparent. `spec` is described in model/heat.ts.
 */
export interface HeatObj {
  t: 'heat';
  x: number;
  y: number;
  w: number;
  h: number;
  spec: string;
}

/** Legacy free vector line. The UI no longer creates these, but old decks may contain them. */
export interface PathObj {
  t: 'path';
  pts: [number, number][];
  smooth: boolean;
  arrow: boolean;
  dash: boolean;
  attr: Attr;
}

export type BoxObj = PlotObj | HeatObj;
export type VecObj = BoxObj | PathObj;

/** Objects placed as a rectangle of cells (moved and resized the same way). */
export function isBox(o: VecObj): o is BoxObj {
  return o.t !== 'path';
}

/** One slide. `ch`, `mk` and `at` are flat arrays indexed `y * cols + x`. */
export interface Slide {
  /** Optional slide title (player labels, accessibility, presenter notes view). */
  title?: string;
  /** Optional speaker notes, shown in the player's notes view. */
  notes?: string;
  /** This slide is an animation frame continuing the previous slide (see model/deck.ts). */
  frame?: boolean;
  /** On the first slide of an animation: milliseconds per frame (default DEFAULT_DELAY). */
  delay?: number;
  ch: string[];
  mk: number[];
  at: Attr[];
  vec: VecObj[];
}

export type ThemeName = 'modern' | 'c64';

export interface Doc {
  v: 1;
  cols: number;
  rows: number;
  theme: ThemeName | string;
  slides: Slide[];
}

/** A slide together with the grid size it lives in: what every cell operation works on. */
export interface Grid {
  cols: number;
  rows: number;
  s: Slide;
}

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangular piece of grid, used for move, copy and paste. */
export interface Buf {
  w: number;
  h: number;
  ch: string[];
  mk: number[];
  at: Attr[];
}

export interface Theme {
  bg: string;
  /** normal, bright, accent, dim */
  c: [string, string, string, string];
  /** primary and secondary plot colours */
  p: string;
  q: string;
}
