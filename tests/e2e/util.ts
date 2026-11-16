import { expect, type Page } from '@playwright/test';

import type {} from '../../src/hook';

/** Open the editor and wait until the first slide is built. Collects page errors into the returned array. */
export async function openEditor(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.ED && window.ED.doc && document.querySelectorAll('#ov .eq').length > 0);
  return errors;
}

/** Start from an empty deck (the "new → empty deck" button). */
export async function emptyDeck(page: Page): Promise<void> {
  await page.click('#bNew');
  await page.click('#mbtns button:has-text("empty deck")');
  await expect.poll(() => page.evaluate(() => window.ED.doc.slides[0].ch.every((c) => c === ''))).toBe(true);
}

export async function cellXY(page: Page, x: number, y: number): Promise<[number, number]> {
  return page.evaluate(([x, y]) => {
    const r = window.ED.cv.getBoundingClientRect();
    return [r.left + (x + 0.5) * window.ED.cw, r.top + (y + 0.5) * window.ED.ch] as [number, number];
  }, [x, y]);
}

export async function clickCell(page: Page, x: number, y: number): Promise<void> {
  const [px, py] = await cellXY(page, x, y);
  await page.mouse.click(px, py);
}

export async function dragCells(page: Page, a: [number, number], b: [number, number], mods: string[] = []): Promise<void> {
  for (const m of mods) await page.keyboard.down(m);
  const [x0, y0] = await cellXY(page, ...a);
  const [x1, y1] = await cellXY(page, ...b);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x1, y1, { steps: 5 });
  await page.mouse.up();
  for (const m of mods) await page.keyboard.up(m);
}

/** The current slide as plain text, one string per row (trailing spaces kept). */
export async function rows(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const { doc, cur } = window.ED;
    const s = doc.slides[cur];
    const GL: Record<number, string> = { 1: '│', 4: '│', 5: '│', 2: '─', 8: '─', 10: '─', 3: '└', 6: '┌', 12: '┐', 9: '┘', 7: '├', 14: '┬', 13: '┤', 11: '┴', 15: '┼' };
    const out: string[] = [];
    for (let y = 0; y < doc.rows; y++) {
      let r = '';
      for (let x = 0; x < doc.cols; x++) {
        const i = y * doc.cols + x;
        const c = s.ch[i];
        r += c.charCodeAt(0) === 2 ? '$' : c === '\u0001' ? '~' : c || (s.mk[i] ? GL[s.mk[i]] || '┼' : ' ');
      }
      out.push(r);
    }
    return out;
  });
}
