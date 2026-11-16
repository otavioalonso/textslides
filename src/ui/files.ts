/*
 * Decks on disk. With the File System Access API (Chromium), Ctrl+S writes back to the file that was opened or
 * last saved; elsewhere saving downloads a file and opening uses a file chooser. `.tslides` files use the
 * readable text format (model/textformat.ts); `.json` files hold the JSON deck.
 */
import { afterLoad, pushUndo, snap } from '../editor';
import { parseDeck, toText } from '../model/textformat';
import type { Doc } from '../model/types';
import { ed, mark } from '../state';
import { closeModal, download } from './modal';
import { buildSlideList } from './slides';

interface WritableLike { write(data: string): Promise<void>; close(): Promise<void> }
interface HandleLike { name: string; getFile(): Promise<File>; createWritable(): Promise<WritableLike> }
type PickerTypes = { description: string; accept: Record<string, string[]> }[];
interface FsWindow {
  showSaveFilePicker?: (o: { suggestedName?: string; types?: PickerTypes }) => Promise<HandleLike>;
  showOpenFilePicker?: (o: { types?: PickerTypes; multiple?: boolean }) => Promise<HandleLike[]>;
}

const TYPES: PickerTypes = [
  { description: 'Text slides', accept: { 'text/plain': ['.tslides'] } },
  { description: 'JSON deck', accept: { 'application/json': ['.json'] } },
];

let handle: HandleLike | null = null;

const fsw = (): FsWindow => window as unknown as FsWindow;

/** The deck as file content, in the format the file name asks for. */
export function serialise(doc: Doc, name: string): string {
  return /\.json$/i.test(name) ? JSON.stringify(doc) : toText(doc);
}

function say(m: string): void {
  ed.msg = m;
  mark();
}

/** Replace the deck with one read from a file or pasted text; undoable. Returns false if it could not be read. */
export function loadDeckText(text: string, name = ''): boolean {
  let d: Doc;
  try { d = parseDeck(text); }
  catch (e) { say('could not open ' + (name || 'the deck') + ': ' + ((e as Error).message || 'not a deck file')); return false; }
  const pre = snap();
  ed.doc = d;
  ed.cur = 0;
  pushUndo(pre);
  closeModal();
  afterLoad();
  buildSlideList();
  say(name ? 'opened ' + name : 'deck loaded');
  return true;
}

export async function saveFile(saveAs = false): Promise<void> {
  const w = fsw();
  if (!w.showSaveFilePicker) {
    download('slides.tslides', toText(ed.doc), 'text/plain');
    say('downloaded slides.tslides');
    return;
  }
  try {
    if (!handle || saveAs) handle = await w.showSaveFilePicker({ suggestedName: handle?.name || 'slides.tslides', types: TYPES });
    const out = await handle.createWritable();
    await out.write(serialise(ed.doc, handle.name));
    await out.close();
    say('saved ' + handle.name);
  } catch (e) {
    if ((e as Error).name !== 'AbortError') say('could not save: ' + ((e as Error).message || e));
  }
}

export async function openFile(): Promise<void> {
  const w = fsw();
  if (!w.showOpenFilePicker) { pickWithInput(); return; }
  try {
    const [h] = await w.showOpenFilePicker({ types: TYPES });
    if (loadDeckText(await (await h.getFile()).text(), h.name)) handle = h;
  } catch (e) {
    if ((e as Error).name !== 'AbortError') say('could not open: ' + ((e as Error).message || e));
  }
}

function pickWithInput(): void {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.tslides,.json,.txt,text/plain,application/json';
  inp.onchange = async () => {
    const f = inp.files?.[0];
    if (f) loadDeckText(await f.text(), f.name);
  };
  inp.click();
}

/** Name of the file Ctrl+S writes to, if any. */
export function currentFileName(): string {
  return handle ? handle.name : '';
}
