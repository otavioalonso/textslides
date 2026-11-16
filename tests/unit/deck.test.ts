import { describe, expect, it } from 'vitest';
import { DEFAULT_DELAY, pageOf, pages, slideLabelNo } from '../../src/model/deck';
import { mkSlide } from '../../src/model/grid';
import type { Doc, Slide } from '../../src/model/types';

function doc(flags: Partial<Slide>[]): Doc {
  return { v: 1, cols: 4, rows: 2, theme: 'modern', slides: flags.map((f) => ({ ...mkSlide(4, 2), ...f })) };
}

describe('pages', () => {
  it('groups frames with the slide before them', () => {
    const d = doc([{}, { delay: 80 }, { frame: true }, { frame: true }, {}]);
    expect(pages(d)).toEqual([
      { slides: [0], delay: DEFAULT_DELAY },
      { slides: [1, 2, 3], delay: 80 },
      { slides: [4], delay: DEFAULT_DELAY },
    ]);
    expect(pageOf(d, 3)).toEqual({ page: 1, frame: 2 });
    expect(['0', '1', '2', '3', '4'].map((_, i) => slideLabelNo(d, i))).toEqual(['1', '2.1', '2.2', '2.3', '3']);
  });

  it('a frame flag on the first slide is ignored', () => {
    expect(pages(doc([{ frame: true }, { frame: true }]))).toEqual([{ slides: [0, 1], delay: DEFAULT_DELAY }]);
  });
});
