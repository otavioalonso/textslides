/*
 * The presentation player. Bundled on its own (no KaTeX, no editor code) and inlined into exported HTML files;
 * the editor's present mode shows the same page. Reads its deck from <script id="deck" type="application/json">.
 */
import { FONT, THEMES } from '../model/constants';
import { pageOf, pages } from '../model/deck';
import { eqList } from '../model/equations';
import { slideText } from '../model/text';
import type { Grid } from '../model/types';
import type { Pen } from '../render/draw';
import { drawCells, drawVecs, eqColor, eqElement } from '../render/slide';
import { eqKey, MSG_EXIT, type Presentation } from './types';

const P: Presentation = JSON.parse(document.getElementById('deck')!.textContent!);
const doc = P.doc;
const PAGES = pages(doc);
const N = PAGES.length;
const THEME_ORDER = ['modern', 'c64'];
const THEME_LABEL: Record<string, string> = { modern: 'modern', c64: 'purple' };
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let page = 0;
let frame = 0;
let playing = !reduce; // animations start paused for people who reduce motion
let animTimer: ReturnType<typeof setInterval> | undefined;

/** Slide index shown now: the current frame of the current page. */
function cur(): number {
  return PAGES[page].slides[frame];
}
let theme = THEMES[doc.theme] ? doc.theme : 'modern';
let plain = false;
let revealRows: number | null = null;
let revTimer: ReturnType<typeof setInterval> | undefined;

/* ---------------------------------------------------------------- page */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
}

const header = el('header');
const navGrp = el('div', { class: 'grp' });
const prevBtn = el('button', { id: 'prev', 'aria-label': 'Previous slide' }, '◀ prev');
const count = el('span', { class: 'count', id: 'count', 'aria-hidden': 'true' });
const nextBtn = el('button', { id: 'next', 'aria-label': 'Next slide' }, 'next ▶');
navGrp.append(prevBtn, count, nextBtn);
const themeGrp = el('div', { class: 'grp', role: 'group', 'aria-label': 'Colour scheme' });
for (const t of THEME_ORDER) themeGrp.append(el('button', { 'data-theme': t, 'aria-pressed': 'false' }, THEME_LABEL[t]));
const viewGrp = el('div', { class: 'grp' });
const plainBtn = el('button', { id: 'plainbtn', 'aria-pressed': 'false', title: 'Plain-text view (T)' }, 'plain text');
const fsBtn = el('button', { id: 'fsbtn', title: 'Full screen (F)' }, 'full screen');
const animBtn = el('button', { id: 'animbtn', title: 'Play / pause the animation (A)' }, 'pause');
viewGrp.append(animBtn, plainBtn, fsBtn);
if (P.embedded) viewGrp.append(el('button', { id: 'closebtn', title: 'Back to the editor (Esc)' }, '✕ edit'));
header.append(navGrp, themeGrp, viewGrp);

const main = el('main');
const bezel = el('div', { id: 'bezel' });
const titlebar = el('div', { id: 'titlebar' });
for (const c of ['#ED6A5E', '#F5BF4F', '#61C554']) titlebar.append(el('i', { style: 'background:' + c }));
const titleText = el('span');
titlebar.append(titleText);
const screen = el('div', { id: 'screen' });
const cv = el('canvas', { id: 'cv', role: 'img' });
const eqBox = el('div', { id: 'eqs', 'aria-hidden': 'true' });
screen.append(cv, eqBox);
bezel.append(titlebar, screen);
const plainPre = el('pre', { id: 'plain' });
main.append(bezel, plainPre);

const footer = el('footer');
const progress = el('div', { id: 'progress' });
const progressBar = el('div');
progress.append(progressBar);
footer.append(progress, document.createTextNode(
  'Keys: ← → or Space to page · Home / End · C colours · T plain text · F full screen · A play/pause animation' + (P.embedded ? ' · Esc back to the editor' : ''),
));
const status = el('div', { class: 'sr', id: 'status', 'aria-live': 'polite' });
document.body.append(header, main, footer, status);
document.title = P.title;

const ctx = cv.getContext('2d')!;

/* ---------------------------------------------------------------- rendering */
function grid(k: number): Grid {
  return { cols: doc.cols, rows: doc.rows, s: doc.slides[k] };
}

/** First non-empty line of a slide, for labels. */
function slideLabel(k: number): string {
  if (doc.slides[k].title) return doc.slides[k].title!;
  const line = slideText(grid(k)).split('\n').find((l) => l.trim());
  return line ? line.replace(/\s+/g, ' ').trim() : 'empty slide';
}

let ratio = 0;
function cellSize(): { cw: number; dpr: number } {
  const dpr = window.devicePixelRatio || 1;
  if (!ratio) { ctx.font = '100px ' + FONT; ratio = ctx.measureText('M').width / 100 || 0.6; }
  const c64 = theme === 'c64';
  const chrome = (document.body.classList.contains('fs') ? 0 : header.offsetHeight + footer.offsetHeight + 16) + (c64 ? 0 : 30);
  const availW = window.innerWidth - (document.body.classList.contains('fs') ? 0 : 24);
  const availH = window.innerHeight - chrome;
  // The c64 bezel pads by 1.6 font sizes on each side; solve for the cell width including it.
  const padCells = c64 ? 2 * 1.6 / ratio : 0;
  let cw = Math.floor(Math.min((availW * dpr) / (doc.cols + padCells), (availH * dpr) / (doc.rows * 2.2 + padCells)));
  cw = Math.max(4, cw);
  return { cw, dpr };
}

function render(): void {
  const Th = THEMES[theme];
  const s = doc.slides[cur()];
  const { cw, dpr } = cellSize();
  const ch = Math.round(cw * 2.2);
  const fs = cw / ratio;
  cv.width = doc.cols * cw;
  cv.height = doc.rows * ch;
  cv.style.width = cv.width / dpr + 'px';
  cv.style.height = cv.height / dpr + 'px';
  bezel.className = theme;
  bezel.style.setProperty('--pad', (fs / dpr) * 1.6 + 'px');
  titleText.textContent = P.title + ' — ' + doc.cols + '×' + doc.rows;

  const pen: Pen = { ctx, cw, ch, fs };
  ctx.fillStyle = Th.bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = fs + 'px ' + FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const lim = revealRows === null ? doc.rows : revealRows;
  drawCells(pen, s, doc.cols, doc.rows, Th, lim);
  drawVecs(pen, s, Th, lim);
  ctx.textBaseline = 'alphabetic';

  // Equations: pre-rendered HTML placed on their cells, shrunk if this machine's fonts make them wider.
  const cwC = cw / dpr;
  const chC = ch / dpr;
  eqBox.innerHTML = '';
  eqBox.style.width = cv.style.width;
  eqBox.style.height = cv.style.height;
  eqBox.style.fontSize = fs / dpr + 'px';
  for (const g of eqList(grid(cur()))) {
    const html = P.eqs[eqKey(g.tex, g.disp)] ?? '';
    const d = eqElement(g.x, g.y, g.w, cwC, chC, eqColor(Th, g.at), '<span>' + html + '</span>');
    if (g.y >= lim) d.style.visibility = 'hidden';
    eqBox.append(d);
    const inner = d.firstElementChild as HTMLElement;
    const w = inner.getBoundingClientRect().width;
    if (w > g.w * cwC + 1) inner.style.transform = 'scale(' + (g.w * cwC) / w + ')';
  }

  count.textContent = String(page + 1).padStart(2, '0') + '/' + String(N).padStart(2, '0');
  progressBar.style.width = ((page + 1) / N) * 100 + '%';
  progressBar.style.background = Th.c[2];
  cv.setAttribute('aria-label', 'Slide ' + (page + 1) + ': ' + slideLabel(PAGES[page].slides[0]));
  animBtn.style.display = PAGES[page].slides.length > 1 ? '' : 'none';
  animBtn.textContent = playing ? 'pause' : 'play';
  animBtn.setAttribute('aria-pressed', String(!playing));
  for (const b of themeGrp.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.theme === theme));
}

/* ---------------------------------------------------------------- navigation */
function reveal(): void {
  clearInterval(revTimer);
  if (reduce) { revealRows = null; render(); return; }
  const per = Math.max(1, Math.ceil(doc.rows / 16));
  revealRows = 0;
  revTimer = setInterval(() => {
    revealRows! += per;
    if (revealRows! >= doc.rows) { revealRows = null; clearInterval(revTimer); }
    render();
  }, 18);
  render();
}

function go(p: number, animate = true, startFrame = 0): void {
  const next = Math.max(0, Math.min(N - 1, p));
  const changed = next !== page;
  page = next;
  if (changed) frame = startFrame;
  status.textContent = 'Slide ' + (page + 1) + ' of ' + N + ': ' + slideLabel(PAGES[page].slides[0]);
  plainPre.textContent = slideText(grid(cur()));
  runFrames();
  if (!P.embedded) { try { history.replaceState(null, '', '#' + (page + 1)); } catch { /* sandboxed */ } }
  if (animate && changed) reveal(); else { revealRows = null; render(); }
}

/** (Re)start the frame timer for the current page; frames advance only once the page is fully revealed. */
function runFrames(): void {
  clearInterval(animTimer);
  const pg = PAGES[page];
  if (pg.slides.length < 2 || !playing) return;
  animTimer = setInterval(() => {
    if (revealRows !== null) return;
    frame = (frame + 1) % pg.slides.length;
    plainPre.textContent = slideText(grid(cur()));
    render();
  }, pg.delay);
}

function togglePlay(): void {
  playing = !playing;
  runFrames();
  render();
}

function setTheme(t: string): void {
  theme = t;
  render();
}

function togglePlain(): void {
  plain = !plain;
  document.body.classList.toggle('showplain', plain);
  plainBtn.setAttribute('aria-pressed', String(plain));
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}

function exit(): void {
  if (P.embedded && window.parent !== window) window.parent.postMessage({ type: MSG_EXIT, slide: cur() }, '*');
}

prevBtn.onclick = () => go(page - 1);
nextBtn.onclick = () => go(page + 1);
for (const b of themeGrp.querySelectorAll('button')) b.addEventListener('click', () => setTheme(b.dataset.theme!));
plainBtn.onclick = togglePlain;
fsBtn.onclick = toggleFullscreen;
animBtn.onclick = togglePlay;
const closeBtn = document.getElementById('closebtn');
if (closeBtn) closeBtn.onclick = exit;

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  const onButton = (e.target as HTMLElement).tagName === 'BUTTON';
  if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !onButton)) { go(page + 1); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'PageUp') { go(page - 1); e.preventDefault(); }
  else if (k === 'Home') { go(0); e.preventDefault(); }
  else if (k === 'End') { go(N - 1); e.preventDefault(); }
  else if (k === 'c' || k === 'C') setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]);
  else if (k === 't' || k === 'T') togglePlain();
  else if (k === 'f' || k === 'F') toggleFullscreen();
  else if (k === 'a' || k === 'A') togglePlay();
  else if (k === 'Escape' && !document.fullscreenElement) exit();
});

document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('fs', !!document.fullscreenElement);
  fsBtn.setAttribute('aria-pressed', String(!!document.fullscreenElement));
  render();
});
let rz: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 60); });

/* ---------------------------------------------------------------- start */
const m = (location.hash || '').match(/^#(\d+)$/);
page = -1;
const startAt = pageOf(doc, P.start ?? 0);
if (m && !P.embedded) go(+m[1] - 1, false);
else go(startAt.page, false, startAt.frame);
window.focus();
// Re-render once fonts are in: KaTeX glyph widths change the equation scaling.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
