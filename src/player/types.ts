import type { Doc } from '../model/types';

/** Everything an exported presentation carries, embedded as JSON in the page. */
export interface Presentation {
  title: string;
  doc: Doc;
  /** Pre-rendered KaTeX HTML by key `eqKey(tex, disp)`, so the player needs no KaTeX code. */
  eqs: Record<string, string>;
  /** 0-based slide to open on (the URL hash `#n` wins when present). */
  start?: number;
  /** Shown inside the editor's present mode: Esc and the close button hand control back to the editor. */
  embedded?: boolean;
}

export function eqKey(tex: string, disp: boolean): string {
  return (disp ? 'D' : 'I') + tex;
}

/** postMessage types between an embedded player and the editor. */
export const MSG_EXIT = 'textslides:exit';
