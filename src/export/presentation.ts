/*
 * Build a self-contained presentation: one HTML file with the player script, its CSS, KaTeX's CSS with the
 * fonts inlined (woff2 as data URIs), the deck, and every equation pre-rendered to HTML. No network needed.
 */
import katexCss from 'katex/dist/katex.min.css?raw';
import { eqList } from '../model/equations';
import { plotDataOf } from '../model/plotdata';
import { slideText } from '../model/text';
import type { Doc } from '../model/types';
import playerCss from '../player/style.css?raw';
import { eqKey, type Presentation } from '../player/types';
import { katexHtml } from '../render/katex';

const fontLoaders = import.meta.glob<string>('/node_modules/katex/dist/fonts/*.woff2', { query: '?inline', import: 'default' });

let katexCssInline: Promise<string> | null = null;

/** KaTeX's stylesheet with each @font-face reduced to its woff2 source, inlined. Built once, on first export. */
function inlineKatexCss(): Promise<string> {
  if (!katexCssInline) {
    katexCssInline = (async () => {
      const fonts: Record<string, string> = {};
      await Promise.all(Object.entries(fontLoaders).map(async ([p, load]) => { fonts[p.split('/').pop()!] = await load(); }));
      return katexCss.replace(/src:url\(fonts\/([\w-]+\.woff2)\)[^;}]*/g, (all, name: string) =>
        fonts[name] ? 'src:url(' + fonts[name] + ') format("woff2")' : all);
    })();
  }
  return katexCssInline;
}

/** A short title for the deck: the first non-empty line of the first slide. */
export function deckTitle(doc: Doc): string {
  const s = doc.slides[0];
  if (s && s.title) return s.title;
  const line = s ? slideText({ cols: doc.cols, rows: doc.rows, s }).split('\n').find((l) => l.trim()) : '';
  const t = (line || '').replace(/\$+[^$]*\$+/g, '').replace(/\s+/g, ' ').replace(/\s\d+\s*\/\s*\d+$/, '').trim();
  return t.length > 60 ? t.slice(0, 59) + '…' : t || 'slides';
}

export function presentationData(doc: Doc, opts: { start?: number; embedded?: boolean } = {}): Presentation {
  const eqs: Record<string, string> = {};
  for (const s of doc.slides)
    for (const g of eqList({ cols: doc.cols, rows: doc.rows, s })) eqs[eqKey(g.tex, g.disp)] = katexHtml(g.tex, g.disp);
  // Plots read linked data files in the editor; a presentation carries the data itself.
  const withData: Doc = {
    ...doc,
    slides: doc.slides.map((s) => ({
      ...s,
      vec: s.vec.map((o) => (o.t === 'plot' && !o.data && plotDataOf(o) ? { ...o, data: plotDataOf(o)! } : o)),
    })),
  };
  return { title: deckTitle(doc), doc: withData, eqs, start: opts.start, embedded: opts.embedded };
}

/** Escape text so it cannot close the <script> or <style> element it is embedded in. */
function safeInline(s: string): string {
  return s.replace(/<\/(script|style)/gi, '<\\/$1');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function buildPresentation(doc: Doc, opts: { start?: number; embedded?: boolean } = {}): Promise<string> {
  const [{ default: playerJs }, kcss] = await Promise.all([import('virtual:player-bundle'), inlineKatexCss()]);
  const data = presentationData(doc, opts);
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<meta name="generator" content="textmode-slides">\n' +
    '<title>' + escapeHtml(data.title) + '</title>\n' +
    '<style>' + safeInline(kcss) + '</style>\n<style>' + safeInline(playerCss) + '</style>\n</head>\n<body>\n' +
    '<script id="deck" type="application/json">' + json + '</script>\n' +
    '<script>' + safeInline(playerJs) + '</script>\n</body>\n</html>\n';
}
