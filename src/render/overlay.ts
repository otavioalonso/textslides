/* Equations are KaTeX HTML in an overlay div, one absolutely placed element per equation group. */
import { ov } from '../dom';
import { eqList } from '../model/equations';
import { ed, G, T } from '../state';
import { katexHtml } from './katex';
import { eqColor, eqElement } from './slide';

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
  for (const g of list) ov.appendChild(eqElement(g.x, g.y, g.w, ed.cwC, ed.chC, eqColor(Th, g.at), katexHtml(g.tex, g.disp)));
}
