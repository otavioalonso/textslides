import { expect, test } from '@playwright/test';
import { clickCell, dragCells, emptyDeck, openEditor, rows } from './util';

test('loads the demo slide without errors', async ({ page }) => {
  const errors = await openEditor(page);
  const doc = await page.evaluate(() => window.ED.doc);
  expect(doc.cols).toBe(80);
  expect(doc.slides).toHaveLength(1);
  expect(doc.slides[0].vec).toHaveLength(1);
  await expect(page.locator('#ov .eq')).toHaveCount(3);
  await expect(page.locator('#ov .eq .katex').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('box and crossing line join; undo and redo', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('b');
  await dragCells(page, [2, 2], [10, 6]);
  await page.keyboard.press('l');
  await dragCells(page, [0, 4], [14, 4]);
  let r = await rows(page);
  expect(r[2].slice(0, 12)).toBe('  ┌───────┐ ');
  expect(r[4].slice(0, 15)).toBe('──┼───────┼────');
  expect(r[6].slice(0, 12)).toBe('  └───────┘ ');

  await page.keyboard.press('Control+z');
  r = await rows(page);
  expect(r[4].slice(0, 15)).toBe('  │       │    ');
  await page.keyboard.press('Control+z');
  expect((await rows(page)).join('').trim()).toBe('');
  await page.keyboard.press('Control+Shift+z');
  await page.keyboard.press('Control+Shift+z');
  expect((await rows(page))[4].slice(0, 15)).toBe('──┼───────┼────');
});

test('text with an inline equation takes only the rendered width', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  await clickCell(page, 3, 5);
  await page.keyboard.type('so ');
  await page.keyboard.press('$');
  await expect(page.locator('#eqbar')).toBeVisible();
  await page.keyboard.type('\\frac{a}{b}');
  await expect(page.locator('#eqprev .katex')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#eqbar')).toBeHidden();
  await page.keyboard.type(' ok');

  const s = await page.evaluate(() => window.ED.doc.slides[0]);
  const anchor = s.ch[5 * 80 + 6];
  const m = anchor.match(/^\u0002I(\d+):(.*)$/s)!;
  expect(m[2]).toBe('\\frac{a}{b}');
  const w = +m[1];
  expect(w).toBeGreaterThanOrEqual(2);
  expect(w).toBeLessThan(8);
  // Continuation cells fill the rest of the group, and the text resumes right after it.
  for (let k = 1; k < w; k++) expect(s.ch[5 * 80 + 6 + k]).toBe('\u0001');
  expect((await rows(page))[5].slice(3, 6 + w + 3)).toBe('so $' + '~'.repeat(w - 1) + ' ok');

  // The overlay element is exactly the reserved cells wide.
  const box = await page.locator('#ov .eq').boundingBox();
  const cw = await page.evaluate(() => window.ED.cw);
  expect(box!.width).toBeCloseTo(w * cw, 0);

  // One undo step removes the trailing text, the next the equation.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+z');
  expect((await rows(page))[5].trim()).toBe('so $' + '~'.repeat(w - 1));
  await page.keyboard.press('Control+z');
  expect((await rows(page))[5].trim()).toBe('so');
});

test('clicking an equation edits it; display style with $$', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  await clickCell(page, 1, 1);
  await page.keyboard.press('$');
  await page.keyboard.press('$');
  await expect(page.locator('#eqtag')).toHaveText('$$');
  await page.keyboard.type('\\sum_k x_k');
  await page.keyboard.press('Enter');
  await expect(page.locator('#eqbar')).toBeHidden();
  await clickCell(page, 2, 1);
  await expect(page.locator('#eqin')).toHaveValue('\\sum_k x_k');
  await page.locator('#eqin').press('End');
  await page.locator('#eqin').pressSequentially('^2');
  await page.locator('#eqin').press('Enter');
  const anchor = await page.evaluate(() => window.ED.doc.slides[0].ch[81]);
  expect(anchor).toMatch(/^\u0002D\d+:\\sum_k x_k\^2$/);
});

test('typing straight after placing an equation loses no keys', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  for (let y = 0; y < 6; y++) {
    await clickCell(page, 0, y);
    await page.keyboard.press('$');
    await page.keyboard.type('x');
    await page.keyboard.press('Enter');
    await page.keyboard.type(' abc');
  }
  const r = await rows(page);
  for (let y = 0; y < 6; y++) expect(r[y].replace(/[$~]+/, 'E').trim()).toBe('E abc');
});

test('clicking elsewhere closes the equation bar and keeps the equation', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  await clickCell(page, 2, 2);
  await page.keyboard.press('$');
  await page.keyboard.type('y^2');
  await clickCell(page, 20, 10);
  await expect(page.locator('#eqbar')).toBeHidden();
  expect(await page.evaluate(() => window.ED.doc.slides[0].ch[2 * 80 + 2])).toMatch(/^\u0002I\d+:y\^2$/);
});

test('plot: place, edit spec, delete', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('g');
  await dragCells(page, [10, 4], [40, 18]);
  await expect(page.locator('#spec')).toBeVisible();
  await page.fill('#spec', 'x: 0 1\n= x*x');
  await page.locator('#insp h3').click();
  const vec = await page.evaluate(() => window.ED.doc.slides[0].vec);
  expect(vec).toEqual([{ t: 'plot', x: 10, y: 4, w: 31, h: 15, spec: 'x: 0 1\n= x*x' }]);
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.ED.doc.slides[0].vec)).toEqual([]);
});

test('the deck survives a reload (autosave)', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  await clickCell(page, 0, 0);
  await page.keyboard.type('kept');
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => window.ED && window.ED.doc);
  expect((await rows(page))[0].trim()).toBe('kept');
});

for (const size of ['40x25', '80x24', '120x34']) {
  for (const theme of ['modern', 'c64']) {
    test(`renders at ${size} in ${theme}`, async ({ page }) => {
      const errors = await openEditor(page);
      await page.selectOption('#theme', theme);
      await page.selectOption('#size', size);
      const [cols, rows] = size.split('x').map(Number);
      const m = await page.evaluate(() => ({ w: window.ED.cv.width, h: window.ED.cv.height, cols: window.ED.doc.cols, rows: window.ED.doc.rows }));
      expect([m.cols, m.rows]).toEqual([cols, rows]);
      // Cells are whole device pixels: the canvas is an exact multiple of the grid.
      expect(m.w % cols).toBe(0);
      expect(m.h % rows).toBe(0);
      expect(errors).toEqual([]);
    });
  }
}

test('slide title and notes are edited in the side panel, one undo step each', async ({ page }) => {
  await openEditor(page);
  await page.fill('#stitle', 'Intro');
  await page.fill('#snotes', 'say hello');
  await page.locator('#cv').click({ position: { x: 5, y: 5 } });
  let s = await page.evaluate(() => window.ED.doc.slides[0]);
  expect([s.title, s.notes]).toEqual(['Intro', 'say hello']);
  await page.keyboard.press('Control+z');
  s = await page.evaluate(() => window.ED.doc.slides[0]);
  expect([s.title, s.notes]).toEqual(['Intro', undefined]);
  await expect(page.locator('#stitle')).toHaveValue('Intro');
});

test('moving a selection that cuts an equation moves the whole equation', async ({ page }) => {
  await openEditor(page);
  // The demo has an equation starting at (2, 9). Select only its middle and drag the selection down 2 rows.
  await dragCells(page, [6, 8], [8, 10]);
  await dragCells(page, [7, 9], [7, 11]);
  const r = await rows(page);
  expect(r[9].slice(0, 20).trim()).toBe('');
  expect(r[11].slice(2, 3)).toBe('$');
  const anchors = await page.evaluate(() => window.ED.doc.slides[0].ch.filter((c) => c.charCodeAt(0) === 2).length);
  expect(anchors).toBe(3);
});
