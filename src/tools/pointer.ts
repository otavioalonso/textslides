/* Canvas pointer events, dispatched to the active tool. */
import { cv } from '../dom';
import { commit, snap } from '../editor';
import { eqAt } from '../model/equations';
import { ed, G, mark, S } from '../state';
import { openEq } from '../ui/eqbar';
import { updateStatus } from '../ui/status';
import { drawDown, drawMove } from './draw';
import { hitHandle, hitObj, pos } from './hit';
import { pathDown } from './path';
import { plotDown, plotMove, plotUp } from './plot';
import { selectDown, selectMove, selectUp } from './select';
import { textDown } from './text';

/**
 * Set when a pointer-down opened the equation bar. The mousedown that follows would move focus off the
 * just-focused equation input (the canvas is not focusable), closing the bar at once, so it is cancelled.
 */
let keepEqFocus = false;

function onDown(e: PointerEvent): void {
  keepEqFocus = false;
  if (e.button !== 0) return;
  cv.setPointerCapture(e.pointerId);
  const p = pos(e);
  ed.hover = p;
  const pre = snap();
  if (ed.tool !== 'text' && ed.cursor) ed.cursor = null;
  switch (ed.tool) {
    case 'select': selectDown(p, pre); return;
    case 'text': {
      const before = ed.eqEdit;
      textDown(p);
      keepEqFocus = !!ed.eqEdit && ed.eqEdit !== before;
      return;
    }
    case 'path': pathDown(p, pre); return;
    case 'plot': plotDown(p, pre); mark(); return;
    default:
      drawDown(ed.tool, p, pre, e.shiftKey, e.altKey);
      mark();
  }
}

function onMove(e: PointerEvent): void {
  const p = pos(e);
  ed.hover = p;
  const d = ed.drag;
  if (!d) {
    if (ed.tool === 'select') cv.style.cursor = hitHandle(p) ? 'nwse-resize' : hitObj(p) >= 0 ? 'move' : 'default';
    else cv.style.cursor = ed.tool === 'text' ? 'text' : 'crosshair';
    if (ed.creating || ed.tool !== 'select') mark();
    else updateStatus();
    return;
  }
  switch (d.kind) {
    case 'selrect': case 'selmove': case 'objmove': case 'handle': selectMove(p); break;
    case 'plotnew': plotMove(p); break;
    default: drawMove(p, e.shiftKey, e.altKey);
  }
  mark();
}

function onUp(): void {
  const d = ed.drag;
  if (!d) return;
  ed.drag = null;
  switch (d.kind) {
    case 'selrect': case 'selmove': case 'objmove': case 'handle': selectUp(d); break;
    case 'plotnew': plotUp(d); break;
    default: commit(d.pre);
  }
  mark();
}

function onDblClick(e: MouseEvent): void {
  const pg = pos(e);
  const ge = eqAt(G(), pg.x, pg.y);
  if (ge) { openEq(ge); return; }
  if (ed.tool === 'select' && ed.selObj >= 0 && S().vec[ed.selObj].t === 'plot') {
    const t = document.getElementById('spec');
    if (t) t.focus();
  }
}

export function initPointer(): void {
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('mousedown', (e) => { if (keepEqFocus) { keepEqFocus = false; e.preventDefault(); } });
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointerleave', () => { ed.hover = null; mark(); });
  cv.addEventListener('dblclick', onDblClick);
}
