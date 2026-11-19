import { describe, expect, it } from 'vitest';
import { ATTR_NAMES, atColour, colourOf, THEMES, withColour } from '../../src/model/constants';

describe('colour slots', () => {
  it('eight slots, every theme defines all of them', () => {
    expect(ATTR_NAMES).toEqual(['normal', 'bright', 'accent', 'dim', 'blue', 'red', 'green', 'yellow']);
    for (const t of Object.values(THEMES)) {
      expect(t.c).toHaveLength(8);
      for (const c of t.c) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('slots 0–3 keep their old attribute values, the bar is still bit 2', () => {
    expect([0, 1, 2, 3].map(atColour)).toEqual([0, 1, 2, 3]);
    expect([4, 5, 6, 7].map(atColour)).toEqual([8, 9, 10, 11]);
    for (let c = 0; c < 8; c++) {
      expect(colourOf(atColour(c))).toBe(c);
      expect(colourOf(atColour(c) | 4)).toBe(c);
    }
    expect(withColour(4 | 1, 6)).toBe(4 | 10); // keeps the bar
    expect(withColour(9, 2)).toBe(2);
  });

  it('the high-contrast slots stand out from the background (WCAG ratio ≥ 6)', () => {
    const lum = (h: string) => {
      const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const [r, g, b] = [1, 3, 5].map((i) => f(parseInt(h.slice(i, i + 2), 16) / 255));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    for (const [name, t] of Object.entries(THEMES))
      for (let c = 4; c < 8; c++) expect(ratio(t.c[c], t.bg), name + ' ' + ATTR_NAMES[c]).toBeGreaterThanOrEqual(6);
  });
});
