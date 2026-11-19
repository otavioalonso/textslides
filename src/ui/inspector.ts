/* Right-hand panel: key help when nothing is selected, otherwise the selected vector object's settings. */
import { $ } from '../dom';
import { commit, snap } from '../editor';
import { DEFAULT_DELAY, pageOf, pages, type Page } from '../model/deck';
import { heatPixels } from '../model/heat';
import { dataPath } from '../model/plotdata';
import { folderName, hasFolderAccess, importInto, linkFolder, linkStatus, refreshAll, removeImported } from './data';
import { parseOf } from '../model/plot';
import type { HeatObj, PlotObj } from '../model/types';
import { ed, mark, S } from '../state';
import { HINTS } from './hints';

const HELP =
  '<code>V</code> select <code>B</code> box <code>L</code> line <code>T</code> text <code>F</code> draw <code>E</code> erase <code>G</code> plot <code>H</code> heat map<br><br>' +
  '<code>1–4</code> colour: normal, bright, accent, dim<br><code>R</code> highlighted bar: select cells and press R, then type in them<br><code>Ctrl+Z</code> undo · <code>Ctrl+Shift+Z</code> redo<br><code>Ctrl+C</code> / <code>X</code> / <code>V</code> copy, cut, paste cells and objects, also onto another slide (same place, or the selection)<br><code>Esc</code> leave text / cancel<br><code>P</code> present (Esc returns here)<br><br>' +
  '<code>$</code> in text mode opens the equation bar: type LaTeX, see it rendered above, Enter to place. Type <code>$</code> again at the start for display style. Click an equation (or double-click with select) to edit it.<br><br>' +
  'Plots are vector objects above the grid, anchored to cells.';

/** Bind a text field to the current slide's title or notes; one undo step per edit (focus to blur). */
function slideField(f: HTMLInputElement | HTMLTextAreaElement, key: 'title' | 'notes'): void {
  const s = S();
  f.value = s[key] || '';
  let pre: string | null = null;
  f.onfocus = () => { pre = snap(); };
  f.oninput = () => { if (f.value) s[key] = f.value; else delete s[key]; };
  f.onblur = () => { if (pre !== null) commit(pre); pre = null; };
}

const PLOT_HELP =
  '<h3>Plot</h3><p><code>data: results/x.json</code> draws a file written by <code>textslides.save(ax, …)</code> from matplotlib (see python/). ' +
  'These lines override it: <code>title:</code> <code>xlabel:</code> <code>ylabel:</code>, ranges <code>x: 0 10</code> <code>y: -1 1</code>, <code>xscale: log</code> <code>yscale: log</code>, <code>legend: off</code>, ' +
  '<code>style: braille</code> (curves as braille dots in the cells). Without a file: rows of <code>x y</code> numbers (blank line between series) or <code>= sin(x)</code>.</p>';

/** The plot's data source and the buttons to manage it. */
function dataPanel(el: HTMLElement, o: PlotObj): void {
  const box = document.createElement('div');
  box.id = 'dpanel';
  box.innerHTML = '<h3>Data</h3><p id="dstatus"></p><div class="row">' +
    '<button id="dimport" title="read a data file into the deck">import file…</button>' +
    (o.data ? '<button id="dremove">remove imported data</button>' : '') +
    (hasFolderAccess() ? '<button id="dlink" title="the folder that data: paths are relative to">link data folder…</button><button id="drefresh">refresh</button>' : '') +
    '</div>';
  el.appendChild(box);
  $('dimport').onclick = () => { importInto(o); };
  if (o.data) $('dremove').onclick = () => removeImported(o);
  if (hasFolderAccess()) {
    $('dlink').onclick = () => { linkFolder(); };
    $('drefresh').onclick = () => { refreshAll(true); };
  }
  refreshDataStatus();
}

/** Update the data status line in place (does not rebuild the panel, so typing in the spec is not disturbed). */
export function refreshDataStatus(): void {
  const st = document.getElementById('dstatus');
  if (!st) return;
  const o = ed.selObj >= 0 ? S().vec[ed.selObj] : null;
  if (!o || o.t !== 'plot') return;
  const path = dataPath(o.spec);
  const n = (d: { series: unknown[] }) => d.series.length + ' series';
  let t: string;
  if (o.data) t = 'Imported into the deck (' + n(o.data) + ')' + (path ? '; it is used instead of ' + path + '.' : '.');
  else if (path) t = path + ': ' + linkStatus(path) + '.';
  else t = 'None. Add a data: line, import a file, or drop a data file on the slide.';
  const f = folderName();
  st.textContent = t + (f ? ' Data folder: ' + f + '.' : '');
}
const HEAT_HELP =
  '<h3>Heat map</h3><p>Pixels are one cell wide and half a cell tall. Rows of <code>#</code> (secondary colour) and <code>.</code> (primary) — a weaving drawdown — or rows of numbers from −1 to 1; rows are tiled to fill the box. Or <code>= sin(u*6)*cos(v*4)</code>: <code>x</code>, <code>y</code> pixel index, <code>u</code>, <code>v</code> scaled 0–1, <code>rnd()</code>, <code>gauss()</code>.</p>';

/** The animation the current slide belongs to, if it has more than one frame. */
function animHead(): Page | null {
  const p = pages(ed.doc)[pageOf(ed.doc, ed.cur).page];
  return p.slides.length > 1 ? p : null;
}

export function refreshInspector(): void {
  const el = $('insp');
  const s = S();
  const o = ed.selObj >= 0 ? s.vec[ed.selObj] : null;
  if (!o) {
    el.innerHTML =
      '<h3>Slide ' + (ed.cur + 1) + '</h3><input type="text" id="stitle" placeholder="title (for the player and screen readers)">' +
      '<textarea id="snotes" rows="3" placeholder="speaker notes (N in the player)"></textarea>' +
      '<label class="ck"><input type="checkbox" id="sframe"' + (S().frame ? ' checked' : '') + (ed.cur === 0 ? ' disabled' : '') + '>animation frame of the previous slide</label>' +
      (animHead() ? '<label class="ck">ms per frame <input type="number" id="sdelay" min="20" step="10" style="width:80px"></label>' : '') +
      '<h3>Tool</h3><p id="hint"></p><h3>Keys</h3><p id="help">' + HELP + '</p>';
    $('hint').textContent = HINTS[ed.tool];
    slideField($<HTMLInputElement>('stitle'), 'title');
    slideField($<HTMLTextAreaElement>('snotes'), 'notes');
    $<HTMLInputElement>('sframe').onchange = (e) => {
      const pre = snap();
      if ((e.target as HTMLInputElement).checked) S().frame = true; else delete S().frame;
      commit(pre); refreshInspector(); mark();
    };
    const dl = document.getElementById('sdelay') as HTMLInputElement | null;
    if (dl) {
      const head = ed.doc.slides[animHead()!.slides[0]];
      dl.value = String(head.delay || DEFAULT_DELAY);
      dl.onchange = () => {
        const v = Math.round(+dl.value);
        if (!(v >= 20)) { dl.value = String(head.delay || DEFAULT_DELAY); return; }
        const pre = snap(); head.delay = v; commit(pre);
      };
    }
    return;
  }
  if (o.t === 'plot' || o.t === 'heat') {
    const isPlot = o.t === 'plot';
    const errOf = () => (isPlot ? parseOf(o as PlotObj).err : heatPixels(o as HeatObj).err);
    el.innerHTML = (isPlot ? PLOT_HELP : HEAT_HELP) +
      '<textarea id="spec" rows="12" spellcheck="false"></textarea><div class="row"><button id="del">delete ' + (isPlot ? 'plot' : 'heat map') + '</button></div><p id="perr" style="color:#ff8f8f"></p>';
    const ta = $<HTMLTextAreaElement>('spec');
    ta.value = o.spec;
    let pre: string | null = null;
    ta.onfocus = () => { pre = snap(); };
    ta.oninput = () => { o.spec = ta.value; $('perr').textContent = errOf(); refreshDataStatus(); mark(); };
    ta.onblur = () => { if (pre !== null) commit(pre); pre = null; };
    $('perr').textContent = errOf();
    if (isPlot) dataPanel(el, o as PlotObj);
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
