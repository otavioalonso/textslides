/* Slide list: thumbnails and the new / copy / reorder / delete buttons. */
import { $ } from '../dom';
import { commit, snap } from '../editor';
import { mkSlide } from '../model/grid';
import { ed, mark, S, T, ui } from '../state';

export function drawThumbs(): void {
  const box = $('slides');
  const Th = T();
  const doc = ed.doc;
  if (box.children.length !== doc.slides.length) buildSlideList();
  doc.slides.forEach((sl, k) => {
    const c = box.children[k].firstChild as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const px = Math.max(1, Math.floor(300 / doc.cols));
    const py = px * 2;
    c.width = doc.cols * px;
    c.height = doc.rows * py;
    g.fillStyle = Th.bg;
    g.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < doc.rows; y++)
      for (let x = 0; x < doc.cols; x++) {
        const i = y * doc.cols + x;
        if (!sl.ch[i] && !sl.mk[i]) continue;
        g.fillStyle = Th.c[(sl.at[i] || 0) & 3];
        g.globalAlpha = sl.ch[i] && sl.ch[i] !== ' ' ? 0.8 : 0.5;
        g.fillRect(x * px, y * py, px, py);
      }
    g.globalAlpha = 1;
    for (const o of sl.vec) {
      if (o.t === 'heat') { g.fillStyle = Th.p; g.globalAlpha = 0.5; g.fillRect(o.x * px, o.y * py, o.w * px, o.h * py); g.globalAlpha = 1; }
      else if (o.t === 'plot') { g.strokeStyle = Th.q; g.strokeRect(o.x * px + 0.5, o.y * py + 0.5, o.w * px, o.h * py); }
      else {
        g.strokeStyle = Th.c[o.attr || 0];
        g.lineWidth = 1;
        g.beginPath();
        o.pts.forEach((p, i) => { if (i) g.lineTo(p[0] * px, p[1] * py); else g.moveTo(p[0] * px, p[1] * py); });
        g.stroke();
      }
    }
    box.children[k].className = 'th' + (k === ed.cur ? ' on' : '');
  });
}

export function buildSlideList(): void {
  const box = $('slides');
  box.innerHTML = '';
  ed.doc.slides.forEach((_, k) => {
    const d = document.createElement('div');
    d.className = 'th';
    d.innerHTML = '<canvas></canvas><span>' + (k + 1) + '</span>';
    d.onclick = () => gotoSlide(k);
    box.appendChild(d);
  });
}

export function gotoSlide(k: number): void {
  if (k < 0 || k >= ed.doc.slides.length) return;
  ed.cur = k;
  ed.sel = null;
  ed.selObj = -1;
  ed.cursor = null;
  ed.typing = false;
  ed.creating = null;
  ui.refreshInspector();
  mark();
}

export function buildSlideBtns(): void {
  const b = $('sbtn');
  if (b.children.length) return;
  const doc = () => ed.doc;
  const actions: [string, () => void][] = [
    ['+ new', () => {
      const pre = snap();
      doc().slides.splice(ed.cur + 1, 0, mkSlide(doc().cols, doc().rows));
      ed.cur++; ed.sel = null; ed.selObj = -1;
      commit(pre); buildSlideList(); ui.refreshInspector(); mark();
    }],
    ['copy', () => {
      const pre = snap();
      doc().slides.splice(ed.cur + 1, 0, JSON.parse(JSON.stringify(S())));
      ed.cur++;
      commit(pre); buildSlideList(); mark();
    }],
    ['↑', () => {
      if (ed.cur < 1) return;
      const pre = snap();
      const sl = doc().slides;
      [sl[ed.cur], sl[ed.cur - 1]] = [sl[ed.cur - 1], sl[ed.cur]];
      ed.cur--;
      commit(pre); mark();
    }],
    ['↓', () => {
      const sl = doc().slides;
      if (ed.cur >= sl.length - 1) return;
      const pre = snap();
      [sl[ed.cur], sl[ed.cur + 1]] = [sl[ed.cur + 1], sl[ed.cur]];
      ed.cur++;
      commit(pre); mark();
    }],
    ['delete', () => {
      const sl = doc().slides;
      if (sl.length < 2) return;
      const pre = snap();
      sl.splice(ed.cur, 1);
      ed.cur = Math.min(ed.cur, sl.length - 1); ed.sel = null; ed.selObj = -1;
      commit(pre); buildSlideList(); ui.refreshInspector(); mark();
    }],
  ];
  for (const [label, fn] of actions) {
    const el = document.createElement('button');
    el.textContent = label;
    el.onclick = fn;
    b.appendChild(el);
  }
}
