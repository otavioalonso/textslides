import katex from 'katex';
import { ed } from '../state';

const htmlCache: Record<string, string> = {};

export function katexHtml(tex: string, disp: boolean): string {
  const k = (disp ? 'D' : 'I') + tex;
  if (htmlCache[k]) return htmlCache[k];
  let h: string;
  try {
    h = katex.renderToString((disp ? '\\displaystyle ' : '') + tex, { throwOnError: false, output: 'html', strict: false });
  } catch {
    h = '<span style="color:#ff6b6b">' + tex.replace(/</g, '&lt;') + '</span>';
  }
  return (htmlCache[k] = h);
}

let wCache: Record<string, number> = {};

/** Forget measured widths (cell size changed). */
export function resetEqWidths(): void {
  wCache = {};
}

/** Rendered width of an equation in cells at the current cell size (at least 2). */
export function eqCells(tex: string, disp: boolean): number {
  const k = tex + (disp ? 'D' : 'I') + ed.fsC;
  if (wCache[k] !== undefined) return wCache[k];
  const meas = document.getElementById('meas')!;
  meas.style.fontSize = ed.fsC + 'px';
  meas.innerHTML = '<div class="eq" style="position:static">' + katexHtml(tex, disp) + '</div>';
  const w = (meas.firstChild!.firstChild as HTMLElement).getBoundingClientRect().width;
  return (wCache[k] = Math.max(2, Math.ceil(w / ed.cwC + 0.35)));
}
