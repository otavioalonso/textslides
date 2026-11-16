import { describe, expect, it } from 'vitest';
import { fmtTick, mkRng, niceTicks, parsePlot } from '../../src/model/plot';

describe('parsePlot', () => {
  it('reads ranges, labels and function series', () => {
    const p = parsePlot('x: 0 10\ny: -1 1\ntitle: T\nxlabel: k\nylabel: P\n= sin(x)');
    expect(p.xr).toEqual([0, 10]);
    expect(p.yr).toEqual([-1, 1]);
    expect([p.title, p.xl, p.yl]).toEqual(['T', 'k', 'P']);
    expect(p.series).toHaveLength(1);
    expect(p.series[0].pts).toHaveLength(301);
    expect(p.series[0].pts![150][1]).toBeCloseTo(Math.sin(5));
    expect(p.err).toBe('');
  });

  it('reads data rows; a blank line starts a new series; x range comes from the data', () => {
    const p = parsePlot('1 2\n2 4\n\n3,1\n5;0');
    expect(p.series.map((s) => s.pts)).toEqual([[[1, 2], [2, 4]], [[3, 1], [5, 0]]]);
    expect(p.xr).toEqual([1, 5]);
    expect(p.yr[0]).toBeLessThan(0);
    expect(p.yr[1]).toBeGreaterThan(4);
  });

  it('noise is seeded, so a plot looks the same every time', () => {
    const a = parsePlot('x: 0 1\n= gauss()\n= rnd()');
    const b = parsePlot('x: 0 1\n= gauss()\n= rnd() ');
    expect(b.series[0].pts).toEqual(a.series[0].pts);
    expect(b.series[1].pts).toEqual(a.series[1].pts);
  });

  it('reports expression errors without throwing', () => {
    expect(parsePlot('= sin(').err).not.toBe('');
    expect(parsePlot('= nope(x)').err).toMatch(/nope/);
  });

  it('gives a sane default range for an empty spec', () => {
    const p = parsePlot('');
    expect(p.xr).toEqual([0, 10]);
    expect(p.yr[0]).toBeLessThan(p.yr[1]);
  });
});

describe('ticks', () => {
  it('picks round steps', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(-1.6, 1.6, 4)).toEqual([-1, 0, 1]);
    expect(niceTicks(-1.6, 1.6, 8)).toEqual([-1.5, -1, -0.5, 0, 0.5, 1, 1.5]);
    expect(niceTicks(3, 3, 4)).toEqual([3]);
  });

  it('formats without float noise', () => {
    expect(fmtTick(0.1 + 0.2)).toBe('0.3');
  });

  it('mkRng is deterministic per seed', () => {
    const a = mkRng(7);
    const b = mkRng(7);
    expect([a.rnd(), a.rnd()]).toEqual([b.rnd(), b.rnd()]);
  });
});
