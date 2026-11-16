import type { Theme } from './types';

export const FONT = '"JetBrains Mono","DejaVu Sans Mono",Menlo,Consolas,"Liberation Mono",monospace';

export const THEMES: Record<string, Theme> = {
  modern: { bg: '#14161B', c: ['#D6D9E0', '#FFFFFF', '#E5A24A', '#8B93A5'], p: '#E5A24A', q: '#4FA3E0' },
  c64: { bg: '#352879', c: ['#C0B8F8', '#FFFFFF', '#F0E68C', '#A096EC'], p: '#F0E68C', q: '#6FD6F2' },
};

export const ATTR_NAMES = ['normal', 'bright', 'accent', 'dim'];

/** Bit 2 of an attribute: highlighted bar. */
export const REV = 4;

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
