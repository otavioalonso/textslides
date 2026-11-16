/* Modal dialogs: plain-text view, save, open, new. */
import { $ } from '../dom';
import { afterLoad, emptyDoc, fresh, pushUndo, snap } from '../editor';
import { slideLabelNo } from '../model/deck';
import { slideText } from '../model/text';
import { toText } from '../model/textformat';
import { currentFileName, loadDeckText, openFile, saveFile } from './files';
import { ed } from '../state';
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

export function initModal(): void {
  $('modal').onclick = (e) => { if ((e.target as HTMLElement).id === 'modal') closeModal(); };
  $('bText').onclick = () => {
    const txt = deckText();
    openModal('Plain text (equations stay as $…$; heat maps and braille plots are included, vector plots are not)', '<textarea id="mt" readonly></textarea>',
      [['copy', () => copyFrom('mt')], ['download .txt', () => download('slides.txt', txt, 'text/plain')]]);
    $<HTMLTextAreaElement>('mt').value = txt;
  };
  $('bSave').onclick = () => {
    const txt = toText(ed.doc);
    const name = currentFileName();
    openModal('Save deck', '<p>The readable <code>.tslides</code> text format (diffs well in git); <b>save</b> writes it to disk' +
      (name ? ' (to <code>' + name.replace(/</g, '&lt;') + '</code>)' : '') + '. Ctrl+S saves, Ctrl+Shift+S saves as.</p><textarea id="mt" readonly></textarea>', [
      ['save', () => { closeModal(); saveFile(); }],
      ['save as…', () => { closeModal(); saveFile(true); }],
      ['copy', () => copyFrom('mt')],
      ['download .json', () => download('slides.json', JSON.stringify(ed.doc), 'application/json')],
    ]);
    $<HTMLTextAreaElement>('mt').value = txt;
  };
  $('bOpen').onclick = () => {
    openModal('Open deck', '<p>Open a <code>.tslides</code> or <code>.json</code> file (Ctrl+O), or paste a deck in either format.</p><textarea id="mt" placeholder="paste a deck here"></textarea>',
      [['open file…', () => { openFile(); }], ['load pasted', () => loadDeckText($<HTMLTextAreaElement>('mt').value)]]);
  };
  $('bNew').onclick = () => {
    openModal('Start over?', '<p>This replaces the current deck with the demo slide. Undo (Ctrl+Z) brings it back.</p>', [
      ['replace with demo', () => { const pre = snap(); fresh(); pushUndo(pre); closeModal(); afterLoad(); buildSlideList(); }],
      ['empty deck', () => { const pre = snap(); ed.doc = emptyDoc(ed.doc.theme); ed.cur = 0; pushUndo(pre); closeModal(); afterLoad(); buildSlideList(); }],
    ]);
  };
}
