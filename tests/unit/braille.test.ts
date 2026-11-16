import { describe, expect, it } from 'vitest';
import { brailleRaster, isBraille } from '../../src/model/braille';
import { mkSlide } from '../../src/model/grid';
import { parsePlot } from '../../src/model/plot';
import { slideText } from '../../src/model/text';

describe('brailleRaster', () => {
  it('draws a rising line from the bottom-left dot to the top-right dot', () => {
    const P = parsePlot('style: braille\nx: 0 1\ny: 0 1\n0 0\n1 1');
    const { rows } = brailleRaster(P, 2, 1); // 4 × 4 dots
    // Dots (0,3) (1,2) (2,1) (3,0): cell 0 has dots col0 row3 (0x40) and col1 row2 (0x20).
    expect(rows).toEqual([String.fromCharCode(0x2800 + 0x40 + 0x20) + String.fromCharCode(0x2800 + 0x02 + 0x08)]);
  });

  it('puts the title in the first row and plots below it', () => {
    const P = parsePlot('style: braille\ntitle: sine wave long title\nx: 0 6.3\n= sin(x)');
    const { rows, series } = brailleRaster(P, 10, 4);
    expect(rows[0]).toBe('sine wave ');
    expect(rows.slice(1).join('').replace(/ /g, '').length).toBeGreaterThan(10);
    expect([...rows.slice(1).join('')].every((c) => c === ' ' || isBraille(c))).toBe(true);
    expect(series[2].some((s) => s === 0)).toBe(true);
  });

  it('clips points outside the y range', () => {
    const P = parsePlot('style: braille\nx: 0 1\ny: 0 1\n0 5\n1 5');
    expect(brailleRaster(P, 3, 2).rows.join('').trim()).toBe('');
  });

  it('shows in plain text, under any characters', () => {
    const s = mkSlide(6, 2);
    s.vec.push({ t: 'plot', x: 0, y: 0, w: 2, h: 1, spec: 'style: braille\nx: 0 1\ny: 0 1\n0 0\n1 1' });
    expect(slideText({ cols: 6, rows: 2, s })).toBe('⡠⠊');
  });
});
