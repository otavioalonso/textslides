import { expect, test } from '@playwright/test';
import { clickCell, emptyDeck, openEditor, rows } from './util';

declare global {
  interface Window { __fs: { name: string; content: string; pickers: number } }
}

/** A stand-in for the File System Access pickers: one in-memory file. */
function mockFs() {
  window.__fs = { name: '', content: '', pickers: 0 };
  const handle = (name: string) => ({
    name,
    getFile: async () => new File([window.__fs.content], name),
    createWritable: async () => ({ write: async (t: string) => { window.__fs.content = t; window.__fs.name = name; }, close: async () => {} }),
  });
  Object.assign(window, {
    showSaveFilePicker: async (o: { suggestedName: string }) => { window.__fs.pickers++; return handle(o.suggestedName); },
    showOpenFilePicker: async () => { window.__fs.pickers++; return [handle(window.__fs.name || 'talk.tslides')]; },
  });
}

test('Ctrl+S saves the text format to disk, then saves to the same file without asking', async ({ page }) => {
  await page.addInitScript(mockFs);
  await openEditor(page);
  await page.keyboard.press('Control+s');
  await expect.poll(() => page.evaluate(() => window.__fs.content)).toMatch(/^textslides 1\nsize 80x24\ntheme modern\n/);
  expect(await page.evaluate(() => [window.__fs.name, window.__fs.pickers])).toEqual(['slides.tslides', 1]);
  await expect(page.locator('#status')).toContainText('saved slides.tslides');

  await page.keyboard.press('t');
  await clickCell(page, 2, 23);
  await page.keyboard.type('more');
  await page.keyboard.press('Control+s');
  await expect.poll(() => page.evaluate(() => window.__fs.content)).toContain('|  more');
  expect(await page.evaluate(() => window.__fs.pickers)).toBe(1);
});

test('Ctrl+O opens a .tslides file; undo brings the old deck back', async ({ page }) => {
  await page.addInitScript(mockFs);
  await openEditor(page);
  await page.evaluate(() => {
    window.__fs.name = 'talk.tslides';
    window.__fs.content = 'textslides 1\nsize 40x25\ntheme c64\n\n=== slide\ntitle: Hello\n--- text\n|┌──┐\n|│hi│\n|└──┘\n--- lines\n|6aac\n|5..5\n|3aa9\n';
  });
  await page.keyboard.press('Control+o');
  await expect.poll(() => page.evaluate(() => window.ED.doc.cols)).toBe(40);
  const d = await page.evaluate(() => window.ED.doc);
  expect([d.rows, d.theme, d.slides[0].title]).toEqual([25, 'c64', 'Hello']);
  expect((await rows(page)).slice(0, 3).map((r) => r.trimEnd())).toEqual(['┌──┐', '│hi│', '└──┘']);
  await expect(page.locator('#status')).toContainText('opened talk.tslides');
  await page.keyboard.press('Control+z');
  expect(await page.evaluate(() => window.ED.doc.cols)).toBe(80);
});

test('without the File System Access API, save downloads and open uses a file chooser', async ({ page }) => {
  await page.addInitScript(() => { delete (window as any).showSaveFilePicker; delete (window as any).showOpenFilePicker; });
  await openEditor(page);
  await emptyDeck(page);
  await page.keyboard.press('t');
  await clickCell(page, 0, 0);
  await page.keyboard.type('round trip');
  await page.keyboard.press('Escape');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  expect(dl.suggestedFilename()).toBe('slides.tslides');
  const path = await dl.path();
  await emptyDeck(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Control+o')]);
  await chooser.setFiles(path!);
  await expect.poll(async () => (await rows(page))[0].trimEnd()).toBe('round trip');
});

test('the open dialog loads a pasted deck in either format', async ({ page }) => {
  await openEditor(page);
  await page.click('#bOpen');
  await page.fill('#mt', 'textslides 1\nsize 80x24\ntheme modern\n\n=== slide\n--- text\n|pasted\n');
  await page.click('#mbtns button:has-text("load pasted")');
  expect((await rows(page))[0].trimEnd()).toBe('pasted');
  await page.click('#bOpen');
  await page.fill('#mt', 'not a deck');
  await page.click('#mbtns button:has-text("load pasted")');
  await expect(page.locator('#status')).toContainText('could not open the deck');
});
