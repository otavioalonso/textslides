import 'katex/dist/katex.min.css';
import './style.css';

import { cv } from './dom';
import './hook';
import { afterLoad, fresh, redo, snap, undo } from './editor';
import { STORE } from './model/constants';
import { mkSlide } from './model/grid';
import type { Doc } from './model/types';
import { layout } from './render/layout';
import { updateEq } from './render/overlay';
import { renderCanvas } from './render/scene';
import { ed, ui } from './state';
import { initPointer } from './tools/pointer';
import { initEqBar } from './ui/eqbar';
import { refreshInspector } from './ui/inspector';
import { initKeyboard } from './ui/keyboard';
import { closeModal, initModal } from './ui/modal';
import { initPresent } from './ui/present';
import { buildSlideList, drawThumbs, gotoSlide } from './ui/slides';
import { updateStatus } from './ui/status';
import { initToolbar, setTool, syncUI } from './ui/toolbar';

function render(): void {
  if (!ed.doc) return;
  renderCanvas();
  updateEq();
  if (ed.thumbDirty) { ed.thumbDirty = false; drawThumbs(); }
  updateStatus();
}

Object.assign(ui, { syncUI, layout, refreshInspector, buildSlideList, setTool, closeModal, render });

initPointer();
initKeyboard();
initEqBar();
initToolbar();
initModal();
initPresent();
window.addEventListener('resize', layout);

function start(): void {
  let saved: string | null = null;
  try { saved = localStorage.getItem(STORE); } catch { /* storage blocked */ }
  if (saved) {
    try {
      const o = JSON.parse(saved);
      if (o.doc && o.doc.slides && o.doc.slides.length) {
        ed.doc = o.doc;
        ed.cur = Math.min(o.cur || 0, ed.doc.slides.length - 1);
      }
    } catch { /* corrupt autosave: start fresh */ }
  }
  if (!ed.doc) {
    // Measure with a temporary document so equation widths are right before the demo is built.
    ed.doc = { v: 1, cols: 80, rows: 24, theme: 'modern', slides: [mkSlide(80, 24)] };
    layout();
    ed.doc = null as unknown as Doc;
    fresh();
  } else layout();
  syncUI();
  buildSlideList();
  refreshInspector();
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());
}

const fonts = ['16px KaTeX_Main', 'italic 16px KaTeX_Math', '16px KaTeX_Size1', '16px KaTeX_Size2'];
const preload = document.fonts && document.fonts.load ? Promise.all(fonts.map((f) => document.fonts.load(f))) : Promise.resolve();
preload.then(start, start);

// Test and debugging hook, same shape as the original single-file editor's.
window.ED = {
  get doc() { return ed.doc; },
  setTool, snap, undo, redo, gotoSlide, layout,
  get cw() { return ed.cwC; },
  get ch() { return ed.chC; },
  cv,
  get cur() { return ed.cur; },
  get eqEdit() { return ed.eqEdit; },
  fresh() { fresh(); afterLoad(); buildSlideList(); },
};
