import type { Grid, Slide } from './types';

export function mkSlide(cols: number, rows: number): Slide {
  const n = cols * rows;
  return { ch: new Array(n).fill(''), mk: new Array(n).fill(0), at: new Array(n).fill(0), vec: [] };
}

export function ix(g: Grid, x: number, y: number): number {
  return y * g.cols + x;
}

export function inb(g: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < g.cols && y < g.rows;
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
