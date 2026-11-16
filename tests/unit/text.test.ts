import { describe, expect, it } from 'vitest';
import { putEq } from '../../src/model/equations';
import { drawBox, putText, resizeSlide } from '../../src/model/grid';
import { slideText } from '../../src/model/text';
import { grid } from './helpers';

describe('plain text', () => {
  it('trims trailing spaces and empty rows', () => {
    const g = grid(20, 6);
    putText(g, 1, 1, 'hello', 0);
    expect(slideText(g)).toBe('\n hello');
  });

  it('writes lines as box-drawing characters and equations as their source', () => {
    const g = grid(20, 4);
    drawBox(g, { x: 0, y: 0 }, { x: 3, y: 2 }, 0);
    putEq(g, 5, 1, 'a^2', false, 0, 3);
    putEq(g, 5, 2, '\\int', true, 0, 2);
    putText(g, 8, 1, '!', 0);
    expect(slideText(g)).toBe('┌──┐\n│  │ $a^2$!\n└──┘ $$\\int$$');
  });
});

describe('resizeSlide', () => {
  it('keeps the top-left overlap and the vector objects', () => {
    const g = grid(6, 3);
    putText(g, 0, 0, 'abcdef', 0);
    putText(g, 0, 2, 'xyz', 0);
    g.s.vec.push({ t: 'plot', x: 0, y: 0, w: 4, h: 3, spec: '' });
    const s = resizeSlide(g, 4, 2);
    expect(slideText({ cols: 4, rows: 2, s })).toBe('abcd');
    expect(s.vec).toBe(g.s.vec);
    const big = resizeSlide(g, 8, 4);
    expect(slideText({ cols: 8, rows: 4, s: big })).toBe('abcdef\n\nxyz');
  });
});
