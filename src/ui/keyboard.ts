import { commit, redo, snap, undo } from '../editor';
import { copyObject, copyRegion, objectsIn, pasteClip } from '../model/clipboard';
import { clearRect } from '../model/grid';
import { ed, G, mark, S, ui } from '../state';
import { finishPath } from '../tools/path';
import { moveSel } from '../tools/select';
import { textKey, typeStr } from '../tools/text';
import { TOOLS } from './hints';
import { openFile, saveFile } from './files';
import { closeModal, modalOpen } from './modal';
import { present, presenting } from './present';
import { setAttr, setTool, toggleRev } from './toolbar';

function onKey(e: KeyboardEvent): void {
  // File keys work everywhere, also while typing in a field.
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur?.(); saveFile(e.shiftKey); return; }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); openFile(); return; }
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
  const lower = k.toLowerCase();
  if (mod && (lower === 'c' || lower === 'x') && (ed.selObj >= 0 || ed.sel)) {
    e.preventDefault();
    copySelection(lower === 'x');
    return;
  }
  if (mod && lower === 'v' && ed.clip) {
    e.preventDefault();
    pasteClipboard();
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
  if (k.length === 1 && k >= '1' && k <= '8') { setAttr(+k - 1); return; }
  if (k === 'r' || k === 'R') { toggleRev(); return; }
  if (k === 'p' || k === 'P') { present(); return; }
  const lk = k.toLowerCase();
  for (const t of TOOLS) if (t[2].toLowerCase() === lk) { setTool(t[0]); return; }
}

/** Copy (or cut) the selected object, or the selected cells with the objects lying inside them. */
function copySelection(cut: boolean): void {
  const g = G();
  const s = S();
  const pre = snap();
  if (ed.selObj >= 0) {
    ed.clip = copyObject(s.vec[ed.selObj]);
    if (cut) { s.vec.splice(ed.selObj, 1); ed.selObj = -1; ui.refreshInspector(); }
  } else if (ed.sel) {
    ed.clip = copyRegion(g, ed.sel);
    if (cut) {
      for (const i of objectsIn(g, ed.sel).reverse()) s.vec.splice(i, 1);
      clearRect(g, ed.sel);
    }
  } else return;
  if (cut) commit(pre);
  const n = ed.clip.objs.length;
  ed.msg = (cut ? 'cut ' : 'copied ') + [ed.clip.buf ? 'cells' : '', n ? n + (n > 1 ? ' objects' : ' object') : ''].filter(Boolean).join(' and ') +
    ' · Ctrl+V pastes, also on another slide';
  mark();
}

/** Paste at the selection's corner, or where the clip was copied from. */
function pasteClipboard(): void {
  const c = ed.clip!;
  const pre = snap();
  const r = pasteClip(G(), c, ed.sel ? ed.sel.x : c.x, ed.sel ? ed.sel.y : c.y);
  if (c.buf) { ed.sel = r.rect; ed.selObj = -1; }
  else if (r.objs.length) { ui.setTool('select'); ed.sel = null; ed.selObj = r.objs[r.objs.length - 1]; }
  commit(pre);
  ui.refreshInspector();
  ed.msg = 'pasted';
  mark();
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
