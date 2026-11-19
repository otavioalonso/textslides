import type { Theme } from './types';

export const FONT = '"JetBrains Mono","DejaVu Sans Mono",Menlo,Consolas,"Liberation Mono",monospace';

export const THEMES: Record<string, Theme> = {
  // c: normal, bright, accent, dim, then the high-contrast blue, red, green, yellow (all ≥ 6:1 on the background).
  modern: { bg: '#14161B', c: ['#D6D9E0', '#FFFFFF', '#E5A24A', '#8B93A5', '#5CB3F5', '#FF6E6E', '#5EE08A', '#FFE45C'], p: '#E5A24A', q: '#4FA3E0' },
  c64: { bg: '#352879', c: ['#C0B8F8', '#FFFFFF', '#F0E68C', '#A096EC', '#7FE3FF', '#FF9C94', '#A3F0A4', '#FFF35C'], p: '#F0E68C', q: '#6FD6F2' },
  /** Green phosphor terminal (the reference player's `vt`). */
  vt: { bg: '#07140B', c: ['#3DDC6B', '#C9FFD6', '#FFB347', '#2E9E50', '#6FD6F2', '#FF6B5B', '#A6FF3D', '#FFE45C'], p: '#FFB347', q: '#6FD6F2' },
};

export const ATTR_NAMES = ['normal', 'bright', 'accent', 'dim', 'blue', 'red', 'green', 'yellow'];

/** Bit 2 of an attribute: highlighted bar. */
export const REV = 4;

/*
 * A cell attribute holds a colour slot 0–7 and the bar flag: slot bits 0–1 in bits 0–1, slot bit 2 in bit 3
 * (bit 2 was already the bar when there were only four slots, so old decks read unchanged).
 */
export function colourOf(at: number): number {
  return (at & 3) | ((at & 8) >> 1);
}

/** The attribute bits for colour slot `c` (no bar). */
export function atColour(c: number): number {
  return (c & 3) | ((c & 4) << 1);
}

/** `at` with its colour replaced by slot `c`, keeping the bar. */
export function withColour(at: number, c: number): number {
  return (at & REV) | atColour(c);
}

/** Line-junction mask bits. */
export const U = 1;
export const R = 2;
export const D = 4;
export const L = 8;

/** Junction mask → box-drawing glyph, used for plain-text export. */
export const GL: Record<number, string> = {
  1: '│', 4: '│', 5: '│', 2: '─', 8: '─', 10: '─',
  3: '└', 6: '┌', 12: '┐', 9: '┘', 7: '├', 14: '┬', 13: '┤', 11: '┴', 15: '┼',
};

export const ARROWS: Record<string, 1> = { '▶': 1, '◀': 1, '▲': 1, '▼': 1 };

/** localStorage key for the autosaved deck. */
export const STORE = 'textmode-slide-editor-v2';

/** First character of an equation anchor cell. */
export const EQ_A = '\u0002';
/** Continuation cell of an equation group. */
export const EQ_C = '\u0001';

export const UNDO_LIMIT = 120;
