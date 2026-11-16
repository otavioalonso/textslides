/*
 * Legacy free vector line tool. It has no toolbar button any more (removed on request), but the code is kept
 * so decks containing paths still select, move and edit correctly.
 */
import { commit } from '../editor';
import { ed, mark, S, ui, type PPos } from '../state';

export function pathDown(p: PPos, pre: string): void {
  const now = performance.now();
  const lc = ed.lastClickPos;
  if (ed.creating && lc && Math.hypot(p.px - lc[0], p.py - lc[1]) < 6 && now - ed.lastClick < 400) { finishPath(); return; }
  ed.lastClick = now;
  ed.lastClickPos = [p.px, p.py];
  if (!ed.creating) ed.creating = { pts: [], smooth: false, arrow: false, pre };
  ed.creating.pts.push(p.snap);
  mark();
}

export function finishPath(): void {
  const c = ed.creating;
  if (!c) return;
  const pts = c.pts.slice();
  while (pts.length > 1 && Math.hypot(pts[pts.length - 1][0] - pts[pts.length - 2][0], pts[pts.length - 1][1] - pts[pts.length - 2][1]) < 0.2) pts.pop();
  if (pts.length >= 2) {
    const s = S();
    s.vec.push({ t: 'path', pts, smooth: pts.length > 2, arrow: false, dash: false, attr: ed.attr });
    ed.selObj = s.vec.length - 1;
    ed.creating = null;
    ui.setTool('select');
    commit(c.pre);
    ui.refreshInspector();
  } else ed.creating = null;
  mark();
}
