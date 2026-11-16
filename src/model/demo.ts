import { putEq } from './equations';
import { drawBox, drawLine, ix, putText } from './grid';
import type { Grid } from './types';

/** Measures an equation's rendered width in cells. */
export type EqMeasure = (tex: string, disp: boolean) => number;

/** The demo slide shown on first start and by "new → replace with demo". */
export function buildDemo(g: Grid, measure: EqMeasure): void {
  const s = g.s;
  const eq = (x: number, y: number, tex: string, at: number) => putEq(g, x, y, tex, false, at, measure(tex, false));
  for (let bx = 0; bx < g.cols; bx++) s.at[ix(g, bx, 0)] = 4;
  putText(g, 2, 0, 'TEXT-MODE SLIDE EDITOR', 4);
  putText(g, g.cols - 8, 0, '1/1', 4);
  putText(g, 2, 1, 'TEXT-MODE SLIDES: boxes, text, vector plots,', 1);
  eq(47, 1, '\\sum_k\\sigma_k^2', 1);
  drawBox(g, { x: 2, y: 3 }, { x: 17, y: 7 }, 0);
  putText(g, 5, 5, 'catalog', 0);
  drawLine(g, { x: 17, y: 5 }, { x: 28, y: 5 }, false, true, 2);
  putText(g, 19, 4, 'thin', 3);
  drawBox(g, { x: 28, y: 3 }, { x: 43, y: 7 }, 0);
  putText(g, 30, 5, 'estimator', 0);
  drawLine(g, { x: 35, y: 7 }, { x: 35, y: 11 }, true, true, 2);
  eq(2, 9, 'w_i\\to 1/(1-p)', 2);
  putText(g, 2, 12, 'so', 3);
  const we = eq(5, 12, 'P_\\ell=\\frac{2\\ell+1}{2}\\int P L_\\ell\\,d\\mu', 1);
  putText(g, 5 + we, 12, 'and text follows', 3);
  putText(g, 2, 14, 'Press ', 0);
  putText(g, 8, 14, 'T', 1);
  putText(g, 10, 14, 'and click to type. Press', 0);
  putText(g, 2, 15, '$ for an equation: it takes only its', 0);
  putText(g, 2, 16, 'rendered width.', 0);
  putText(g, 2, 18, '░▒▓█', 2);
  putText(g, 8, 18, 'shades with the draw tool', 3);
  putText(g, 2, 20, 'The plot is a vector object, anchored', 3);
  putText(g, 2, 21, 'to the grid.', 3);
  s.vec.push({
    t: 'plot', x: 47, y: 3, w: 31, h: 13,
    spec: 'x: 0 10\ny: -1.6 1.6\ntitle: wiggly spectra\nxlabel: k\n= sin(1.3*x)+0.35*gauss()\n= 0.55*cos(3*x)-0.4+0.12*gauss()',
  });
}
