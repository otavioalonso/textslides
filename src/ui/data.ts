/*
 * Plot data in the editor.
 *
 * Linked: a plot whose spec has `data: results/x.json` reads that file from the data folder, a folder the user
 * links once (File System Access directory picker; the handle is kept in IndexedDB so a reload only asks to
 * confirm). Linked files are checked every 1.5 s while the tab is visible and plots redraw when they change.
 * The last data read is cached in localStorage, so plots still draw before the folder is reconnected.
 *
 * Imported: a data file read once into the deck (`PlotObj.data`), for browsers without folder access or for
 * decks that should carry their numbers. Dropping a data file on the canvas makes a new plot with it.
 */
import { cv } from '../dom';
import { commit, snap } from '../editor';
import { dataPath, linkedData, parsePlotData, type PlotData } from '../model/plotdata';
import type { PlotObj } from '../model/types';
import { pos } from '../tools/hit';
import { ed, mark, S, ui } from '../state';
import { loadDeckText } from './files';
import { refreshDataStatus } from './inspector';

interface DirHandle {
  name: string;
  kind: 'directory';
  getDirectoryHandle(name: string): Promise<DirHandle>;
  getFileHandle(name: string): Promise<{ getFile(): Promise<File> }>;
  queryPermission?(o: { mode: 'read' }): Promise<PermissionState>;
  requestPermission?(o: { mode: 'read' }): Promise<PermissionState>;
}
type DirPicker = (o?: { id?: string; mode?: 'read' }) => Promise<DirHandle>;

const CACHE_KEY = 'textslides-linked-data';
let folder: DirHandle | null = null;
/** Folder remembered from an earlier session that still needs the user to confirm access. */
let pendingFolder: DirHandle | null = null;
/** Per linked path: when the file was last read, or why it could not be. */
const state = new Map<string, { stamp?: string; error?: string; at?: Date }>();

export function hasFolderAccess(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: DirPicker }).showDirectoryPicker === 'function';
}

export function folderName(): string {
  return folder ? folder.name : pendingFolder ? pendingFolder.name + ' (click to reconnect)' : '';
}

export function linkStatus(path: string): string {
  const st = state.get(path);
  if (!folder) return linkedData.has(path) ? 'showing the last data read; link the data folder to update it' : 'link the data folder to load it';
  if (!st) return 'loading…';
  if (st.error) return st.error;
  return 'loaded ' + (st.at ? st.at.toLocaleTimeString() : '');
}

/** Rebuild the side panel, or only its data status line while the user is typing in it. */
function refreshPanel(): void {
  const insp = document.getElementById('insp');
  if (insp && insp.contains(document.activeElement)) refreshDataStatus();
  else ui.refreshInspector();
}

/* ------------------------------------------------------------------ folder handle, kept in IndexedDB */
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('textslides', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('handles', mode);
      const req = fn(tx.objectStore('handles'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

export async function linkFolder(): Promise<void> {
  if (pendingFolder && pendingFolder.requestPermission) {
    if ((await pendingFolder.requestPermission({ mode: 'read' })) === 'granted') {
      folder = pendingFolder;
      pendingFolder = null;
      await refreshAll(true);
      return;
    }
  }
  const pick = (window as unknown as { showDirectoryPicker?: DirPicker }).showDirectoryPicker;
  if (!pick) { say('this browser cannot link folders; use "import file…" on the plot instead'); return; }
  try {
    folder = await pick({ id: 'textslides-data', mode: 'read' });
    pendingFolder = null;
    try { await idb('readwrite', (s) => s.put(folder, 'dataFolder')); } catch { /* not remembered, still works */ }
    state.clear();
    await refreshAll(true);
    say('linked data folder ' + folder.name);
  } catch (e) {
    if ((e as Error).name !== 'AbortError') say('could not link the folder: ' + (e as Error).message);
  }
}

async function restoreFolder(): Promise<void> {
  let h: DirHandle | undefined;
  try { h = await idb<DirHandle | undefined>('readonly', (s) => s.get('dataFolder') as IDBRequest<DirHandle | undefined>); } catch { return; }
  if (!h) return;
  if (h.queryPermission && (await h.queryPermission({ mode: 'read' })) === 'granted') { folder = h; await refreshAll(true); }
  else { pendingFolder = h; refreshPanel(); }
}

/* ------------------------------------------------------------------ reading linked files */
async function fileAt(path: string): Promise<File> {
  const parts = path.replace(/^\.\//, '').split('/').filter(Boolean);
  if (!parts.length || parts.some((p) => p === '..')) throw new Error('paths are relative to the data folder, without ..');
  let d = folder!;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
  return (await d.getFileHandle(parts[parts.length - 1])).getFile();
}

/** Every `data:` path used in the deck. */
function linkedPaths(): string[] {
  const out = new Set<string>();
  for (const s of ed.doc.slides) for (const o of s.vec) if (o.t === 'plot') { const p = dataPath(o.spec); if (p) out.add(p); }
  return [...out];
}

let busy = false;
/** Re-read linked files that changed (or all, with `force`). Redraws if any data changed. */
export async function refreshAll(force = false): Promise<void> {
  if (!folder || busy) return;
  busy = true;
  let changed = false;
  try {
    for (const p of linkedPaths()) {
      const prev = state.get(p);
      try {
        const f = await fileAt(p);
        const stamp = f.lastModified + ':' + f.size;
        if (!force && prev?.stamp === stamp && !prev.error) continue;
        linkedData.set(p, parsePlotData(await f.text()));
        state.set(p, { stamp, at: new Date() });
        changed = true;
      } catch (e) {
        const err = (e as Error).name === 'NotFoundError' ? 'not found in ' + folder.name : (e as Error).message || String(e);
        if (prev?.error !== err) changed = true;
        state.set(p, { error: err, stamp: prev?.stamp });
      }
    }
  } finally {
    busy = false;
  }
  if (changed) {
    saveCache();
    refreshPanel();
    mark();
  }
}

function saveCache(): void {
  try {
    const obj = Object.fromEntries(linkedData);
    const txt = JSON.stringify(obj);
    if (txt.length < 2_000_000) localStorage.setItem(CACHE_KEY, txt);
  } catch { /* storage full or blocked */ }
}

function loadCache(): void {
  try {
    const obj = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      try { linkedData.set(k, parsePlotData(JSON.stringify(v))); } catch { /* stale entry */ }
    }
  } catch { /* no cache */ }
}

/* ------------------------------------------------------------------ importing */
function say(m: string): void {
  ed.msg = m;
  mark();
}

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = () => resolve(inp.files?.[0] ?? null);
    inp.click();
  });
}

/** Read a data file into a plot (undoable). */
export async function importInto(o: PlotObj): Promise<void> {
  const f = await pickFile();
  if (!f) return;
  try {
    const d = parsePlotData(await f.text());
    const pre = snap();
    o.data = d;
    commit(pre);
    ui.refreshInspector();
    say('imported ' + f.name + ' into the plot');
  } catch (e) {
    say('could not import ' + f.name + ': ' + (e as Error).message);
  }
}

export function removeImported(o: PlotObj): void {
  const pre = snap();
  delete o.data;
  commit(pre);
  ui.refreshInspector();
  mark();
}

/** A data file dropped on the canvas becomes a new plot there; a deck file opens the deck. */
async function onDrop(e: DragEvent): Promise<void> {
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  e.preventDefault();
  const text = await f.text();
  let d: PlotData;
  try { d = parsePlotData(text); }
  catch { loadDeckText(text, f.name); return; }
  const p = pos(e);
  const w = Math.min(Math.max(12, Math.round(ed.doc.cols * 0.45)), ed.doc.cols);
  const h = Math.min(Math.max(6, Math.round(ed.doc.rows * 0.5)), ed.doc.rows);
  const x = Math.max(0, Math.min(p.x, ed.doc.cols - w));
  const y = Math.max(0, Math.min(p.y, ed.doc.rows - h));
  const pre = snap();
  const s = S();
  s.vec.push({ t: 'plot', x, y, w, h, spec: '// data imported from ' + f.name.replace(/\n/g, ' '), data: d });
  ed.selObj = s.vec.length - 1;
  ed.sel = null;
  ui.setTool('select');
  commit(pre);
  ui.refreshInspector();
  say('new plot from ' + f.name);
}

export function initData(): void {
  loadCache();
  restoreFolder();
  setInterval(() => { if (folder && document.visibilityState === 'visible') refreshAll(); }, 1500);
  // A new or changed `data:` line is picked up at once.
  let lastPaths = '';
  setInterval(() => {
    const p = linkedPaths().join('\n');
    if (p !== lastPaths) { lastPaths = p; refreshAll(); }
  }, 400);
  cv.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  cv.addEventListener('drop', (e) => { onDrop(e); });
}
