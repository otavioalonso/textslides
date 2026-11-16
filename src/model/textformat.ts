/*
 * The .tslides text format: a deck as plain text that reads like the slides and diffs well in git.
 *
 *   textslides 1
 *   size 80x24
 *   theme modern
 *
 *   === slide                       one section per slide
 *   title: Intro                    optional: title, frame: yes, delay: 60
 *   notes:                          optional block, lines indented by two spaces
 *     first line of notes
 *   --- text                        the characters, one row per line after "|"
 *   |┌────┐  hello                  junctions are written as box-drawing glyphs, equations as their source
 *   --- colour                      optional: per cell . 1 2 3 = colour, A B C D = colour 0–3 on a bar
 *   |....22
 *   --- lines                       optional: junction mask per cell as a hex digit (. = none)
 *   |6aaaac
 *   --- equations                   optional: x y I|D width tex
 *   2 9 I 12 w_i\to 1/(1-p)
 *   --- plot 47 3 31 13             vector objects: plot / heat with x y w h and the spec indented,
 *     x: 0 10                       path with its JSON indented
 *
 * Rows and layers are trimmed at the right and bottom. Reading is lossless except that a literal space
 * character in a cell reads back as an empty cell (they draw the same).
 */
import { EQ_C, GL } from './constants';
import { eqEncode, eqParse } from './equations';
import { mkSlide } from './grid-base';
import type { Doc, Slide, VecObj } from './types';

export const MAGIC = 'textslides 1';

const BAR_LETTERS = 'ABCD';

/** Trim only spaces (text layer) or only dots (other layers) at the right. */
function trimLayer(rows: string[], pad: string): string[] {
  const re = pad === ' ' ? / +$/ : /\.+$/;
  const out = rows.map((r) => r.replace(re, ''));
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

function indent(text: string): string[] {
  return text.split('\n').map((l) => '  ' + l);
}

export function toText(doc: Doc): string {
  const L: string[] = [MAGIC, 'size ' + doc.cols + 'x' + doc.rows, 'theme ' + doc.theme];
  const { cols, rows } = doc;
  for (const s of doc.slides) {
    L.push('', '=== slide');
    if (s.title) L.push('title: ' + s.title.replace(/\n/g, ' '));
    if (s.frame) L.push('frame: yes');
    if (s.delay) L.push('delay: ' + s.delay);
    if (s.notes) L.push('notes:', ...indent(s.notes));
    const text: string[] = [];
    const colour: string[] = [];
    const lines: string[] = [];
    const eqs: string[] = [];
    for (let y = 0; y < rows; y++) {
      let t = '';
      let c = '';
      let m = '';
      let eqLeft = 0;
      let eqSrc: string[] = [];
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const ch = s.ch[i];
        const mk = s.mk[i] || 0;
        const at = s.at[i] || 0;
        const e = eqParse(ch);
        if (e) {
          eqs.push(x + ' ' + y + ' ' + (e.disp ? 'D' : 'I') + ' ' + e.w + ' ' + e.tex);
          eqSrc = Array.from(e.tex.replace(/\s/g, ' '));
          eqLeft = e.w;
        }
        if (eqLeft > 0 && (e || ch === EQ_C)) {
          // Readable stand-in for the equation's cells (its source, cut to fit); ignored when reading.
          t += eqSrc.shift() ?? '~';
          eqLeft--;
        } else if (ch && ch !== EQ_C) {
          const one = Array.from(ch)[0]; // a cell holds one character; anything else is not drawn either
          t += one === '\n' || one === '\r' || one === '\t' ? ' ' : one;
        }
        else if (mk) t += GL[mk] || '┼';
        else t += ' ';
        c += at & 4 ? BAR_LETTERS[at & 3] : at & 3 ? String(at & 3) : '.';
        m += mk ? mk.toString(16) : '.';
      }
      text.push(t);
      colour.push(c);
      lines.push(m);
    }
    L.push('--- text', ...trimLayer(text, ' ').map((r) => '|' + r));
    const cl = trimLayer(colour, '.');
    if (cl.length) L.push('--- colour', ...cl.map((r) => '|' + r));
    const ml = trimLayer(lines, '.');
    if (ml.length) L.push('--- lines', ...ml.map((r) => '|' + r));
    if (eqs.length) L.push('--- equations', ...eqs);
    for (const o of s.vec) {
      if (o.t === 'path') L.push('--- path', ...indent(JSON.stringify({ pts: o.pts, smooth: o.smooth, arrow: o.arrow, dash: o.dash, attr: o.attr })));
      else L.push('--- ' + o.t + ' ' + o.x + ' ' + o.y + ' ' + o.w + ' ' + o.h, ...indent(o.spec));
    }
  }
  return L.join('\n') + '\n';
}

export class FormatError extends Error {
  constructor(msg: string, line: number) {
    super('line ' + line + ': ' + msg);
  }
}

export function isTextFormat(text: string): boolean {
  return text.replace(/^﻿/, '').startsWith('textslides ');
}

export function fromText(text: string): Doc {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let n = 0;
  const fail = (msg: string): never => { throw new FormatError(msg, n + 1); };
  if (lines[0].trim() !== MAGIC) fail('not a textslides 1 file');
  let cols = 80;
  let rows = 24;
  let theme = 'modern';
  const slides: Slide[] = [];
  n = 1;
  for (; n < lines.length && !lines[n].startsWith('=== '); n++) {
    const l = lines[n].trim();
    let m: RegExpMatchArray | null;
    if (!l) continue;
    if ((m = l.match(/^size (\d+)x(\d+)$/))) { cols = +m[1]; rows = +m[2]; }
    else if ((m = l.match(/^theme (\S+)$/))) theme = m[1];
    else fail('unknown header line "' + l + '"');
  }
  if (!(cols > 0 && rows > 0 && cols <= 400 && rows <= 200)) fail('bad size');

  /** Lines indented by two spaces from n on (the block of the line before). */
  const block = (): string => {
    const out: string[] = [];
    while (n < lines.length && (lines[n].startsWith('  ') || (lines[n] === '' && lines[n + 1]?.startsWith('  ')))) out.push(lines[n++].slice(2));
    return out.join('\n');
  };
  const layer = (): string[] => {
    const out: string[] = [];
    while (n < lines.length && lines[n].startsWith('|')) out.push(lines[n++].slice(1));
    return out;
  };

  while (n < lines.length) {
    const l = lines[n];
    if (!l.trim()) { n++; continue; }
    if (l.trim() !== '=== slide') fail('expected "=== slide", found "' + l + '"');
    n++;
    const s = mkSlide(cols, rows);
    let text: string[] = [];
    let colour: string[] = [];
    let mask: string[] = [];
    const eqs: { x: number; y: number; disp: boolean; w: number; tex: string }[] = [];
    while (n < lines.length && !lines[n].startsWith('=== ')) {
      const t = lines[n];
      let m: RegExpMatchArray | null;
      if (!t.trim()) { n++; continue; }
      if ((m = t.match(/^title: (.*)$/))) { s.title = m[1]; n++; }
      else if (t === 'frame: yes') { s.frame = true; n++; }
      else if ((m = t.match(/^delay: (\d+)$/))) { s.delay = +m[1]; n++; }
      else if (t === 'notes:') { n++; s.notes = block(); }
      else if (t === '--- text') { n++; text = layer(); }
      else if (t === '--- colour') { n++; colour = layer(); }
      else if (t === '--- lines') { n++; mask = layer(); }
      else if (t === '--- equations') {
        n++;
        while (n < lines.length && (m = lines[n].match(/^(\d+) (\d+) ([ID]) (\d+) (.*)$/))) {
          eqs.push({ x: +m[1], y: +m[2], disp: m[3] === 'D', w: +m[4], tex: m[5] });
          n++;
        }
      } else if ((m = t.match(/^--- (plot|heat) (-?\d+) (-?\d+) (\d+) (\d+)$/))) {
        n++;
        s.vec.push({ t: m[1] as 'plot' | 'heat', x: +m[2], y: +m[3], w: +m[4], h: +m[5], spec: block() });
      } else if (t === '--- path') {
        n++;
        const at = n;
        try {
          const o = JSON.parse(block());
          s.vec.push({ t: 'path', pts: o.pts, smooth: !!o.smooth, arrow: !!o.arrow, dash: !!o.dash, attr: o.attr | 0 } as VecObj);
        } catch { n = at; fail('bad path JSON'); }
      } else fail('unexpected line "' + t + '"');
    }
    if (text.length > rows) fail('slide has more text rows than the size allows');
    for (let y = 0; y < rows; y++) {
      const tr = Array.from(text[y] || '');
      const cr = colour[y] || '';
      const mr = mask[y] || '';
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const mk = mr[x] && mr[x] !== '.' ? parseInt(mr[x], 16) || 0 : 0;
        const c = tr[x] ?? ' ';
        s.mk[i] = mk;
        s.ch[i] = c === ' ' || (mk && c === (GL[mk] || '┼')) ? '' : c;
        const a = cr[x] || '.';
        const bar = BAR_LETTERS.indexOf(a);
        s.at[i] = bar >= 0 ? 4 | bar : a >= '1' && a <= '3' ? +a : 0;
      }
    }
    for (const e of eqs) {
      if (e.y >= rows || e.x >= cols || e.w < 1) continue;
      for (let k = 0; k < e.w && e.x + k < cols; k++) s.ch[e.y * cols + e.x + k] = k ? EQ_C : eqEncode(e.tex, e.disp, e.w);
    }
    slides.push(s);
  }
  if (!slides.length) slides.push(mkSlide(cols, rows));
  return { v: 1, cols, rows, theme, slides };
}

/** Read either format: the text format or the JSON deck. */
export function parseDeck(text: string): Doc {
  if (isTextFormat(text)) return fromText(text);
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.slides) || !d.cols || !d.rows) throw new Error('not a deck file');
  return d;
}

