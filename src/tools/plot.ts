import { commit } from '../editor';
import { rectOf } from '../model/grid';
import { ed, S, ui, type Drag, type PPos } from '../state';

export const NEW_PLOT_SPEC = 'x: 0 10\ntitle: new plot\n= sin(x)+0.3*gauss()\n= 0.6*cos(1.7*x)';

export function plotDown(p: PPos, pre: string): void {
  ed.drag = { kind: 'plotnew', p0: p, pre, rect: { x: p.x, y: p.y, w: 1, h: 1 } };
}

export function plotMove(p: PPos): void {
  const d = ed.drag;
  if (d && d.kind === 'plotnew') d.rect = rectOf(d.p0, p);
}

export function plotUp(d: Drag): void {
  if (d.kind !== 'plotnew') return;
  const r = d.rect;
  if (r.w >= 6 && r.h >= 4) {
    const s = S();
    s.vec.push({ t: 'plot', x: r.x, y: r.y, w: r.w, h: r.h, spec: NEW_PLOT_SPEC });
    ed.selObj = s.vec.length - 1;
    ui.setTool('select');
    commit(d.pre);
    ui.refreshInspector();
  }
}
