/* Equations are KaTeX HTML in an overlay div, one absolutely placed element per equation group. */
import { ov } from '../dom';
import { eqList } from '../model/equations';
import { ed, G, T } from '../state';
import { katexHtml } from './katex';

export function updateEq(): void {
  const e = ed.eqEdit;
  const list = eqList(G())
    .filter((g) => !(e && e.ex && e.ex.x === g.x && e.ex.y === g.y))
    .map((g) => ({ x: g.x, y: g.y, w: g.w, tex: g.tex, disp: g.disp, at: g.at }));
  const sig = JSON.stringify([list, ed.cwC, ed.chC, ed.doc.theme]);
  if (sig === ed.eqSig) return;
  ed.eqSig = sig;
  const Th = T();
  ov.innerHTML = '';
  for (const g of list) {
    const d = document.createElement('div');
    d.className = 'eq';
    d.style.left = g.x * ed.cwC + 'px';
    d.style.top = g.y * ed.chC + 'px';
    d.style.width = g.w * ed.cwC + 'px';
    d.style.height = ed.chC + 'px';
    d.style.color = Th.c[g.at & 3];
    d.innerHTML = katexHtml(g.tex, g.disp);
    ov.appendChild(d);
  }
}
