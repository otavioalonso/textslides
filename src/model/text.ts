import { EQ_C, GL } from './constants';
import { eqParse } from './equations';
import { ix } from './grid-base';
import { brailleRaster } from './braille';
import { heatText } from './heat';
import { parseOf } from './plot';
import type { Grid } from './types';

/**
 * Characters that vector objects contribute to plain text, by cell index: heat maps as half blocks
 * (braille plots add theirs too). They only fill cells that are empty in the grid.
 */
export function vecText(g: Grid): Map<number, string> {
  const out = new Map<number, string>();
  for (const o of g.s.vec) {
    let lines: string[];
    if (o.t === 'heat') lines = heatText(o);
    else if (o.t === 'plot' && parseOf(o).style === 'braille') lines = brailleRaster(parseOf(o), o.w, o.h).rows;
    else continue;
    lines.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        const x = o.x + c;
        const y = o.y + r;
        if (line[c] !== ' ' && x >= 0 && y >= 0 && x < g.cols && y < g.rows) out.set(y * g.cols + x, line[c]);
      }
    });
  }
  return out;
}

/** One row as plain text. Junctions become box-drawing glyphs; equations are written back as `$…$` source. */
export function rowPlain(g: Grid, y: number, extra?: Map<number, string>): string {
  let r = '';
  for (let x = 0; x < g.cols; x++) {
    const i = ix(g, x, y);
    const c = g.s.ch[i];
    const a = eqParse(c);
    if (a) { r += a.disp ? '$$' + a.tex + '$$' : '$' + a.tex + '$'; continue; }
    if (c === EQ_C) continue;
    r += c ? c : g.s.mk[i] ? GL[g.s.mk[i]] || '┼' : extra?.get(i) ?? ' ';
  }
  return r;
}

/** A slide as plain text, trailing spaces and trailing empty rows removed. */
export function slideText(g: Grid): string {
  const o: string[] = [];
  const extra = vecText(g);
  for (let y = 0; y < g.rows; y++) o.push(rowPlain(g, y, extra).replace(/\s+$/, ''));
  while (o.length && !o[o.length - 1]) o.pop();
  return o.join('\n');
}
