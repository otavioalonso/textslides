/* Grid drawing tools: box, line, brush, erase. They redraw from a copy of the grid taken at pointer-down. */
import { atColour } from '../model/constants';
import { bres, clearCell, cloneGrid, drawBox, drawLine, putCh, restoreGrid } from '../model/grid';
import { ed, G, type PPos } from '../state';

type DrawKind = 'box' | 'line' | 'brush' | 'erase' | 'arrow';

export function drawDown(kind: DrawKind, p: PPos, pre: string, shift: boolean, alt: boolean): void {
  ed.drag = { kind, p0: p, pre, base: cloneGrid(G()), last: p };
  drawMove(p, shift, alt);
}

export function drawMove(p: PPos, shift: boolean, alt: boolean): void {
  const d = ed.drag;
  if (!d || !('base' in d) || d.kind === 'selmove') return;
  const g = G();
  if (d.kind === 'brush' || d.kind === 'erase') {
    const brush = d.kind === 'brush';
    bres(d.last.x, d.last.y, p.x, p.y, (x, y) => { if (brush) putCh(g, x, y, ed.brushCh, atColour(ed.attr)); else clearCell(g, x, y); });
    d.last = p;
    return;
  }
  restoreGrid(g, d.base);
  if (d.kind === 'box') drawBox(g, d.p0, p, atColour(ed.attr));
  else if (d.kind === 'line') drawLine(g, d.p0, p, shift, alt, atColour(ed.attr));
}
