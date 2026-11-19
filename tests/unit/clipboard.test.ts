import { describe, expect, it } from 'vitest';
import { copyObject, copyRegion, objectsIn, pasteClip } from '../../src/model/clipboard';
import { putEq } from '../../src/model/equations';
import { drawBox, putText } from '../../src/model/grid';
import { art, grid, trim } from './helpers';

describe('copy and paste between slides', () => {
  it('a region carries its cells and the objects inside it, and lands in the same place by default', () => {
    const a = grid(20, 8);
    drawBox(a, { x: 1, y: 1 }, { x: 6, y: 4 }, 0);
    putText(a, 2, 2, 'hi', 1);
    a.s.vec.push({ t: 'plot', x: 8, y: 1, w: 6, h: 4, spec: 'x: 0 1' }); // inside
    a.s.vec.push({ t: 'heat', x: 12, y: 5, w: 6, h: 2, spec: '#.' }); // sticks out: not copied
    const c = copyRegion(a, { x: 1, y: 1, w: 14, h: 5 });
    expect(c.objs).toEqual([{ t: 'plot', x: 7, y: 0, w: 6, h: 4, spec: 'x: 0 1' }]);
    const b = grid(20, 8);
    const r = pasteClip(b, c);
    expect(r.rect).toEqual({ x: 1, y: 1, w: 14, h: 5 });
    expect(trim(b)).toBe(trim(a));
    expect(b.s.vec).toEqual([{ t: 'plot', x: 8, y: 1, w: 6, h: 4, spec: 'x: 0 1' }]);
    expect(r.objs).toEqual([0]);
  });

  it('pastes at a target, kept on the slide', () => {
    const a = grid(20, 8);
    putText(a, 0, 0, 'abc', 0);
    a.s.vec.push({ t: 'plot', x: 0, y: 1, w: 3, h: 2, spec: '' });
    const c = copyRegion(a, { x: 0, y: 0, w: 3, h: 3 });
    const b = grid(20, 8);
    expect(pasteClip(b, c, 18, 7).rect).toEqual({ x: 17, y: 5, w: 3, h: 3 });
    expect(trim(b)).toBe(art(`
      |
      |
      |
      |
      |
      |                 abc
    `));
    expect(b.s.vec[0]).toMatchObject({ x: 17, y: 6 });
  });

  it('copies a single object, deep, so the copy is independent', () => {
    const a = grid();
    const o = { t: 'plot' as const, x: 4, y: 2, w: 8, h: 4, spec: 'title: t' };
    a.s.vec.push(o);
    const c = copyObject(o);
    expect([c.x, c.y, c.w, c.h, c.buf]).toEqual([4, 2, 8, 4, null]);
    const b = grid();
    pasteClip(b, c);
    pasteClip(b, c, 0, 0);
    expect(b.s.vec.map((v) => [v.t === 'plot' && v.x, v.t === 'plot' && v.y])).toEqual([[4, 2], [0, 0]]);
    (b.s.vec[0] as typeof o).spec = 'changed';
    expect(o.spec).toBe('title: t');
    expect((b.s.vec[1] as typeof o).spec).toBe('title: t');
  });

  it('curves move with their points', () => {
    const a = grid();
    a.s.vec.push({ t: 'path', pts: [[2, 2], [5.5, 3]], smooth: false, arrow: true, dash: false, attr: 2 });
    const c = copyRegion(a, { x: 1, y: 1, w: 6, h: 4 });
    const b = grid();
    pasteClip(b, c, 10, 3);
    expect(b.s.vec[0]).toMatchObject({ pts: [[11, 4], [14.5, 5]] });
    expect(objectsIn(a, { x: 1, y: 1, w: 6, h: 4 })).toEqual([0]);
  });

  it('equations come along whole', () => {
    const a = grid();
    putEq(a, 2, 1, 'x^2', false, 1, 4);
    const b = grid();
    pasteClip(b, copyRegion(a, { x: 2, y: 1, w: 4, h: 1 }), 5, 3);
    expect(b.s.ch[3 * 20 + 5]).toBe('\u0002I4:x^2');
  });
});
