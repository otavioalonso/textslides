import { mkSlide } from '../../src/model/grid';
import { rowPlain } from '../../src/model/text';
import type { Grid } from '../../src/model/types';

export function grid(cols = 20, rows = 8): Grid {
  return { cols, rows, s: mkSlide(cols, rows) };
}

/** The grid as text, every row padded to full width, so tests can compare pictures. */
export function pic(g: Grid): string {
  const out: string[] = [];
  for (let y = 0; y < g.rows; y++) out.push(rowPlain(g, y));
  return out.join('\n');
}

/** Same as pic() but with trailing spaces and empty trailing rows removed, for compact expectations. */
export function trim(g: Grid): string {
  return pic(g).split('\n').map((r) => r.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}

/**
 * An expected picture written with a `|` left margin on every row, so leading spaces are kept:
 *   art(`
 *     |┌──┐
 *     |└──┘
 *   `)
 */
export function art(s: string): string {
  return s
    .split('\n')
    .filter((l) => l.includes('|'))
    .map((l) => l.slice(l.indexOf('|') + 1).replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}
