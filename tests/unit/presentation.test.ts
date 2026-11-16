import { describe, expect, it } from 'vitest';
import { buildPresentation, deckTitle, presentationData } from '../../src/export/presentation';
import { putEq } from '../../src/model/equations';
import { mkSlide, putText } from '../../src/model/grid';
import type { Doc } from '../../src/model/types';

function deck(lines: string[][]): Doc {
  const doc: Doc = { v: 1, cols: 40, rows: 6, theme: 'modern', slides: [] };
  for (const l of lines) {
    const s = mkSlide(40, 6);
    l.forEach((t, y) => putText({ cols: 40, rows: 6, s }, 1, y, t, 0));
    doc.slides.push(s);
  }
  return doc;
}

describe('deckTitle', () => {
  it('uses the first non-empty line of the first slide, without a page counter', () => {
    expect(deckTitle(deck([['', 'MY  TALK        3/12']]))).toBe('MY TALK');
    expect(deckTitle(deck([[]]))).toBe('slides');
  });
});

describe('presentationData', () => {
  it('pre-renders every equation once', () => {
    const doc = deck([['a'], ['b']]);
    for (const s of doc.slides) putEq({ cols: 40, rows: 6, s }, 5, 2, 'x^2', false, 0, 3);
    putEq({ cols: 40, rows: 6, s: doc.slides[1] }, 5, 3, '\\int', true, 0, 2);
    const d = presentationData(doc, { start: 1 });
    expect(Object.keys(d.eqs).sort()).toEqual(['D\\int', 'Ix^2']);
    expect(d.eqs['Ix^2']).toContain('class="katex"');
    expect(d.start).toBe(1);
  });
});

describe('buildPresentation', () => {
  it('is one self-contained page', async () => {
    const html = await buildPresentation(deck([['hello']]));
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).not.toMatch(/url\(fonts\//); // KaTeX fonts are inlined
    expect(html).toContain('url(data:font/woff2;base64,');
    expect(html).not.toMatch(/<(script|link)[^>]+(src|href)=/); // nothing loaded from elsewhere
    expect(html).toContain('<title>hello</title>');
  });

  it('slide text cannot break out of the embedded script', async () => {
    const html = await buildPresentation(deck([['</script><b>x']]));
    expect(html.match(/<\/script>/g)).toHaveLength(2); // only the two real closing tags
    expect(html).toContain('<title>&lt;/script&gt;&lt;b&gt;x</title>');
  });
});
