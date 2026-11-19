import { $ } from '../dom';
import { commit, redo, snap, undo } from '../editor';
import { ATTR_NAMES, REV, withColour } from '../model/constants';
import { inb, ix, resizeSlide } from '../model/grid';
import type { Attr } from '../model/types';
import { ed, G, mark, S, T, ui, type ToolName } from '../state';
import { TOOLS } from './hints';
import { buildSlideBtns } from './slides';

export function setTool(t: ToolName): void {
  if (ed.cursor && t !== 'text') ed.cursor = null;
  if (ed.creating && t !== 'path') ed.creating = null;
  ed.tool = t;
  ed.typing = false;
  if (t !== 'select') ed.sel = null;
  if (t !== 'select' && ed.selObj >= 0 && t !== 'path') ed.selObj = -1;
  syncUI();
  ui.refreshInspector();
  mark();
}

/** Recolour the selection (or the selected path) and make `a` the current colour. */
export function setAttr(a: Attr): void {
  ed.attr = a;
  syncUI();
  const g = G();
  const s = S();
  const pre = snap();
  const sel = ed.sel;
  if (sel) {
    for (let y = 0; y < sel.h; y++)
      for (let x = 0; x < sel.w; x++)
        if (inb(g, sel.x + x, sel.y + y)) {
          const i = ix(g, sel.x + x, sel.y + y);
          if (s.ch[i] || s.mk[i] || s.at[i] & REV) s.at[i] = withColour(s.at[i], a);
        }
  }
  const o = ed.selObj >= 0 ? s.vec[ed.selObj] : null;
  if (o && o.t === 'path') o.attr = a;
  commit(pre);
  mark();
}

/** Highlighted bar: toggle it on the selection, or for typing if nothing is selected. */
export function toggleRev(): void {
  const g = G();
  const s = S();
  const sel = ed.sel;
  if (sel) {
    let all = true;
    for (let y = 0; y < sel.h; y++)
      for (let x = 0; x < sel.w; x++)
        if (inb(g, sel.x + x, sel.y + y) && !(s.at[ix(g, sel.x + x, sel.y + y)] & 4)) all = false;
    const pre = snap();
    for (let y = 0; y < sel.h; y++)
      for (let x = 0; x < sel.w; x++)
        if (inb(g, sel.x + x, sel.y + y)) {
          const i = ix(g, sel.x + x, sel.y + y);
          s.at[i] = all ? s.at[i] & ~REV : s.at[i] | REV;
        }
    commit(pre);
  } else ed.rev = !ed.rev;
  syncUI();
  mark();
}

function buildToolbar(): void {
  const tb = $('tools');
  for (const [name, label, key] of TOOLS) {
    const b = document.createElement('button');
    b.dataset.tool = name;
    b.innerHTML = label + '<kbd>' + key + '</kbd>';
    b.onclick = () => setTool(name);
    tb.appendChild(b);
  }
  const bl = document.createElement('span');
  bl.textContent = 'brush';
  bl.style.cssText = 'color:var(--dim);margin:0 2px 0 6px';
  tb.appendChild(bl);
  const bi = document.createElement('input');
  bi.type = 'text';
  bi.id = 'brush';
  bi.value = ed.brushCh;
  bi.maxLength = 2;
  bi.title = 'brush character: click, then type or paste any character';
  bi.oninput = () => { const v = Array.from(bi.value).pop(); if (v) { ed.brushCh = v; bi.value = v; setTool('brush'); } };
  bi.onfocus = () => bi.select();
  tb.appendChild(bi);
  for (const c of '░▒▓█▀▄'.split('')) {
    const b = document.createElement('button');
    b.textContent = c;
    b.style.padding = '4px 6px';
    b.title = 'brush ' + c;
    b.onclick = () => { ed.brushCh = c; bi.value = c; setTool('brush'); };
    tb.appendChild(b);
  }
  const at = $('attrs');
  ATTR_NAMES.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'sw';
    b.textContent = 'A';
    b.title = n + ' (' + (i + 1) + ')';
    b.onclick = () => setAttr(i);
    at.appendChild(b);
  });
}

export function syncUI(): void {
  const tb = $('tools');
  if (!tb.children.length) buildToolbar();
  tb.querySelectorAll<HTMLButtonElement>('button[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === ed.tool));
  const Th = T();
  Array.from($('attrs').children as HTMLCollectionOf<HTMLElement>).forEach((b, i) => {
    b.style.background = Th.bg;
    b.style.color = Th.c[i];
    b.classList.toggle('on', i === ed.attr);
  });
  $('rev').classList.toggle('on', ed.rev);
  $<HTMLSelectElement>('theme').value = ed.doc.theme;
  $<HTMLSelectElement>('size').value = ed.doc.cols + 'x' + ed.doc.rows;
  $('preview').classList.toggle('on', ed.previewOn);
  buildSlideBtns();
}

export function initToolbar(): void {
  $<HTMLSelectElement>('theme').onchange = (e) => {
    const pre = snap();
    ed.doc.theme = (e.target as HTMLSelectElement).value;
    commit(pre);
    syncUI();
    ed.eqSig = '';
    mark();
  };
  $<HTMLSelectElement>('size').onchange = (e) => {
    const pre = snap();
    const [nc, nr] = (e.target as HTMLSelectElement).value.split('x').map(Number);
    const doc = ed.doc;
    doc.slides = doc.slides.map((s) => resizeSlide({ cols: doc.cols, rows: doc.rows, s }, nc, nr));
    doc.cols = nc;
    doc.rows = nr;
    ed.sel = null;
    ed.cursor = null;
    commit(pre);
    ui.layout();
  };
  $('rev').onclick = toggleRev;
  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('preview').onclick = () => { ed.previewOn = !ed.previewOn; syncUI(); mark(); };
}
