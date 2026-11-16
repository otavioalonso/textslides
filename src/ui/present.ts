/* Present mode (the exported page in a full-window sandboxed frame) and HTML export. */
import { $ } from '../dom';
import { buildPresentation } from '../export/presentation';
import { MSG_EXIT } from '../player/types';
import { ed, mark } from '../state';
import { download } from './modal';
import { gotoSlide } from './slides';

let frame: HTMLIFrameElement | null = null;

export function presenting(): boolean {
  return !!frame;
}

export async function present(): Promise<void> {
  if (frame) return;
  (document.activeElement as HTMLElement | null)?.blur?.(); // commits an open equation bar
  const box = $('present');
  frame = document.createElement('iframe');
  frame.title = 'Presentation';
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('allow', 'fullscreen');
  frame.setAttribute('allowfullscreen', '');
  box.appendChild(frame);
  box.classList.add('on');
  // Ask for full screen while the click still counts as a user gesture; the page is built after.
  box.requestFullscreen?.().catch(() => {});
  frame.srcdoc = await buildPresentation(ed.doc, { start: ed.cur, embedded: true });
  frame.onload = () => frame?.contentWindow?.focus();
}

function closePresent(slide: number): void {
  if (!frame) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  frame.remove();
  frame = null;
  $('present').classList.remove('on');
  if (slide !== ed.cur && slide < ed.doc.slides.length) gotoSlide(slide);
  mark();
}

export async function exportHtml(): Promise<void> {
  const html = await buildPresentation(ed.doc);
  download('slides.html', html, 'text/html');
  ed.msg = 'exported slides.html';
  mark();
}

export function initPresent(): void {
  $('bPresent').onclick = () => { present(); };
  $('bExport').onclick = () => { exportHtml(); };
  window.addEventListener('message', (e) => {
    if (!frame || e.source !== frame.contentWindow) return;
    const d = e.data as { type?: string; slide?: number };
    if (d && d.type === MSG_EXIT) closePresent(typeof d.slide === 'number' ? d.slide : ed.cur);
  });
}
