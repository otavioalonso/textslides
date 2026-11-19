import { expect, test } from '@playwright/test';
import { cellXY, dragCells, openEditor, rows } from './util';

type Box = { t: string; x: number; y: number; w: number; h: number; spec?: string };
const vec = (page: import('@playwright/test').Page, k: number) => page.evaluate((k) => window.ED.doc.slides[k].vec as unknown as Box[], k);

test('a selected plot copies to another slide, in the same place', async ({ page }) => {
  await openEditor(page);
  const [x, y] = await cellXY(page, 60, 8); // inside the demo plot
  await page.mouse.click(x, y);
  await expect(page.locator('#spec')).toBeVisible();
  await page.keyboard.press('Control+c');
  await expect(page.locator('#status')).toContainText('copied 1 object');
  await page.click('#sbtn button:has-text("+ new")');
  await page.keyboard.press('Control+v');
  const v = await vec(page, 1);
  expect(v).toHaveLength(1);
  expect([v[0].t, v[0].x, v[0].y, v[0].w, v[0].h]).toEqual(['plot', 47, 3, 31, 13]);
  await expect(page.locator('#spec')).toBeVisible(); // the pasted plot is selected
  await page.keyboard.press('Control+v'); // paste again: a second copy
  expect(await vec(page, 1)).toHaveLength(2);
  await page.keyboard.press('Control+z');
  expect(await vec(page, 1)).toHaveLength(1);
  expect(await vec(page, 0)).toHaveLength(1); // the original is untouched
});

test('a selected region brings its text, lines and the plots inside it', async ({ page }) => {
  await openEditor(page);
  await dragCells(page, [0, 0], [79, 17]); // the top of the demo, plot included
  await page.keyboard.press('Control+c');
  await expect(page.locator('#status')).toContainText('copied cells and 1 object');
  const before = (await rows(page)).slice(0, 18);
  await page.click('#sbtn button:has-text("+ new")');
  await page.keyboard.press('Control+v');
  expect((await rows(page)).slice(0, 18)).toEqual(before);
  expect((await vec(page, 1)).map((o) => [o.t, o.x, o.y])).toEqual([['plot', 47, 3]]);
  expect(await page.evaluate(() => window.ED.doc.slides[1].ch.filter((c) => c.charCodeAt(0) === 2).length)).toBe(3); // the three equations
});

test('cut removes the cells and the objects; paste into a selection puts it there', async ({ page }) => {
  await openEditor(page);
  await dragCells(page, [45, 2], [79, 17]);
  await page.keyboard.press('Control+x');
  expect(await vec(page, 0)).toHaveLength(0);
  await page.click('#sbtn button:has-text("+ new")');
  await page.keyboard.press('v');
  await dragCells(page, [2, 5], [3, 6]);
  await page.keyboard.press('Control+v');
  expect((await vec(page, 1)).map((o) => [o.x, o.y])).toEqual([[4, 6]]); // plot was 2 right, 1 down of the corner
  // Undo goes back through the deck's history: the paste, the new slide, then the cut.
  for (let i = 0; i < 3; i++) await page.keyboard.press('Control+z');
  expect(await page.evaluate(() => window.ED.doc.slides.length)).toBe(1);
  expect(await vec(page, 0)).toHaveLength(1);
});

test('the slide buttons stay visible with many slides, and new slides scroll into view', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 600 });
  await openEditor(page);
  for (let i = 0; i < 12; i++) await page.click('#sbtn button:has-text("copy")');
  const side = (await page.locator('#side').boundingBox())!;
  const bar = (await page.locator('#sbtn').boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(side.y + side.height + 1);
  expect(bar.y).toBeGreaterThan(side.y);
  const cur = (await page.locator('#slides .th.on').boundingBox())!;
  expect(cur.y + cur.height).toBeLessThanOrEqual(bar.y + 1); // the new slide is not hidden behind the buttons
  await page.click('#slides .th:nth-child(1)');
  const bar2 = (await page.locator('#sbtn').boundingBox())!;
  expect(bar2.y + bar2.height).toBeLessThanOrEqual(side.y + side.height + 1);
});
