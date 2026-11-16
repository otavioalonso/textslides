import { commit, redo, snap, undo } from '../editor';
import { clearRect, extract, pasteBuf } from '../model/grid';
import { ed, G, mark, S, ui } from '../state';
import { finishPath } from '../tools/path';
import { moveSel } from '../tools/select';
import { textKey, typeStr } from '../tools/text';
import { TOOLS } from './hints';
import { closeModal, modalOpen } from './modal';
import { present, presenting } from './present';
import { setAttr, setTool, toggleRev } from './toolbar';

function onKey(e: KeyboardEvent): void {
  const tg = (e.target as HTMLElement).tagName;
  if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return; }
  if (presenting()) return;
  if (modalOpen()) { if (e.key === 'Escape') closeModal(); return; }
  const k = e.key;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
  if (ed.tool === 'text' && ed.cursor && !mod) { textKey(e); return; }
  if (ed.creating) {
    if (k === 'Enter') { e.preventDefault(); finishPath(); return; }
    if (k === 'Escape') { ed.creating = null; mark(); return; }
  }
  const g = G();
  if (mod && (k === 'c' || k === 'x') && ed.sel) {
    ed.clip = extract(g, ed.sel);
    if (k === 'x') { const pre = snap(); clearRect(g, ed.sel); commit(pre); }
    e.preventDefault();
    mark();
    return;
  }
  if (mod && k === 'v' && ed.clip) {
    e.preventDefault();
    const pre = snap();
    const px = ed.sel ? ed.sel.x : ed.hover ? ed.hover.x : 0;
    const py = ed.sel ? ed.sel.y : ed.hover ? ed.hover.y : 0;
    pasteBuf(g, ed.clip, px, py);
    ed.sel = { x: px, y: py, w: ed.clip.w, h: ed.clip.h };
    commit(pre);
    mark();
    return;
  }
  if (mod) return;
  if (k === 'Escape') { ed.sel = null; ed.selObj = -1; ui.refreshInspector(); mark(); return; }
  if (k === 'Delete' || k === 'Backspace') {
    if (ed.selObj >= 0) { const pre = snap(); S().vec.splice(ed.selObj, 1); ed.selObj = -1; commit(pre); ui.refreshInspector(); mark(); e.preventDefault(); return; }
    if (ed.sel) { const pre = snap(); clearRect(g, ed.sel); commit(pre); mark(); e.preventDefault(); return; }
  }
  if (ed.sel && ed.tool === 'select') {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (step[k]) { e.preventDefault(); moveSel(step[k][0], step[k][1], snap()); return; }
  }
  if (k >= '1' && k <= '4') { setAttr(+k - 1); return; }
  if (k === 'r' || k === 'R') { toggleRev(); return; }
  if (k === 'p' || k === 'P') { present(); return; }
  const lk = k.toLowerCase();
  for (const t of TOOLS) if (t[2].toLowerCase() === lk) { setTool(t[0]); return; }
}

function onPaste(e: ClipboardEvent): void {
  const tg = (e.target as HTMLElement).tagName;
  if (tg === 'INPUT' || tg === 'TEXTAREA') return;
  if (ed.tool === 'text' && ed.cursor) {
    const t = (e.clipboardData && e.clipboardData.getData('text')) || '';
    if (t) { e.preventDefault(); typeStr(t.replace(/\r/g, '').replace(/\t/g, '  ')); }
  }
}

export function initKeyboard(): void {
  document.addEventListener('keydown', onKey);
  document.addEventListener('paste', onPaste);
  setInterval(() => { if (ed.tool === 'text' && ed.cursor && !ed.previewOn) { ed.caretOn = !ed.caretOn; mark(); } }, 530);
}
