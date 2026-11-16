import { describe, expect, it } from 'vitest';
import { heatText, parseHeat } from '../../src/model/heat';
import { mkSlide, putText } from '../../src/model/grid';
import { slideText } from '../../src/model/text';
import type { HeatObj } from '../../src/model/types';

describe('parseHeat', () => {
  it('reads pattern rows and tiles them', () => {
    const { px } = parseHeat('#.\n.#', 5, 3);
    expect(px).toEqual([
      [-1, 1, -1, 1, -1],
      [1, -1, 1, -1, 1],
      [-1, 1, -1, 1, -1],
    ]);
  });

  it('reads number rows, clamped to [-1, 1]; other characters are empty pixels', () => {
    expect(parseHeat('0.5 -2 1', 3, 1).px).toEqual([[0.5, -1, 1]]);
    expect(parseHeat('# #', 3, 1).px).toEqual([[-1, null, -1]]);
  });

  it('evaluates an expression per pixel', () => {
    const { px, err } = parseHeat('= u - v', 3, 3);
    expect(err).toBe('');
    expect(px[0]).toEqual([0, 0.5, 1]);
    expect(px[2]).toEqual([-1, -0.5, 0]);
  });

  it('skips comments and reports errors', () => {
    expect(parseHeat('// a comment\n#', 2, 1).px).toEqual([[-1, -1]]);
    expect(parseHeat('= oops(', 2, 2).err).not.toBe('');
    expect(parseHeat('', 2, 2).px).toEqual([]);
  });
});

describe('heat in plain text', () => {
  const o: HeatObj = { t: 'heat', x: 1, y: 0, w: 4, h: 1, spec: '#.#.\n#..#' };

  it('pairs pixel rows into half blocks; negative pixels are the blocks', () => {
    expect(heatText(o)).toEqual(['█ ▀▄']);
  });

  it('a map without negative values shows its strong pixels', () => {
    expect(heatText({ ...o, spec: '1 0.2\n0.6 0' })).toEqual(['█ █ ']);
  });

  it('fills empty cells of the slide text, never over characters', () => {
    const s = mkSlide(8, 2);
    s.vec.push(o);
    putText({ cols: 8, rows: 2, s }, 3, 0, 'Z', 0);
    expect(slideText({ cols: 8, rows: 2, s })).toBe(' █ Z▄');
  });
});
