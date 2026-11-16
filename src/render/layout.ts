import { $, ctx, cv, ov } from '../dom';
import { FONT } from '../model/constants';
import { ed, mark } from '../state';
import { resetEqWidths } from './katex';

/**
 * Pick the cell size from the stage size. Cells are integer device pixels wide, 2.2× as tall,
 * and the font size is chosen so one advance is exactly one cell.
 */
export function layout(): void {
  const stage = $('stage');
  const dpr = (ed.dpr = window.devicePixelRatio || 1);
  const availW = Math.max(200, stage.clientWidth - 26);
  const availH = Math.max(160, stage.clientHeight - 26);
  ctx.font = '100px ' + FONT;
  ed.ratio = ctx.measureText('M').width / 100 || 0.6;
  let cw = Math.floor(Math.min((availW * dpr) / ed.doc.cols, (availH * dpr) / (ed.doc.rows * 2.2)));
  cw = Math.max(4, Math.min(cw, Math.round(26 * dpr)));
  ed.cwD = cw;
  ed.chD = Math.round(cw * 2.2);
  ed.fsD = ed.cwD / ed.ratio;
  ed.cwC = ed.cwD / dpr;
  ed.chC = ed.chD / dpr;
  ed.fsC = ed.fsD / dpr;
  cv.width = ed.doc.cols * ed.cwD;
  cv.height = ed.doc.rows * ed.chD;
  cv.style.width = cv.width / dpr + 'px';
  cv.style.height = cv.height / dpr + 'px';
  ov.style.width = cv.style.width;
  ov.style.height = cv.style.height;
  ov.style.fontSize = ed.fsC + 'px';
  resetEqWidths();
  ed.eqSig = '';
  mark();
}
