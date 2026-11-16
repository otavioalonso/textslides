/* DOM elements the editor uses. Module scripts run after the document is parsed, so these exist. */
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
}

export const cv = $<HTMLCanvasElement>('cv');
export const ctx = cv.getContext('2d')!;
export const ov = $('ov');
export const eqbar = $('eqbar');
export const eqin = $<HTMLInputElement>('eqin');
export const eqprev = $('eqprev');
export const eqtag = $('eqtag');
export { $ };
