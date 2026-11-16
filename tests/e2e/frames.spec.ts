import { expect, test } from '@playwright/test';
import { clickCell, emptyDeck, openEditor } from './util';

test('slides marked as frames play as one animated page', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  await clickCell(page, 0, 0);
  await page.keyboard.type('frame A');
  await page.keyboard.press('Escape');
  await page.click('#sbtn button:has-text("copy")');
  await page.keyboard.press('t');
  await clickCell(page, 6, 0);
  await page.keyboard.type('B');
  await page.keyboard.press('Escape');
  await page.check('#sframe');
  await expect(page.locator('#slides .th span')).toHaveText(['1.1', '1.2']);
  await page.fill('#sdelay', '60');
  await page.locator('#sdelay').press('Enter');
  await page.click('#sbtn button:has-text("+ new")'); // a plain slide after the animation
  expect(await page.evaluate(() => window.ED.doc.slides.map((s) => [s.frame ?? false, s.delay ?? 0]))).toEqual([[false, 60], [true, 0], [false, 0]]);

  await page.click('#slides .th:nth-child(1)');
  await page.keyboard.press('p');
  const f = page.frameLocator('#present iframe');
  await expect(f.locator('#count')).toHaveText('01/02');
  await expect(f.locator('#animbtn')).toBeVisible();
  await f.locator('#plainbtn').click();
  // Both frames show up in turn.
  await expect(f.locator('#plain')).toHaveText('frame B');
  await expect(f.locator('#plain')).toHaveText('frame A');
  await f.locator('#animbtn').click(); // pause
  const held = await f.locator('#plain').textContent();
  await page.waitForTimeout(300);
  await expect(f.locator('#plain')).toHaveText(held!);
  await page.keyboard.press('ArrowRight');
  await expect(f.locator('#count')).toHaveText('02/02');
  await expect(f.locator('#animbtn')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#present')).toBeHidden();
  expect(await page.evaluate(() => window.ED.cur)).toBe(2);
});

test('the side panel follows the current slide after copy and reorder', async ({ page }) => {
  await openEditor(page);
  await page.fill('#stitle', 'first');
  await page.click('#sbtn button:has-text("copy")');
  await expect(page.locator('#insp h3').first()).toHaveText('Slide 2');
  await expect(page.locator('#sframe')).toBeEnabled();
  await page.fill('#stitle', 'second');
  await page.click('#sbtn button:has-text("↑")');
  await expect(page.locator('#insp h3').first()).toHaveText('Slide 1');
  await expect(page.locator('#stitle')).toHaveValue('second');
  await expect(page.locator('#sframe')).toBeDisabled();
  await page.click('#sbtn button:has-text("↓")');
  await expect(page.locator('#insp h3').first()).toHaveText('Slide 2');
});
