import { describe, expect, it } from 'vitest';
import { GL } from '../../src/model/constants';
import { buildDemo } from '../../src/model/demo';
import { putEq } from '../../src/model/equations';
import { drawBox, drawLine, mkSlide, putText } from '../../src/model/grid';
import { mkRng } from '../../src/model/plot';
import { readPlotData } from '../../src/model/plotdata';
import { fromText, parseDeck, toText } from '../../src/model/textformat';
import type { Doc } from '../../src/model/types';

/** The two documented lossy cases: a literal space and a glyph equal to its own junction read back as empty. */
function normalise(d: Doc): Doc {
  const c = JSON.parse(JSON.stringify(d)) as Doc;
  for (const s of c.slides) s.ch = s.ch.map((ch, i) => (ch === ' ' || (s.mk[i] && ch === (GL[s.mk[i]] || '┼')) ? '' : ch));
  return c;
}

function demoDoc(): Doc {
  const d: Doc = { v: 1, cols: 80, rows: 24, theme: 'modern', slides: [mkSlide(80, 24)] };
  buildDemo({ cols: 80, rows: 24, s: d.slides[0] }, (tex) => Math.max(2, Math.ceil(tex.length * 0.6)));
  return d;
}

describe('text format', () => {
  it('round-trips the demo deck', () => {
    const d = demoDoc();
    expect(fromText(toText(d))).toEqual(normalise(d));
  });

  it('reads like the slide', () => {
    const t = toText(demoDoc());
    expect(t).toMatch(/^textslides 1\nsize 80x24\ntheme modern\n\n=== slide\n--- text\n/);
    expect(t).toContain('\n|  ┌──────────────┐          ┌──────────────┐\n');
    expect(t).toContain('\n|  │  catalog     ├──────────▶ estimator    │\n');
    expect(t).toContain('\n--- equations\n47 1 I ');
    expect(t).toContain('\n--- plot 47 3 31 13\n  x: 0 10\n  y: -1.6 1.6\n');
  });

  it('keeps titles, notes, frames, delays, heat maps and paths', () => {
    const d: Doc = { v: 1, cols: 10, rows: 3, theme: 'c64', slides: [mkSlide(10, 3), mkSlide(10, 3)] };
    Object.assign(d.slides[0], { title: 'Intro: part 1', notes: 'line one\n\n  indented line', delay: 60 });
    d.slides[1].frame = true;
    d.slides[1].vec.push({ t: 'heat', x: 1, y: 0, w: 4, h: 2, spec: '#.\n\n.#' });
    d.slides[1].vec.push({ t: 'path', pts: [[1, 1], [2.5, 0.5]], smooth: true, arrow: false, dash: true, attr: 2 });
    d.slides[1].vec.push({ t: 'plot', x: 0, y: 0, w: 6, h: 3, spec: '' });
    expect(fromText(toText(d))).toEqual(d);
  });

  it('keeps a plot\'s imported data on one line after its spec', () => {
    const d: Doc = { v: 1, cols: 10, rows: 3, theme: 'modern', slides: [mkSlide(10, 3)] };
    const data = readPlotData({ textslides: 'plot', v: 1, title: 'T', series: [{ kind: 'line', x: [1, 2], y: [3, null] }] });
    d.slides[0].vec.push({ t: 'plot', x: 0, y: 0, w: 8, h: 3, spec: 'yscale: log', data });
    d.slides[0].vec.push({ t: 'plot', x: 0, y: 0, w: 8, h: 3, spec: 'data: results/a.json' });
    const t = toText(d);
    expect(t).toContain('\n--- plot 0 0 8 3\n  yscale: log\n  @data {"textslides":"plot"');
    expect(fromText(t)).toEqual(JSON.parse(JSON.stringify(d)));
  });

  it('survives random slides', () => {
    const r = mkRng(3);
    const pick = <T>(a: T[]) => a[Math.floor(r.rnd() * a.length)];
    for (let round = 0; round < 40; round++) {
      const cols = 5 + Math.floor(r.rnd() * 30);
      const rows = 3 + Math.floor(r.rnd() * 10);
      const d: Doc = { v: 1, cols, rows, theme: 'modern', slides: [] };
      for (let k = 0; k < 3; k++) {
        const s = mkSlide(cols, rows);
        const g = { cols, rows, s };
        for (let n = 0; n < 12; n++) {
          const x = Math.floor(r.rnd() * cols);
          const y = Math.floor(r.rnd() * rows);
          const at = Math.floor(r.rnd() * 8);
          const op = Math.floor(r.rnd() * 5);
          if (op === 0) putText(g, x, y, pick(['hi', '|x|', '---', '=== ', '$a$', '█▀ ', '⠿⡀', '👍', '─┼']), at);
          else if (op === 1) drawBox(g, { x, y }, { x: Math.floor(r.rnd() * cols), y: Math.floor(r.rnd() * rows) }, at & 3);
          else if (op === 2) drawLine(g, { x, y }, { x: Math.floor(r.rnd() * cols), y: Math.floor(r.rnd() * rows) }, r.rnd() < 0.5, r.rnd() < 0.5, at & 3);
          else if (op === 3) putEq(g, x, y, pick(['x^2', '\\frac{a}{b}', 'a b  c', '\\$']), r.rnd() < 0.3, at, 1 + Math.floor(r.rnd() * 5));
          else s.at[y * cols + x] = at;
        }
        d.slides.push(s);
      }
      expect(fromText(toText(d))).toEqual(normalise(d));
    }
  });

  it('parseDeck reads both formats and reports errors with a line number', () => {
    const d = demoDoc();
    expect(parseDeck(JSON.stringify(d))).toEqual(d);
    expect(parseDeck(toText(d))).toEqual(normalise(d));
    expect(() => fromText('textslides 1\nsize 4x2\n\n=== slide\nwhat is this')).toThrow(/line 5: unexpected line/);
    expect(() => parseDeck('{"nope": 1}')).toThrow(/not a deck/);
  });
});
