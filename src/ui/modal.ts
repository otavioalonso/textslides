/* Modal dialogs: plain-text view, save, open, new. */
import { $ } from '../dom';
import { afterLoad, emptyDoc, fresh, pushUndo, snap } from '../editor';
import { slideLabelNo } from '../model/deck';
import { slideText } from '../model/text';
import { ed, mark } from '../state';
import { buildSlideList } from './slides';

export function openModal(title: string, body: string, btns: [string, () => void][]): void {
  const b = $('mbox');
  b.innerHTML = '<h2>' + title + '</h2>' + body + '<div class="row" id="mbtns"></div>';
  const bb = $('mbtns');
  for (const [label, fn] of btns) {
    const el = document.createElement('button');
    el.textContent = label;
    el.onclick = fn;
    bb.appendChild(el);
  }
  const c = document.createElement('button');
  c.textContent = 'close';
  c.onclick = closeModal;
  bb.appendChild(c);
  $('modal').classList.add('on');
}

export function closeModal(): void {
  $('modal').classList.remove('on');
}

export function modalOpen(): boolean {
  return $('modal').classList.contains('on');
}

export function download(name: string, text: string, type: string): void {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch { /* downloads blocked (e.g. sandboxed viewer) */ }
}

function copyFrom(id: string): void {
  const t = $<HTMLTextAreaElement>(id);
  t.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
}

export function deckText(): string {
  const d = ed.doc;
  return d.slides.map((s, i) => '── slide ' + slideLabelNo(d, i) + (s.title ? ': ' + s.title : '') + ' ──\n' + slideText({ cols: d.cols, rows: d.rows, s })).join('\n\n');
}

function loadText(t: string): void {
  try {
    const d = JSON.parse(t);
    if (!d.slides || !d.cols || !d.rows) throw 0;
    const pre = snap();
    ed.doc = d;
    ed.cur = 0;
    pushUndo(pre);
    closeModal();
    afterLoad();
    buildSlideList();
  } catch {
    ed.msg = 'not a valid deck file';
    mark();
  }
}

export function initModal(): void {
  $('modal').onclick = (e) => { if ((e.target as HTMLElement).id === 'modal') closeModal(); };
  $('bText').onclick = () => {
    const txt = deckText();
    openModal('Plain text (equations stay as $…$, vector objects are not included)', '<textarea id="mt" readonly></textarea>',
      [['copy', () => copyFrom('mt')], ['download .txt', () => download('slides.txt', txt, 'text/plain')]]);
    $<HTMLTextAreaElement>('mt').value = txt;
  };
  $('bSave').onclick = () => {
    const js = JSON.stringify(ed.doc);
    openModal('Save deck (JSON)', '<textarea id="mt" readonly></textarea>',
      [['copy', () => copyFrom('mt')], ['download .json', () => download('slides.json', js, 'application/json')]]);
    $<HTMLTextAreaElement>('mt').value = js;
  };
  $('bOpen').onclick = () => {
    openModal('Open deck', '<textarea id="mt" placeholder="paste deck JSON here"></textarea><input type="file" id="mf" accept=".json,application/json">',
      [['load', () => loadText($<HTMLTextAreaElement>('mt').value)]]);
    $<HTMLInputElement>('mf').onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => loadText(r.result as string);
      r.readAsText(f);
    };
  };
  $('bNew').onclick = () => {
    openModal('Start over?', '<p>This replaces the current deck with the demo slide. Undo (Ctrl+Z) brings it back.</p>', [
      ['replace with demo', () => { const pre = snap(); fresh(); pushUndo(pre); closeModal(); afterLoad(); buildSlideList(); }],
      ['empty deck', () => { const pre = snap(); ed.doc = emptyDoc(ed.doc.theme); ed.cur = 0; pushUndo(pre); closeModal(); afterLoad(); buildSlideList(); }],
    ]);
  };
}
