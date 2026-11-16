/* Right-hand panel: key help when nothing is selected, otherwise the selected vector object's settings. */
import { $ } from '../dom';
import { commit, snap } from '../editor';
import { parsePlot } from '../model/plot';
import { ed, mark, S } from '../state';
import { HINTS } from './hints';

const HELP =
  '<code>V</code> select <code>B</code> box <code>L</code> line <code>T</code> text <code>F</code> draw <code>E</code> erase <code>G</code> plot<br><br>' +
  '<code>1–4</code> colour: normal, bright, accent, dim<br><code>R</code> highlighted bar: select cells and press R, then type in them<br><code>Ctrl+Z</code> undo · <code>Ctrl+Shift+Z</code> redo<br><code>Esc</code> leave text / cancel<br><br>' +
  '<code>$</code> in text mode opens the equation bar: type LaTeX, see it rendered above, Enter to place. Type <code>$</code> again at the start for display style. Click an equation (or double-click with select) to edit it.<br><br>' +
  'Plots are vector objects above the grid, anchored to cells.';

export function refreshInspector(): void {
  const el = $('insp');
  const s = S();
  const o = ed.selObj >= 0 ? s.vec[ed.selObj] : null;
  if (!o) {
    el.innerHTML = '<h3>Tool</h3><p id="hint"></p><h3>Keys</h3><p id="help">' + HELP + '</p>';
    $('hint').textContent = HINTS[ed.tool];
    return;
  }
  if (o.t === 'plot') {
    el.innerHTML =
      '<h3>Plot</h3><p>Lines: <code>x: 0 10</code> <code>y: -1 1</code> <code>title: …</code> <code>xlabel:</code> <code>ylabel:</code>, <code>= sin(x)+0.2*gauss()</code> for a function series (<code>rnd()</code>, <code>gauss()</code> are seeded), or rows of <code>x y</code> numbers for data. Blank line separates data series.</p>' +
      '<textarea id="spec" rows="12" spellcheck="false"></textarea><div class="row"><button id="del">delete plot</button></div><p id="perr" style="color:#ff8f8f"></p>';
    const ta = $<HTMLTextAreaElement>('spec');
    ta.value = o.spec;
    let pre: string | null = null;
    ta.onfocus = () => { pre = snap(); };
    ta.oninput = () => { o.spec = ta.value; $('perr').textContent = parsePlot(o.spec).err; mark(); };
    ta.onblur = () => { if (pre !== null) commit(pre); pre = null; };
    $('perr').textContent = parsePlot(o.spec).err;
  } else {
    el.innerHTML =
      '<h3>Curve</h3><div class="row"><label class="ck"><input type="checkbox" id="osm"' + (o.smooth ? ' checked' : '') + '>smooth</label>' +
      '<label class="ck"><input type="checkbox" id="oar"' + (o.arrow ? ' checked' : '') + '>arrow</label>' +
      '<label class="ck"><input type="checkbox" id="oda"' + (o.dash ? ' checked' : '') + '>dashed</label></div>' +
      '<p>Drag the points to reshape. Colour follows the 1–4 buttons.</p><div class="row"><button id="del">delete curve</button></div>';
    ([['osm', 'smooth'], ['oar', 'arrow'], ['oda', 'dash']] as const).forEach(([id, key]) => {
      $<HTMLInputElement>(id).onchange = (e) => { const pre = snap(); o[key] = (e.target as HTMLInputElement).checked; commit(pre); mark(); };
    });
  }
  $('del').onclick = () => { const pre = snap(); s.vec.splice(ed.selObj, 1); ed.selObj = -1; commit(pre); refreshInspector(); mark(); };
}
