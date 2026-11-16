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

/** Legacy free vector line. The UI no longer creates these, but old decks may contain them. */
export interface PathObj {
  t: 'path';
  pts: [number, number][];
  smooth: boolean;
  arrow: boolean;
  dash: boolean;
  attr: Attr;
}

export type VecObj = PlotObj | PathObj;

/** One slide. `ch`, `mk` and `at` are flat arrays indexed `y * cols + x`. */
export interface Slide {
  /** Optional slide title (player labels, accessibility, presenter notes view). */
  title?: string;
  /** Optional speaker notes, shown in the player's notes view. */
  notes?: string;
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
