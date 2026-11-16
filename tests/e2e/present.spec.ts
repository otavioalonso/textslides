import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { clickCell, openEditor } from './util';

test('present mode opens on the current slide and Esc returns to it', async ({ page }) => {
  await openEditor(page);
  await page.click('#sbtn button:has-text("copy")');
  await page.click('#sbtn button:has-text("copy")');
  await page.click('#slides .th:nth-child(2)');
  await page.keyboard.press('p');
  const f = page.frameLocator('#present iframe');
  await expect(f.locator('#count')).toHaveText('02/03');
  await expect(f.locator('.eq .katex')).toHaveCount(3);
  await page.keyboard.press('ArrowRight');
  await expect(f.locator('#count')).toHaveText('03/03');
  await page.keyboard.press('ArrowRight'); // stays on the last slide
  await expect(f.locator('#count')).toHaveText('03/03');
  await page.keyboard.press('Escape');
  await expect(page.locator('#present')).toBeHidden();
  expect(await page.evaluate(() => window.ED.cur)).toBe(2);
  // Leaving full screen resizes the editor; wait for the canvas to settle before clicking on a cell.
  await page.waitForFunction(() => !document.fullscreenElement);
  await expect.poll(async () => {
    const a = await page.locator('#cv').boundingBox();
    await page.waitForTimeout(100);
    const b = await page.locator('#cv').boundingBox();
    return JSON.stringify(a) === JSON.stringify(b);
  }).toBe(true);
  // The editor has keyboard control again.
  await page.keyboard.press('t');
  await clickCell(page, 2, 22);
  await page.keyboard.type('back');
  expect(await page.evaluate(() => window.ED.doc.slides[2].ch.slice(22 * 80 + 2, 22 * 80 + 6).join(''))).toBe('back');
});

test('export is one file that works offline', async ({ page, context }, info) => {
  await openEditor(page);
  await page.click('#sbtn button:has-text("+ new")');
  await page.keyboard.press('t');
  await clickCell(page, 1, 1);
  await page.keyboard.type('second </script> slide');
  await page.keyboard.press('Escape');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bExport')]);
  expect(dl.suggestedFilename()).toBe('slides.html');
  const file = info.outputPath('slides.html');
  await dl.saveAs(file);
  expect(fs.statSync(file).size).toBeLessThan(1_000_000);

  const view = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  view.on('pageerror', (e) => errors.push(String(e)));
  await view.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith('file:') || u.startsWith('data:')) return r.continue();
    requests.push(u);
    return r.abort();
  });
  await view.goto('file://' + file);
  await expect(view.locator('#count')).toHaveText('01/02');
  await expect(view.locator('.eq .katex')).toHaveCount(3);
  await expect(view).toHaveTitle('TEXT-MODE SLIDE EDITOR');
  await view.keyboard.press('ArrowRight');
  await expect(view.locator('#count')).toHaveText('02/02');
  expect(new URL(view.url()).hash).toBe('#2');
  await view.keyboard.press('t');
  await expect(view.locator('#plain')).toHaveText('\n second </script> slide');
  await view.keyboard.press('t');
  await view.keyboard.press('c');
  await expect(view.locator('#bezel')).toHaveClass('c64');
  // Opening at a slide by URL.
  await view.goto('file://' + file + '#2');
  await expect(view.locator('#count')).toHaveText('02/02');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const size of ['40x25', '80x24', '120x34']) {
  test(`the player fits a ${size} deck in the window`, async ({ page }) => {
    await openEditor(page);
    await page.selectOption('#size', size);
    await page.keyboard.press('p');
    const f = page.frameLocator('#present iframe');
    const bezel = await f.locator('#bezel').boundingBox();
    const canvas = await f.locator('#cv').boundingBox();
    const vp = page.viewportSize()!;
    expect(bezel!.width).toBeLessThanOrEqual(vp.width);
    expect(bezel!.y + bezel!.height).toBeLessThanOrEqual(vp.height);
    // ...and uses the space: the binding dimension fills most of the window.
    expect(Math.max(canvas!.width / vp.width, canvas!.height / vp.height)).toBeGreaterThan(0.6);
  });
}

test('player: notes, equations as text, plot read-out, green theme', async ({ page }) => {
  await openEditor(page);
  await page.fill('#stitle', 'Demo');
  await page.fill('#snotes', 'Point at the plot.');
  await page.selectOption('#theme', 'vt');
  await page.locator('#cv').click({ position: { x: 5, y: 5 } }); // focus back on the slide
  await page.keyboard.press('p');
  const f = page.frameLocator('#present iframe');
  await expect(f.locator('#bezel')).toHaveClass('vt');
  await page.keyboard.press('n');
  await expect(f.locator('#notes')).toBeVisible();
  await expect(f.locator('#notes')).toHaveText('Demo\nPoint at the plot.');
  await page.keyboard.press('e');
  await expect(f.locator('.eq')).toHaveCount(0);
  await expect(f.locator('#mathbtn')).toHaveText('equations: text');
  await page.keyboard.press('e');
  await expect(f.locator('.eq')).toHaveCount(3);
  // Hovering the demo plot draws the read-out: pixels change under the plot's top-right corner.
  const canvas = f.locator('#cv');
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35);
  await expect.poll(async () => Buffer.compare(before, await canvas.screenshot()) !== 0).toBe(true);
});
