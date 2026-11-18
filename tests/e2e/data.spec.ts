import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { cellXY, emptyDeck, openEditor } from './util';

const fixture = (n: string) => readFileSync(new URL('../unit/fixtures/' + n + '.json', import.meta.url), 'utf8');

declare global {
  interface Window { __files: Record<string, string>; __stamp: number }
}

/** An in-memory folder standing in for the File System Access directory picker. */
function mockFolder() {
  window.__files = {};
  window.__stamp = 1;
  const dir = (prefix: string): unknown => ({
    name: prefix ? prefix.split('/').filter(Boolean).pop() : 'project',
    kind: 'directory',
    getDirectoryHandle: async (n: string) => dir(prefix + n + '/'),
    getFileHandle: async (n: string) => {
      const p = prefix + n;
      if (!(p in window.__files)) throw Object.assign(new Error('missing'), { name: 'NotFoundError' });
      return { getFile: async () => new File([window.__files[p]], n, { lastModified: window.__stamp }) };
    },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
  });
  Object.assign(window, { showDirectoryPicker: async () => dir('') });
}

/** Mean colour inside the plot's axes area, to see that something was drawn there. */
async function plotPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const o = window.ED.doc.slides[window.ED.cur].vec[0] as { x: number; y: number; w: number; h: number };
    const c = window.ED.cv.getContext('2d')!;
    const d = window.devicePixelRatio;
    const img = c.getImageData((o.x + 6) * window.ED.cw * d, (o.y + 2) * window.ED.ch * d, (o.w - 8) * window.ED.cw * d, (o.h - 4) * window.ED.ch * d).data;
    let n = 0;
    for (let i = 0; i < img.length; i += 4) if (img[i] + img[i + 1] + img[i + 2] > 300) n++;
    return n;
  });
}

test('dropping a data file on the slide makes a plot with the data imported', async ({ page }) => {
  await openEditor(page);
  await emptyDeck(page);
  const [x, y] = await cellXY(page, 5, 3);
  const dt = await page.evaluateHandle((txt) => {
    const t = new DataTransfer();
    t.items.add(new File([txt], 'spectrum.json', { type: 'application/json' }));
    return t;
  }, fixture('spectrum'));
  await page.dispatchEvent('#cv', 'drop', { dataTransfer: dt, clientX: x, clientY: y });
  await expect.poll(() => page.evaluate(() => window.ED.doc.slides[0].vec.length)).toBe(1);
  const o = await page.evaluate(() => window.ED.doc.slides[0].vec[0] as { x: number; y: number; data: { title: string } });
  expect([o.x, o.y, o.data.title]).toEqual([5, 3, 'power spectrum']);
  await expect(page.locator('#dstatus')).toContainText('Imported into the deck (3 series)');
  expect(await plotPixels(page)).toBeGreaterThan(50);
  await page.keyboard.press('Control+z');
  expect(await page.evaluate(() => window.ED.doc.slides[0].vec.length)).toBe(0);
});

test('a linked data file loads from the data folder and redraws when it changes', async ({ page }) => {
  await page.addInitScript(mockFolder);
  await openEditor(page);
  await emptyDeck(page);
  await page.evaluate((txt) => { window.__files['results/spectrum.json'] = txt; }, fixture('spectrum'));
  await page.keyboard.press('g');
  const [x0, y0] = await cellXY(page, 2, 2);
  const [x1, y1] = await cellXY(page, 60, 20);
  await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up();
  await page.fill('#spec', 'data: results/spectrum.json');
  await page.locator('#insp h3').first().click();
  await expect(page.locator('#dstatus')).toContainText('link the data folder');
  await page.click('#dlink');
  await expect(page.locator('#dstatus')).toContainText('results/spectrum.json: loaded');
  await expect(page.locator('#dstatus')).toContainText('Data folder: project');
  const before = await plotPixels(page);
  expect(before).toBeGreaterThan(50);
  // The analysis is re-run: the file changes, and the plot follows without any click.
  const shot = await page.locator('#cv').screenshot();
  await page.evaluate((txt) => { window.__files['results/spectrum.json'] = txt; window.__stamp++; }, fixture('histogram'));
  await expect.poll(async () => Buffer.compare(shot, await page.locator('#cv').screenshot()) !== 0, { timeout: 5000 }).toBe(true);
  // The deck itself is unchanged (the data is not in it), but exports carry it.
  expect(await page.evaluate(() => (window.ED.doc.slides[0].vec[0] as { data?: unknown }).data)).toBeUndefined();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bExport')]);
  const html = readFileSync((await dl.path())!, 'utf8');
  expect(html).toContain('outlier bin');
  // A missing file is reported.
  await page.locator('#cv').click({ position: { x: 3, y: 3 } });
  await page.mouse.click(x0 + 40, y0 + 40);
  await page.fill('#spec', 'data: results/nope.json');
  await page.locator('#insp h3').first().click();
  await expect(page.locator('#dstatus')).toContainText('results/nope.json: not found in project');
});

test('import file reads data into the plot; remove takes it out again', async ({ page }) => {
  await openEditor(page);
  await page.click('#sbtn button:has-text("+ new")');
  await page.keyboard.press('g');
  const [x0, y0] = await cellXY(page, 2, 2);
  const [x1, y1] = await cellXY(page, 40, 16);
  await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#dimport')]);
  await chooser.setFiles({ name: 'correlation.json', mimeType: 'application/json', buffer: Buffer.from(fixture('correlation')) });
  await expect(page.locator('#dstatus')).toContainText('Imported into the deck (1 series)');
  expect(await page.evaluate(() => (window.ED.doc.slides[1].vec[0] as { data?: { title: string } }).data?.title)).toBe('correlation');
  await page.click('#dremove');
  expect(await page.evaluate(() => (window.ED.doc.slides[1].vec[0] as { data?: unknown }).data)).toBeUndefined();
});
