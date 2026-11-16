/* Document-level operations: snapshots, undo/redo, autosave, new deck. */
import { STORE } from './model/constants';
import { mkSlide } from './model/grid';
import type { Doc } from './model/types';
import { buildDemo } from './model/demo';
import { eqCells } from './render/katex';
import { ed, hist, mark, ui } from './state';

export function snap(): string {
  return JSON.stringify({ doc: ed.doc, cur: ed.cur });
}

function loadSnap(str: string): void {
  const o = JSON.parse(str);
  ed.doc = o.doc;
  ed.cur = Math.min(o.cur, ed.doc.slides.length - 1);
}

export function pushUndo(pre: string): void {
  hist.push(pre);
}

/** Finish an operation that started with `pre = snap()`: record undo if anything changed, autosave. */
export function commit(pre: string): void {
  hist.commit(pre, snap());
  save();
}

export function undo(): void {
  const s = hist.undo(snap());
  if (s === null) return;
  loadSnap(s);
  afterLoad();
}

export function redo(): void {
  const s = hist.redo(snap());
  if (s === null) return;
  loadSnap(s);
  afterLoad();
}

export function afterLoad(): void {
  ed.sel = null;
  ed.selObj = -1;
  ed.cursor = null;
  ed.typing = false;
  ed.creating = null;
  ui.syncUI();
  ui.layout();
  ui.refreshInspector();
  mark();
  save();
}

let saveT: ReturnType<typeof setTimeout> | undefined;
export function save(): void {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(STORE, snap()); } catch { /* storage full or blocked */ }
  }, 300);
}

export function emptyDoc(theme = 'modern'): Doc {
  return { v: 1, cols: 80, rows: 24, theme, slides: [mkSlide(80, 24)] };
}

/** Replace the deck with the demo slide. */
export function fresh(): void {
  ed.doc = emptyDoc();
  ed.cur = 0;
  buildDemo({ cols: ed.doc.cols, rows: ed.doc.rows, s: ed.doc.slides[0] }, eqCells);
}
