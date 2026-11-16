import { describe, expect, it } from 'vitest';
import { bres, clearRect, drawBox, extract, inRect, pasteBuf, putText, rectOf } from '../../src/model/grid';
import { art, grid, trim } from './helpers';

describe('rectangles', () => {
  it('rectOf is inclusive and order-independent', () => {
    expect(rectOf({ x: 5, y: 1 }, { x: 2, y: 4 })).toEqual({ x: 2, y: 1, w: 4, h: 4 });
    expect(inRect({ x: 2, y: 1, w: 4, h: 4 }, 5, 4)).toBe(true);
    expect(inRect({ x: 2, y: 1, w: 4, h: 4 }, 6, 4)).toBe(false);
    expect(inRect(null, 0, 0)).toBe(false);
  });

  it('bres visits every cell between the ends', () => {
    const cells: string[] = [];
    bres(0, 0, 4, 2, (x, y) => cells.push(x + ',' + y));
    expect(cells[0]).toBe('0,0');
    expect(cells[cells.length - 1]).toBe('4,2');
    expect(cells).toHaveLength(5);
  });
});

describe('move, copy, paste', () => {
  it('moving a box carries its junctions', () => {
    const g = grid(12, 6);
    drawBox(g, { x: 0, y: 0 }, { x: 3, y: 2 }, 0);
    putText(g, 1, 1, 'hi', 0);
    const r = { x: 0, y: 0, w: 4, h: 3 };
    const b = extract(g, r);
    clearRect(g, r);
    pasteBuf(g, b, 5, 2);
    expect(trim(g)).toBe(art(`
      |
      |
      |     ┌──┐
      |     │hi│
      |     └──┘
    `));
  });

  it('pasting skips empty cells, so it overlays rather than erases', () => {
    const g = grid(8, 2);
    putText(g, 0, 0, '........', 0);
    const src = grid(8, 2);
    putText(src, 0, 0, 'a', 0);
    putText(src, 2, 0, 'b', 0); // cell 1 stays empty (typing a space also leaves a cell empty)
    pasteBuf(g, extract(src, { x: 0, y: 0, w: 3, h: 1 }), 2, 0);
    expect(trim(g)).toBe('..a.b...');
  });

  it('extract outside the grid gives empty cells, paste outside is clipped', () => {
    const g = grid(4, 2);
    putText(g, 2, 0, 'ab', 0);
    const b = extract(g, { x: 2, y: 0, w: 4, h: 1 });
    expect(b.ch).toEqual(['a', 'b', '', '']);
    pasteBuf(g, b, 3, 1);
    expect(trim(g)).toBe('  ab\n   a');
  });
});
