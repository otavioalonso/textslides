/* The equation bar: a LaTeX input drawn on the highlighted row, with a live KaTeX preview above it. */
import { commit, snap } from '../editor';
import { cv, eqbar, eqin, eqprev, eqtag } from '../dom';
import { eqClear, putEq, type EqGroup } from '../model/equations';
import { eqCells, katexHtml } from '../render/katex';
import { ed, G, mark, T, ui } from '../state';

export function openEq(g: EqGroup | null): void {
  if (ed.eqEdit) closeEq(true);
  const x = g ? g.x : ed.cursor!.x;
  const y = g ? g.y : ed.cursor!.y;
  const Th = T();
  ed.eqEdit = { x, y, disp: g ? g.disp : false, ex: g || null, pre: snap(), at: g ? g.at : ed.attr };
  eqin.value = g ? g.tex : '';
  eqbar.style.background = Th.p;
  eqbar.style.color = Th.bg;
  eqprev.style.background = Th.bg;
  eqprev.style.color = Th.c[ed.eqEdit.at & 3];
  eqprev.style.borderColor = Th.p;
  eqbar.style.display = 'flex';
  eqprev.style.display = 'block';
  ed.eqSig = '';
  mark();
  updateEqBar();
  eqin.focus();
}

export function updateEqBar(): void {
  const e = ed.eqEdit;
  if (!e) return;
  const { cwC, chC, fsC } = ed;
  eqtag.textContent = e.disp ? '$$' : '$';
  eqbar.style.height = chC + 'px';
  eqbar.style.fontSize = fsC + 'px';
  const wcell = Math.max(18, eqin.value.length + 4 + (e.disp ? 2 : 1));
  const maxW = ed.doc.cols - e.x;
  let left = e.x * cwC;
  const wpx = Math.min(wcell, Math.max(maxW, 18)) * cwC;
  const total = cv.width / ed.dpr;
  if (left + wpx > total) left = Math.max(0, total - wpx);
  eqbar.style.left = left + 'px';
  eqbar.style.top = e.y * chC + 'px';
  eqbar.style.width = wpx + 'px';
  const tex = eqin.value.trim();
  eqprev.style.fontSize = fsC * 1.25 + 'px';
  eqprev.innerHTML = tex ? katexHtml(tex, e.disp) : '<span class="ph">type LaTeX, e.g. \\frac{a}{b}</span>';
  const ph = eqprev.offsetHeight;
  const pw = eqprev.offsetWidth;
  let top = e.y * chC - ph - 6;
  if (top < 0) top = e.y * chC + chC + 6;
  eqprev.style.left = Math.max(0, Math.min(left, total - pw)) + 'px';
  eqprev.style.top = top + 'px';
}

export function closeEq(commitIt: boolean): void {
  const st = ed.eqEdit;
  if (!st) return;
  ed.eqEdit = null;
  eqbar.style.display = 'none';
  eqprev.style.display = 'none';
  if (commitIt) {
    const tex = eqin.value.trim();
    const g = G();
    let w = 0;
    if (st.ex) eqClear(g, st.ex);
    if (tex) w = putEq(g, st.x, st.y, tex, st.disp, st.at, eqCells(tex, st.disp));
    commit(st.pre);
    if (ed.tool === 'text') ed.cursor = { x: Math.min(ed.doc.cols - 1, st.x + (w || 0)), y: st.y };
  }
  ed.eqSig = '';
  ui.refreshInspector();
  mark();
}

export function initEqBar(): void {
  eqin.addEventListener('input', updateEqBar);
  eqin.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); closeEq(true); return; }
    if (e.key === 'Escape') { e.preventDefault(); closeEq(false); eqin.blur(); return; }
    if (e.key === '$') {
      e.preventDefault();
      if (!eqin.value.trim() && !ed.eqEdit!.disp) { ed.eqEdit!.disp = true; updateEqBar(); }
      else closeEq(true);
    }
  });
  eqin.addEventListener('blur', () => { if (ed.eqEdit) closeEq(true); });
}
