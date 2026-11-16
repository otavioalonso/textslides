/*
 * Pages and animation frames. A slide with `frame: true` continues the slide before it as the next frame of an
 * animation; the player shows each run of slides (head + frames) as one page and loops through the frames.
 */
import type { Doc } from './types';

export const DEFAULT_DELAY = 150;

export interface Page {
  /** Slide indices of the frames, the head first. */
  slides: number[];
  /** Milliseconds per frame. */
  delay: number;
}

export function pages(doc: Doc): Page[] {
  const out: Page[] = [];
  doc.slides.forEach((s, i) => {
    if (s.frame && out.length) out[out.length - 1].slides.push(i);
    else out.push({ slides: [i], delay: s.delay && s.delay > 0 ? s.delay : DEFAULT_DELAY });
  });
  return out;
}

/** The page holding slide `i`, and the frame index within it. */
export function pageOf(doc: Doc, i: number): { page: number; frame: number } {
  const ps = pages(doc);
  for (let p = 0; p < ps.length; p++) {
    const f = ps[p].slides.indexOf(i);
    if (f >= 0) return { page: p, frame: f };
  }
  return { page: 0, frame: 0 };
}

/** Label for slide `i` in lists: "3" for a page, "3.2" for its second frame. */
export function slideLabelNo(doc: Doc, i: number): string {
  const { page, frame } = pageOf(doc, i);
  const n = pages(doc)[page].slides.length;
  return n > 1 ? page + 1 + '.' + (frame + 1) : String(page + 1);
}
