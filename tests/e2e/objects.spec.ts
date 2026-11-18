import { expect, test } from '@playwright/test';
import { dragCells, emptyDeck, openEditor } from './util';

test('heat tool places a drawdown that shows in plain text and in exports', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('h');
  await dragCells(page, [2, 2], [13, 5]);
  await expect(page.locator('#spec')).toBeVisible();
  await page.fill('#spec', '#..\n.#.\n..#');
  await page.locator('#insp h3').first().click();
  const vec = await page.evaluate(() => window.ED.doc.slides[0].vec);
  expect(vec).toEqual([{ t: 'heat', x: 2, y: 2, w: 12, h: 4, spec: '#..\n.#.\n..#' }]);
  // The canvas shows both theme colours inside the box.
  const colours = await page.evaluate(() => {
    const c = window.ED.cv.getContext('2d')!;
    const { cw, ch } = window.ED;
    const d = window.devicePixelRatio;
    const seen = new Set<string>();
    for (let x = 2; x < 14; x++) for (let y = 2; y < 6; y += 0.5) {
      const p = c.getImageData(Math.floor((x + 0.5) * cw * d), Math.floor((y + 0.25) * ch * d), 1, 1).data;
      seen.add(p.slice(0, 3).join(','));
    }
    return [...seen];
  });
  expect(colours).toContain('229,162,74'); // modern primary  #E5A24A
  expect(colours).toContain('79,163,224'); // modern secondary #4FA3E0
  await page.click('#bText');
  await expect(page.locator('#mt')).toHaveValue(/\n  ▀▄ ▀▄ ▀▄ ▀▄\n  ▄ ▀▄ ▀▄ ▀▄ ▀\n/);
});

test('a plot with style: braille is drawn in the grid', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('g');
  await dragCells(page, [1, 1], [30, 10]);
  await page.fill('#spec', 'style: braille\ntitle: wave\nx: 0 6.3\n= sin(x)');
  await page.locator('#insp h3').first().click();
  await page.click('#bText');
  const txt = await page.inputValue('#mt');
  expect(txt).toContain(' wave');
  expect((txt.match(/[⠁-⣿]/g) || []).length).toBeGreaterThan(25);
});
