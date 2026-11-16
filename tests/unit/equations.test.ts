import { describe, expect, it } from 'vitest';
import { EQ_C } from '../../src/model/constants';
import { eqAt, eqEncode, eqList, eqParse, expandToEquations, putEq } from '../../src/model/equations';
import { clearCell, clearRect, drawLine, extract, ix, pasteBuf, putCh, putText } from '../../src/model/grid';
import { grid, trim } from './helpers';

describe('equation encoding', () => {
  it('round-trips through the anchor cell', () => {
    expect(eqParse(eqEncode('\\frac{a}{b}', false, 5))).toEqual({ disp: false, w: 5, tex: '\\frac{a}{b}' });
    expect(eqParse(eqEncode('x\ny', true, 12))).toEqual({ disp: true, w: 12, tex: 'x\ny' });
  });

  it('ignores ordinary cells', () => {
    expect(eqParse('a')).toBeNull();
    expect(eqParse('')).toBeNull();
    expect(eqParse(EQ_C)).toBeNull();
  });
});

describe('equation groups', () => {
  it('reserves exactly its width: anchor plus continuations', () => {
    const g = grid();
    expect(putEq(g, 2, 1, 'x^2', false, 1, 4)).toBe(4);
    expect(eqParse(g.s.ch[ix(g, 2, 1)])).toEqual({ disp: false, w: 4, tex: 'x^2' });
    expect([3, 4, 5].map((x) => g.s.ch[ix(g, x, 1)])).toEqual([EQ_C, EQ_C, EQ_C]);
    expect(g.s.ch[ix(g, 6, 1)]).toBe('');
    expect([2, 3, 4, 5].map((x) => g.s.at[ix(g, x, 1)])).toEqual([1, 1, 1, 1]);
  });

  it('is found from any of its cells', () => {
    const g = grid();
    putEq(g, 2, 1, 'x^2', false, 3, 4);
    for (const x of [2, 3, 4, 5]) expect(eqAt(g, x, 1)).toMatchObject({ x: 2, y: 1, w: 4, tex: 'x^2', at: 3 });
    expect(eqAt(g, 1, 1)).toBeNull();
    expect(eqAt(g, 6, 1)).toBeNull();
    expect(eqAt(g, -1, 1)).toBeNull();
  });

  it('is cut at the right edge of the grid', () => {
    const g = grid(10, 2);
    expect(putEq(g, 7, 0, 'long', false, 0, 6)).toBe(3);
    expect(eqAt(g, 9, 0)).toMatchObject({ x: 7, w: 3 });
    expect(putEq(g, 10, 0, 'off', false, 0, 2)).toBe(0);
  });

  it('typing over any cell removes the whole group', () => {
    const g = grid();
    putEq(g, 2, 1, 'x^2', false, 0, 4);
    putCh(g, 4, 1, 'Z', 0);
    expect(eqList(g)).toEqual([]);
    expect(trim(g)).toBe('\n    Z');
  });

  it('clearing any cell removes the whole group', () => {
    const g = grid();
    putEq(g, 2, 1, 'x^2', false, 0, 4);
    clearCell(g, 5, 1);
    expect(g.s.ch.every((c) => c === '')).toBe(true);
  });

  it('a new equation over an old one replaces it, leaving no stray continuations', () => {
    const g = grid();
    putEq(g, 2, 1, 'old', false, 0, 6);
    putEq(g, 5, 1, 'new', false, 0, 3);
    expect(eqList(g).map((e) => [e.x, e.tex])).toEqual([[5, 'new']]);
    expect(g.s.ch.filter((c) => c === EQ_C)).toHaveLength(2);
  });

  it('text right after an equation leaves it alone', () => {
    const g = grid();
    const w = putEq(g, 2, 1, 'x', false, 0, 3);
    putText(g, 2 + w, 1, 'ok', 0);
    expect(eqAt(g, 2, 1)).toMatchObject({ w: 3 });
    expect(trim(g)).toBe('\n  $x$ok');
  });

  it('moves intact when the whole group is selected', () => {
    const g = grid();
    putEq(g, 2, 1, 'x^2', false, 2, 4);
    const r = { x: 2, y: 1, w: 4, h: 1 };
    const buf = extract(g, r);
    clearRect(g, r);
    pasteBuf(g, buf, 6, 3);
    expect(eqList(g)).toEqual([expect.objectContaining({ x: 6, y: 3, w: 4, tex: 'x^2', at: 2 })]);
    expect(g.s.ch.filter((c) => c === EQ_C)).toHaveLength(3);
  });

  it('pasting over an equation removes it instead of leaving a broken group', () => {
    const g = grid();
    putEq(g, 2, 1, 'a', false, 0, 3);
    const src = grid();
    putEq(src, 0, 0, 'b', false, 0, 4);
    pasteBuf(g, extract(src, { x: 0, y: 0, w: 4, h: 1 }), 3, 1);
    expect(eqList(g).map((e) => [e.x, e.tex, e.w])).toEqual([[3, 'b', 4]]);
    expect(g.s.ch.filter((c) => c === EQ_C)).toHaveLength(3);
  });

  it('an arrow head landing on an equation removes it', () => {
    const g = grid();
    putEq(g, 2, 1, 'x', false, 0, 4);
    drawLine(g, { x: 4, y: 4 }, { x: 4, y: 1 }, false, true, 0);
    expect(eqList(g)).toEqual([]);
    expect(g.s.ch.filter((c) => c === EQ_C)).toHaveLength(0);
    expect(g.s.ch[ix(g, 4, 1)]).toBe('▲');
  });

  it('a selection that cuts an equation grows to cover the whole group', () => {
    const g = grid();
    putEq(g, 4, 1, 'x^2', false, 0, 4); // cells 4..7 on row 1
    putEq(g, 9, 2, 'y', false, 0, 3); // cells 9..11 on row 2
    expect(expandToEquations(g, { x: 6, y: 0, w: 2, h: 2 })).toEqual({ x: 4, y: 0, w: 4, h: 2 });
    // Growing to the right reaches the second equation, which grows it further.
    expect(expandToEquations(g, { x: 5, y: 1, w: 5, h: 2 })).toEqual({ x: 4, y: 1, w: 8, h: 2 });
    expect(expandToEquations(g, { x: 0, y: 3, w: 5, h: 2 })).toEqual({ x: 0, y: 3, w: 5, h: 2 });
  });
});
