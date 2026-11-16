/*
 * Text tool. A typing run is one undo step: the snapshot is pushed when the first key of the run is typed,
 * and any cursor movement ends the run.
 */
import { pushUndo, save, snap } from '../editor';
import { eqAt, eqClear } from '../model/equations';
import { ix, putCh } from '../model/grid';
import { ed, G, mark, S, ui, type PPos } from '../state';
import { openEq } from '../ui/eqbar';

export function textDown(p: PPos): void {
  const ge = eqAt(G(), p.x, p.y);
  if (ge) { openEq(ge); return; }
  ed.cursor = { x: p.x, y: p.y };
  ed.textX0 = p.x;
  ed.typing = false;
  ed.sel = null;
  ed.selObj = -1;
  ui.refreshInspector();
  mark();
}

function beginTyping(): void {
  if (!ed.typing) { pushUndo(snap()); ed.typing = true; }
}

function afterType(): void {
  ed.caretOn = true;
  save();
  mark();
}

export function typeStr(str: string): void {
  const cur = ed.cursor!;
  beginTyping();
  const g = G();
  for (const c of Array.from(str)) {
    if (c === '\n') { cur.y = Math.min(ed.doc.rows - 1, cur.y + 1); cur.x = ed.textX0; continue; }
    if (cur.x >= ed.doc.cols) break;
    const old = S().at[ix(g, cur.x, cur.y)] || 0;
    putCh(g, cur.x, cur.y, c === ' ' ? '' : c, ed.attr | (ed.rev ? 4 : old & 4));
    cur.x++;
  }
  afterType();
}

/** Keys while the text caret is active. Returns true if the key was consumed. */
export function textKey(e: KeyboardEvent): boolean {
  const k = e.key;
  const cur = ed.cursor!;
  const g = G();
  const rows = ed.doc.rows;
  const stop = () => { e.preventDefault(); ed.typing = false; };
  switch (k) {
    case 'Escape': ed.cursor = null; ed.typing = false; mark(); return true;
    case '$': stop(); openEq(null); return true;
    case 'Enter': stop(); cur.y = Math.min(rows - 1, cur.y + 1); cur.x = ed.textX0; afterType(); return true;
    case 'Backspace': {
      e.preventDefault();
      beginTyping();
      const gb = eqAt(g, cur.x - 1, cur.y);
      if (gb) { eqClear(g, gb); cur.x = gb.x; }
      else if (cur.x > 0) { cur.x--; S().ch[ix(g, cur.x, cur.y)] = ''; }
      afterType();
      return true;
    }
    case 'Delete': {
      e.preventDefault();
      beginTyping();
      const gd = eqAt(g, cur.x, cur.y);
      if (gd) eqClear(g, gd);
      else S().ch[ix(g, cur.x, cur.y)] = '';
      afterType();
      return true;
    }
    case 'ArrowLeft': { stop(); const gl = eqAt(g, cur.x - 1, cur.y); cur.x = gl ? gl.x : Math.max(0, cur.x - 1); afterType(); return true; }
    case 'ArrowRight': { stop(); const gr = eqAt(g, cur.x, cur.y); cur.x = Math.min(ed.doc.cols - 1, gr ? gr.x + gr.w : cur.x + 1); afterType(); return true; }
    case 'ArrowUp': stop(); cur.y = Math.max(0, cur.y - 1); afterType(); return true;
    case 'ArrowDown': stop(); cur.y = Math.min(rows - 1, cur.y + 1); afterType(); return true;
  }
  if (k.length === 1) { e.preventDefault(); typeStr(k); return true; }
  return true;
}
