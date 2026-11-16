/*
 * All mutable editor state lives in `ed`. Modules read and write it directly, as the original single-file
 * editor did with its closure variables. UI functions that lower layers need to call (e.g. undo has to
 * refresh the toolbar) are reached through `ui`, which main.ts fills in, so imports stay one-directional.
 */
import { THEMES } from './model/constants';
import type { EqGroup } from './model/equations';
import type { GridCopy } from './model/grid';
import { History } from './model/history';
import type { Attr, Buf, Doc, Grid, Rect, Slide, Theme } from './model/types';

export type ToolName = 'select' | 'box' | 'line' | 'text' | 'brush' | 'erase' | 'plot' | 'heat' | 'path' | 'arrow';

/** Pointer position in cell units. `x`, `y` are the cell; `fx`, `fy` fractional; `px`, `py` CSS pixels. */
export interface PPos {
  px: number;
  py: number;
  fx: number;
  fy: number;
  x: number;
  y: number;
  snap: [number, number];
}

export type Drag =
  | { kind: 'handle'; pre: string; h: { k: 'br' } | { k: 'pt'; i: number } }
  | { kind: 'objmove'; pre: string; orig: any; sx: number; sy: number }
  | { kind: 'selrect'; pre: string; p0: PPos }
  | { kind: 'selmove'; pre: string; buf: Buf; base: GridCopy; r0: Rect; p0: PPos; moved: boolean }
  | { kind: 'plotnew'; pre: string; p0: PPos; rect: Rect; t: 'plot' | 'heat' }
  | { kind: 'box' | 'line' | 'brush' | 'erase' | 'arrow'; pre: string; p0: PPos; base: GridCopy; last: PPos };

export interface EqEdit {
  x: number;
  y: number;
  disp: boolean;
  /** The equation being edited, or null for a new one. */
  ex: EqGroup | null;
  pre: string;
  at: Attr;
}

export interface Creating {
  pts: [number, number][];
  smooth: boolean;
  arrow: boolean;
  pre: string;
}

export const ed = {
  doc: null as unknown as Doc,
  cur: 0,
  tool: 'select' as ToolName,
  attr: 0 as Attr,
  brushCh: '█',
  rev: false,
  snapOn: true,
  previewOn: false,
  eqEdit: null as EqEdit | null,
  sel: null as Rect | null,
  selObj: -1,
  cursor: null as { x: number; y: number } | null,
  textX0: 0,
  typing: false,
  hover: null as PPos | null,
  drag: null as Drag | null,
  creating: null as Creating | null,
  lastClick: 0,
  lastClickPos: null as [number, number] | null,
  clip: null as Buf | null,
  caretOn: true,
  /** Signature of the equation overlay last built; '' forces a rebuild. */
  eqSig: '',
  msg: '',
  // Cell metrics: *D in device pixels (canvas), *C in CSS pixels.
  cwD: 10, chD: 22, fsD: 16, dpr: 1, cwC: 10, chC: 22, fsC: 16, ratio: 0.6,
  dirtyFlag: false,
  thumbDirty: true,
};

export const hist = new History();

export const ui = {
  syncUI: () => {},
  layout: () => {},
  refreshInspector: () => {},
  buildSlideList: () => {},
  setTool: (_t: ToolName) => {},
  closeModal: () => {},
  render: () => {},
};

export function S(): Slide {
  return ed.doc.slides[ed.cur];
}

export function G(): Grid {
  return { cols: ed.doc.cols, rows: ed.doc.rows, s: ed.doc.slides[ed.cur] };
}

export function T(): Theme {
  return THEMES[ed.doc.theme] || THEMES.modern;
}

/** Schedule one render on the next animation frame. */
export function mark(): void {
  ed.thumbDirty = true;
  if (!ed.dirtyFlag) {
    ed.dirtyFlag = true;
    requestAnimationFrame(() => {
      ed.dirtyFlag = false;
      ui.render();
    });
  }
}
