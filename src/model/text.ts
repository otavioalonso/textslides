import { EQ_C, GL } from './constants';
import { eqParse } from './equations';
import { ix } from './grid-base';
import type { Grid } from './types';

/** One row as plain text. Junctions become box-drawing glyphs; equations are written back as `$…$` source. */
export function rowPlain(g: Grid, y: number): string {
  let r = '';
  for (let x = 0; x < g.cols; x++) {
    const i = ix(g, x, y);
    const c = g.s.ch[i];
    const a = eqParse(c);
    if (a) { r += a.disp ? '$$' + a.tex + '$$' : '$' + a.tex + '$'; continue; }
    if (c === EQ_C) continue;
    r += c ? c : g.s.mk[i] ? GL[g.s.mk[i]] || '┼' : ' ';
  }
  return r;
}

/** A slide as plain text, trailing spaces and trailing empty rows removed. */
export function slideText(g: Grid): string {
  const o: string[] = [];
  for (let y = 0; y < g.rows; y++) o.push(rowPlain(g, y).replace(/\s+$/, ''));
  while (o.length && !o[o.length - 1]) o.pop();
  return o.join('\n');
}
