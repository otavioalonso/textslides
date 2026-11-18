import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brailleRaster } from '../../src/model/braille';
import { fmtLogTick, logTicks, parsePlot } from '../../src/model/plot';
import { dataPath, linkedData, plotDataOf, readPlotData, type PlotData } from '../../src/model/plotdata';

const file = (o: object): PlotData => readPlotData({ textslides: 'plot', v: 1, ...o });

describe('readPlotData', () => {
  it('rejects other JSON', () => {
    expect(() => readPlotData({ series: [] })).toThrow(/not a textslides plot/);
    expect(() => readPlotData([1, 2])).toThrow();
  });

  it('cleans values: non-numbers become NaN or gaps, unknown kinds are dropped', () => {
    const d = file({
      title: 'T', xscale: 'log', ylim: [0, 'x'],
      series: [
        { kind: 'line', x: [1, 2, 3], y: [1, null, 'bad'], marker: 'ring', color: 1 },
        { kind: 'nonsense' },
        { kind: 'bar', x: [0, 1], height: [2, 3], width: [0.5] },
        { kind: 'hline', v: 0.5, dash: true },
      ],
    });
    expect(d.title).toBe('T');
    expect(d.xscale).toBe('log');
    expect(d.ylim).toBeUndefined();
    expect(d.series).toEqual([
      { kind: 'line', x: [1, 2, 3], y: [1, null, null], color: 1, label: undefined, dash: false, marker: 'ring', noline: false, yerr: undefined },
      { kind: 'bar', x: [0, 1], height: [2, 3], width: [0.5, 0.5], bottom: undefined, horizontal: false, color: undefined, label: undefined },
      { kind: 'hline', v: 0.5, color: undefined, dash: true },
    ]);
  });
});

describe('plots with data', () => {
  const d = file({
    title: 'from file', xlabel: 'k', ylabel: 'P(k)',
    series: [
      { kind: 'line', x: [0, 1, 2], y: [1, 3, 2], label: 'model' },
      { kind: 'scatter', x: [0.5, 1.5], y: [2, 2.5], yerr: [[0.5, 0.5], [1, 1]], label: 'data' },
    ],
  });

  it('takes labels from the file unless the spec sets them', () => {
    const P = parsePlot('data: results/p.json', d);
    expect([P.title, P.xl, P.yl]).toEqual(['from file', 'k', 'P(k)']);
    expect(parsePlot('data: results/p.json\ntitle: mine', d).title).toBe('mine');
  });

  it('turns series into lines and markers, colours by position', () => {
    const P = parsePlot('', d);
    expect(P.series.map((s) => [s.kind, s.color, s.marker, s.noline])).toEqual([['line', 0, null, false], ['scatter', 1, 'dot', true]]);
    expect(P.series[1].err).toEqual([[1.5, 3], [2, 3.5]]);
  });

  it('fits the range to every series including error bars, and the spec overrides it', () => {
    const P = parsePlot('', d);
    expect(P.xr).toEqual([0, 2]);
    expect(P.yr[0]).toBeLessThan(1);
    expect(P.yr[1]).toBeGreaterThan(3.5);
    expect(parsePlot('y: 0 10', d).yr).toEqual([0, 10]);
  });

  it('bars sit on their bottoms, images span their extent', () => {
    const b = parsePlot('', file({ series: [{ kind: 'bar', x: [1, 2], height: [4, 5], width: [0.8, 0.8] }] }));
    expect(b.xr).toEqual([0.6, 2.4]);
    expect(b.yr[0]).toBeLessThan(0);
    const im = parsePlot('', file({ series: [{ kind: 'image', z: [[1, 2], [3, 4]], extent: [0, 4, -1, 1] }] }));
    expect(im.xr).toEqual([0, 4]);
  });

  it('log axes ignore values ≤ 0 and pad by a factor', () => {
    const P = parsePlot('yscale: log', file({ series: [{ kind: 'line', x: [1, 2, 3], y: [0, 10, 1000] }] }));
    expect(P.ylog).toBe(true);
    expect(P.yr[0]).toBeGreaterThan(5);
    expect(P.yr[0]).toBeLessThan(10);
    expect(P.yr[1]).toBeGreaterThan(1000);
  });

  it('a braille plot of a scatter draws dots only, and gaps break lines', () => {
    const sc = parsePlot('style: braille\nx: 0 1\ny: 0 1', file({ series: [{ kind: 'scatter', x: [0, 1], y: [0, 1] }] }));
    expect(brailleRaster(sc, 2, 1).rows.join('').replace(/ /g, '')).toBe('⡀⠈');
    const gap = parsePlot('style: braille\nx: 0 3\ny: 0 1', file({ series: [{ kind: 'line', x: [0, 1, 2, 3], y: [0, 0, null, 0] }] }));
    const row = brailleRaster(gap, 4, 1).rows[0];
    expect(row).toContain(' ');
  });

  it('resolves linked data by the spec path, embedded data first', () => {
    expect(dataPath('x: 0 1\ndata:  out/a b.json \n')).toBe('out/a b.json');
    linkedData.set('out/a.json', d);
    expect(plotDataOf({ spec: 'data: out/a.json' })).toBe(d);
    const own = file({ series: [] });
    expect(plotDataOf({ spec: 'data: out/a.json', data: own })).toBe(own);
    expect(plotDataOf({ spec: 'data: missing.json' })).toBeNull();
    linkedData.clear();
  });
});

describe('log ticks', () => {
  it('decades, with 2 and 5 over short ranges', () => {
    expect(logTicks(1, 1e6)).toEqual([1, 10, 100, 1000, 10000, 100000, 1e6]);
    expect(logTicks(0.3, 30)).toEqual([0.5, 1, 2, 5, 10, 20]);
    expect([1e5, 2e-4, 0.01, 300].map(fmtLogTick)).toEqual(['1e5', '2e-4', '0.01', '300']);
  });
});

describe('files written by python/textslides.py (python/example.py)', () => {
  const load = (n: string) => readPlotData(JSON.parse(readFileSync(new URL('./fixtures/' + n + '.json', import.meta.url), 'utf8')));

  it('spectrum: log axes, two lines and error bars with ring markers', () => {
    const P = parsePlot('data: results/spectrum.json', load('spectrum'));
    expect([P.xlog, P.ylog, P.title, P.xl]).toEqual([true, true, 'power spectrum', 'k [h/Mpc]']);
    expect(P.series.map((s) => [s.kind, s.color, s.dash ?? false, s.marker ?? null, s.label])).toEqual([
      ['line', 0, false, null, 'model'], ['line', 1, true, null, 'no BAO'], ['line', 2, false, 'ring', 'measured'],
    ]);
    expect(P.series[2].noline).toBe(true);
    expect(P.series[2].err).toHaveLength(10);
  });

  it('residuals: scatter and a dashed dim reference line', () => {
    const P = parsePlot('', load('residuals'));
    expect(P.series.map((s) => [s.kind, s.color, s.dash ?? false])).toEqual([['hline', 3, true], ['scatter', 1, false]]);
  });

  it('histogram: bars in two colours with labels', () => {
    const P = parsePlot('', load('histogram'));
    expect(P.series.map((s) => [s.kind, s.color, s.label, s.bars!.x.length])).toEqual([['bar', 0, 'samples', 24], ['bar', 1, 'outlier bin', 1]]);
  });

  it('correlation: a diverging image with its y axis flipped like matplotlib', () => {
    const d = load('correlation');
    const im = d.series[0];
    expect(im.kind).toBe('image');
    if (im.kind !== 'image') return;
    expect([im.z.length, im.z[0].length, im.diverging, im.vmin, im.vmax, im.origin]).toEqual([24, 24, true, -1, 1, 'upper']);
    expect(parsePlot('', d).yr).toEqual([23.5, -0.5]);
  });
});
