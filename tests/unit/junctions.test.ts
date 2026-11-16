import { describe, expect, it } from 'vitest';
import { D, L, R, U } from '../../src/model/constants';
import { clearCell, drawBox, drawLine, ix, putCh, putText } from '../../src/model/grid';
import { art, grid, trim } from './helpers';

describe('box', () => {
  it('draws a closed box with corner junctions', () => {
    const g = grid();
    drawBox(g, { x: 1, y: 1 }, { x: 6, y: 4 }, 0);
    expect(trim(g)).toBe(art(`
      |
      | ┌────┐
      | │    │
      | │    │
      | └────┘
    `));
    expect(g.s.mk[ix(g, 1, 1)]).toBe(R | D);
    expect(g.s.mk[ix(g, 6, 4)]).toBe(U | L);
  });

  it('is the same whichever corner the drag starts from', () => {
    const a = grid();
    const b = grid();
    drawBox(a, { x: 1, y: 1 }, { x: 6, y: 4 }, 0);
    drawBox(b, { x: 6, y: 4 }, { x: 1, y: 1 }, 0);
    expect(b.s.mk).toEqual(a.s.mk);
  });

  it('degenerates to a line when it has no height', () => {
    const g = grid();
    drawBox(g, { x: 1, y: 2 }, { x: 5, y: 2 }, 0);
    expect(trim(g)).toBe(art(`
      |
      |
      | ─────
    `));
  });

  it('joins with an overlapping box', () => {
    const g = grid();
    drawBox(g, { x: 0, y: 0 }, { x: 6, y: 3 }, 0);
    drawBox(g, { x: 3, y: 2 }, { x: 10, y: 5 }, 0);
    expect(trim(g)).toBe(art(`
      |┌─────┐
      |│     │
      |│  ┌──┼───┐
      |└──┼──┘   │
      |   │      │
      |   └──────┘
    `));
  });

  it('shares an edge with a box drawn next to it', () => {
    const g = grid();
    drawBox(g, { x: 0, y: 0 }, { x: 4, y: 3 }, 0);
    drawBox(g, { x: 4, y: 0 }, { x: 8, y: 3 }, 0);
    expect(trim(g)).toBe(art(`
      |┌───┬───┐
      |│   │   │
      |│   │   │
      |└───┴───┘
    `));
  });
});

describe('line', () => {
  it('routes horizontal first by default', () => {
    const g = grid();
    drawLine(g, { x: 1, y: 1 }, { x: 5, y: 3 }, false, false, 0);
    expect(trim(g)).toBe(art(`
      |
      | ────┐
      |     │
      |     │
    `));
  });

  it('routes vertical first with shift', () => {
    const g = grid();
    drawLine(g, { x: 1, y: 1 }, { x: 5, y: 3 }, true, false, 0);
    expect(trim(g)).toBe(art(`
      |
      | │
      | │
      | └────
    `));
  });

  it('puts an arrow head pointing along the last leg', () => {
    const cases: [boolean, string][] = [[false, '▼'], [true, '▶']];
    for (const [vfirst, head] of cases) {
      const g = grid();
      drawLine(g, { x: 1, y: 1 }, { x: 5, y: 3 }, vfirst, true, 0);
      expect(g.s.ch[ix(g, 5, 3)]).toBe(head);
    }
    const g = grid();
    drawLine(g, { x: 8, y: 2 }, { x: 2, y: 2 }, false, true, 0);
    expect(g.s.ch[ix(g, 2, 2)]).toBe('◀');
    drawLine(g, { x: 4, y: 6 }, { x: 4, y: 0 }, false, true, 0);
    expect(g.s.ch[ix(g, 4, 0)]).toBe('▲');
  });

  it('makes no arrow head for a zero-length line', () => {
    const g = grid();
    drawLine(g, { x: 3, y: 3 }, { x: 3, y: 3 }, false, true, 0);
    expect(g.s.ch.every((c) => c === '')).toBe(true);
  });

  it('crossing a box edge makes a cross junction', () => {
    const g = grid();
    drawBox(g, { x: 2, y: 0 }, { x: 8, y: 4 }, 0);
    drawLine(g, { x: 0, y: 2 }, { x: 12, y: 2 }, false, false, 0);
    expect(trim(g)).toBe(art(`
      |  ┌─────┐
      |  │     │
      |──┼─────┼────
      |  │     │
      |  └─────┘
    `));
  });

  it('ending on a box edge makes a tee', () => {
    const g = grid();
    drawBox(g, { x: 4, y: 0 }, { x: 9, y: 4 }, 0);
    drawLine(g, { x: 0, y: 2 }, { x: 4, y: 2 }, false, false, 0);
    drawLine(g, { x: 6, y: 4 }, { x: 6, y: 6 }, false, false, 0);
    expect(trim(g)).toBe(art(`
      |    ┌────┐
      |    │    │
      |────┤    │
      |    │    │
      |    └─┬──┘
      |      │
      |      │
    `));
  });

  it('is cut at the grid edge', () => {
    const g = grid(6, 3);
    drawLine(g, { x: 2, y: 1 }, { x: 9, y: 1 }, false, false, 0);
    expect(trim(g)).toBe(art(`
      |
      |  ────
    `));
  });

  it('takes the colour it is drawn with, including where it joins', () => {
    const g = grid();
    drawBox(g, { x: 0, y: 0 }, { x: 4, y: 4 }, 0);
    drawLine(g, { x: 4, y: 2 }, { x: 8, y: 2 }, false, false, 2);
    expect(g.s.at[ix(g, 4, 2)]).toBe(2);
    expect(g.s.at[ix(g, 4, 1)]).toBe(0);
  });
});

describe('characters and lines', () => {
  it('typing over a line replaces the junction', () => {
    const g = grid();
    drawLine(g, { x: 0, y: 1 }, { x: 8, y: 1 }, false, false, 0);
    putText(g, 3, 1, 'ab', 1);
    expect(trim(g)).toBe(art(`
      |
      |───ab────
    `));
    expect(g.s.mk[ix(g, 3, 1)]).toBe(0);
  });

  it('clearing a cell also cuts the stubs that pointed into it', () => {
    const g = grid();
    drawBox(g, { x: 0, y: 0 }, { x: 4, y: 2 }, 0);
    clearCell(g, 2, 0);
    expect(g.s.mk[ix(g, 1, 0)]).toBe(L);
    expect(g.s.mk[ix(g, 3, 0)]).toBe(R);
    expect(trim(g)).toBe(art(`
      |┌─ ─┐
      |│   │
      |└───┘
    `));
  });

  it('a line drawn through text keeps the text characters but joins around them', () => {
    const g = grid();
    putCh(g, 3, 1, 'x', 0);
    drawLine(g, { x: 0, y: 1 }, { x: 6, y: 1 }, false, false, 0);
    // The cell keeps its character; the mask is set too and shows once the character is erased.
    expect(g.s.ch[ix(g, 3, 1)]).toBe('x');
    expect(g.s.mk[ix(g, 3, 1)]).toBe(L | R);
  });
});
