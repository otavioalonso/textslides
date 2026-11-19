# CLAUDE.md: textmode-slides

Context for working on this repo. Read this before changing the editor.

## What this is

A web editor for "text-mode" slides: every slide is a fixed character grid (40×25 portrait home-computer look,
80×24 terminal, 120×34), drawn on a canvas. It grew out of a hand-generated deck (see `reference/`), and the
goal is a live, fully working web app for authoring such decks without writing Python.

Design priorities, in order:
1. Editing should feel like asciiflow: direct, grid-snapped, fast, with undo for everything.
2. The grid stays the source of truth. Anything that is not a character (equations, plots) is anchored to cells.
3. Two themes the owner cares about: `modern` (dark grey, orange/blue) and `c64` (purple home computer). Keep both pixel-clean.
   A third, `vt` (green phosphor, from the reference player), is available too.
4. Plain-text export should stay meaningful: a slide should still read as text with no canvas.

## Commands

```sh
npm install          # .npmrc sets legacy-peer-deps (npm 10 crashes on vitest 4's optional peers otherwise)
npm run dev          # Vite dev server
npm run build        # typecheck + static build into dist/
npm test             # vitest unit tests (tests/unit, model only, no DOM)
npm run e2e          # Playwright smoke tests (tests/e2e) against `vite preview` of a fresh build
npm run typecheck    # app (tsconfig.json) and tests (tsconfig.test.json)
cd python && pytest  # matplotlib exporter (needs matplotlib, numpy, pytest)
```

## Code layout

Vite + TypeScript, no framework. KaTeX is an npm dependency, pinned to 0.16.47 (the version the prototype used
from the CDN; equation widths in saved decks were measured with it).

- `src/model/`: pure, DOM-free, unit-tested. Every cell operation takes a `Grid` (`{cols, rows, s: Slide}`)
  explicitly: `grid.ts` (put/clear cells, junction `seg`/`route`/`drawLine`/`drawBox`, extract/paste),
  `equations.ts` (anchor encoding, `eqAt`, `eqClear`, `putEq` with the measured width passed in), `history.ts`
  (snapshot undo stack), `text.ts` (plain-text export, incl. `vecText`), `plot.ts` (spec parser, ticks),
  `heat.ts`, `braille.ts`, `deck.ts` (pages/frames), `clipboard.ts` (copy/paste of cells + objects), `textformat.ts` (the `.tslides` format: `toText`,
  `fromText`, `parseDeck` for either format), `demo.ts`, `types.ts`.
- `src/state.ts`: the one mutable editor state object `ed` (current doc, slide, tool, selection, cell metrics…),
  `S()`/`G()`/`T()` accessors, `mark()` to schedule a render, and `ui`: late-bound UI functions (filled in by
  `main.ts`) so lower layers can ask for a toolbar/inspector refresh without importing the UI.
- `src/editor.ts`: `snap()`, `commit(pre)`, `undo`/`redo`, autosave, `fresh()`.
- `src/render/`: `draw.ts` canvas primitives (`drawMask`, `drawGlyph`, plots), `scene.ts` the main canvas,
  `overlay.ts` KaTeX equation overlay, `katex.ts` rendering + width measurement, `layout.ts` cell sizing.
- `src/tools/`: `pointer.ts` dispatches canvas events to `select.ts`, `draw.ts` (box/line/brush/erase),
  `text.ts`, `plot.ts` (plot and heat tools), `path.ts` (legacy curves); `hit.ts` has hit-testing.
- `src/ui/`: toolbar, inspector, slide list, equation bar, modals, keyboard, status, tool hints.
- `src/hook.ts`: type of `window.ED`, the handle tests use to read the doc and cell size.
- `src/render/slide.ts`: `drawCells` / `drawVecs` / `eqElement`, the slide drawing shared by the editor canvas and
  the player. Change slide rendering there so editor and presentations stay identical.
- `src/player/`: the presentation player (`main.ts`, `style.css`, `types.ts` with the `Presentation` record).
  It must not import editor state, the DOM helpers or KaTeX: `vite.config.ts` bundles it with esbuild into the
  `virtual:player-bundle` string, which exports inline. It reads its deck from `<script id="deck">`.
- `src/export/presentation.ts`: `buildPresentation(doc)` → one HTML string: player JS + CSS, KaTeX CSS with the
  woff2 fonts inlined as data URIs (loaded lazily via `import.meta.glob`, only on present/export), the deck, and
  every equation pre-rendered with `katexHtml`. Embedded text is escaped so it cannot close a `<script>`.
- `src/ui/files.ts`: Ctrl+S / Ctrl+Shift+S / Ctrl+O with the File System Access API (keeps the file handle for the
  session), falling back to download / file chooser. The save and open dialogs also copy / paste either format.
- `src/ui/data.ts`: plot data: the linked data folder (directory picker, handle kept in IndexedDB), polling linked
  files every 1.5 s, import into a plot, drop a data file on the canvas.
- `python/`: `textslides.py` (matplotlib Axes → plot data file, `save(ax, path)`), its pytest tests, `example.py`.
  `tests/unit/fixtures/*.json` are its output for the example, read by the TypeScript tests, so the two sides
  stay in step: regenerate them with `python example.py` when the exporter changes.
- `src/ui/present.ts`: present mode shows that same HTML in a sandboxed (`allow-scripts`) iframe over the editor;
  the player posts `textslides:exit` with its slide index on Esc.

The restructure from the original single-file `index.html` (commit `9008359`) was checked by replaying a 46-step
editing session in both and comparing doc JSON, canvas pixels, overlay and panels after every step (identical
at device pixel ratio 1 and 2).

### Data model (saved as JSON, also in localStorage key `textmode-slide-editor-v2`)

```js
doc = { v: 1, cols: 80, rows: 24, theme: 'modern' | 'c64',
        slides: [ { title?, notes?, frame?, delay?, ch: [...], mk: [...], at: [...], vec: [...] } ] }
        // ch/mk/at: flat arrays, index y*cols+x
```

- `ch[i]` – the character in the cell, `''` for empty. Two special encodings:
  - equation anchor: `'\u0002' + ('D'|'I') + width + ':' + texSource` (display/inline, width in cells)
  - equation continuation: `'\u0001'` for the remaining `width-1` cells
  An equation is one group; clearing or overwriting any cell of it clears the whole group (`eqAt`, `eqClear`).
- `mk[i]` – line-junction bitmask, `U=1 R=2 D=4 L=8`. Box and line tools set bits on both cells of each step,
  and the renderer draws the right junction (┼ ├ ┐ …) from the mask. This is what makes lines join.
  Arrow heads are ordinary characters (▶ ◀ ▲ ▼) drawn over the mask.
- `at[i]` – style: bits 0–1 colour index (normal, bright, accent, dim), bit 2 (`4`) highlighted bar
  (reverse video: cell filled with the colour, glyph in the background colour).
- `vec` – vector objects above the grid, in cell coordinates:
  `{ t: 'plot', x, y, w, h, spec }` where `spec` is a small text format:
  `x: 0 10`, `y: -1 1`, `title:`, `xlabel:`, `ylabel:`, `= expr` (function series, may use `rnd()`/`gauss()`, seeded),
  or rows of `x y` numbers (blank line separates data series).
  `data: path` draws a data file written by `python/textslides.py` from a matplotlib Axes (format in
  `model/plotdata.ts`: line / scatter / bar / image / hline / vline series, labels, log scales, limits); spec lines
  override the file's labels and ranges (`xscale: log`, `legend: off` too). `PlotObj.data` holds imported data
  (stored in the deck); linked files are read by `ui/data.ts` into `linkedData` (not in the deck, cached in
  localStorage) and `parseOf(o)` merges whichever applies. Exports embed linked data.
  `style: braille` makes it a braille plot: series rasterised into braille characters, 2×4 dots per cell
  (`model/braille.ts`), painted as dots and part of the plain text.
  `{ t: 'heat', x, y, w, h, spec }` is a heat map / weaving drawdown (`model/heat.ts`): pixels one cell wide and
  half a cell tall, values −1…1 (positive in the theme's primary plot colour, negative in the secondary).
  Spec: pattern rows of `#` / `.`, rows of numbers (both tiled), or `= expr` in `x, y, u, v`; `//` comments.
  In plain text its negative pixels become half blocks ▀▄█ (`heatText`), only in otherwise empty cells.
  (Older code also has `{ t: 'path', pts, smooth, arrow, dash, attr }`; the curve tool was removed from the UI on
  request but rendering and selection code for paths still exists.)

### Rendering

- Cell size is integer device pixels: `cw` chosen from the viewport, `ch = round(cw * 2.2)`, font size `cw / advance`.
- Box drawing is not done with font glyphs: `drawMask` paints the junction mask as rectangles so lines meet exactly.
  Block elements and shades (█ ▀ ▄ ▌ ▐ ░ ▒ ▓), braille dots and arrow heads are also painted, not typed, for the
  same reason.
- Equations are KaTeX HTML in an overlay `div` (`#ov`), positioned on their cell group. Width in cells is measured
  once from the rendered HTML (`eqCells`), so an equation occupies exactly its rendered width.
- Plots are drawn on the same canvas after the grid (`drawPlotObj`).
- `render()` (in `main.ts`: canvas, overlay, thumbnails, status) is driven by `mark()` → one `requestAnimationFrame`.

### Editing model

- Every operation records a snapshot of the whole doc (`snap()` → JSON) before it starts and `commit(pre)` after,
  which pushes undo only if something changed. Simple, robust, fine at current sizes; may need diffing later.
- Drag tools copy the grid at pointer-down (`cloneGrid`) and redraw from that copy on every move.
- Text tool: typing writes cells; `$` opens the equation bar (`#eqbar` input with live KaTeX preview `#eqprev`).
- Select tool: rectangle selection, drag to move, arrow keys nudge, R toggles bar, 1–4 recolour.
  Clicking an equation selects its whole group; a drag rectangle grows to cover any equation it cuts
  (`expandToEquations`), and pasting over an equation removes it, so groups never split.
- Copy / paste (`model/clipboard.ts`, keys in `ui/keyboard.ts`): Ctrl+C takes the selected object, or the selected
  cells plus every object lying entirely inside them; the clip (`ed.clip`) survives slide changes. Ctrl+V pastes at
  the selection's corner, else where the clip was copied from (so a copy lands in the same place on another
  slide), kept on the slide. Ctrl+X also removes what it copied.
- Slides have optional `title` and `notes` (side panel when nothing is selected).
- Animations: a slide with `frame: true` is the next frame of the slide before it; the head slide's `delay` is the
  ms per frame. `model/deck.ts` (`pages`, `pageOf`, `slideLabelNo`) groups slides into player pages; the slide
  list labels frames 2.1, 2.2… The player loops a page's frames (A play/pause; paused for reduced motion).

## Known limits / bugs to keep in mind

- `$$…$$` display equations can be taller than a row; nothing reserves the rows above and below.
- Plain-text export writes equations back as `$…$` source, which is longer than their cells, so that row loses alignment.
- Downloads do not work inside the claude.ai artifact viewer; they do work when served normally. Saving straight
  to a file needs the File System Access API (Chromium); the file handle is not kept across reloads.
- The text format reads a literal space in a cell back as an empty cell (they draw the same).
- Touch input is untested.
- Linking a data folder needs the File System Access API (Chromium); elsewhere import the data instead.
- Plot specs are JavaScript expressions run with `new Function`, in the editor and in exported files. A deck from
  someone else can run code when opened; treat decks like scripts.
- The player shrinks an equation that renders wider than its cells on a machine with different fonts, but never
  grows one.

## Roadmap (suggested order)

1. ~~Restructure without changing behaviour~~ (done: Vite + TypeScript modules, KaTeX from npm).
2. ~~Tests~~ (done: unit tests for junctions, equation groups, undo, plain text, plots; Playwright smoke tests).
3. ~~Presenter mode / export~~ (done: present mode and self-contained HTML export with the look of
   `reference/player/page.html`; row-by-row reveal, plain-text view, colour toggle). Not ported from the reference
   player: nothing left (notes view N, equations as text E, plot hover read-out and the green `vt` theme were
   added later).
4. ~~More objects~~ (done: heat maps / drawdowns, braille plots, frame animations).
5. ~~Files~~ (done: `.tslides` text format, one file per deck with a section per slide; open/save to disk with
   the File System Access API, download / file chooser elsewhere).

Possible next steps: per-slide files in a folder (directory picker), reserving rows for tall `$$…$$`
equations, aligned plain-text export of equations, touch input, diff-based undo for large decks.

## Conventions

- Keep the grid exact: never let fonts decide where lines or blocks land.
- Every user-visible operation must be undoable in one step.
- When adding a theme colour, add it to every theme (`modern`, `c64`, `vt`).
- Test visually at all three sizes and both themes before calling a UI change done.
- Keep `src/model/` free of DOM and editor state so it stays unit-testable; new grid logic goes there with tests.
- `npm run typecheck && npm test && npm run e2e` before committing.

## Reference folder

Not part of the app; kept as the source of truth for the target look.
- `reference/player/page.html` – the presentation page template (`__DECK__` and `/*KATEXCSS*/` placeholders),
  `lib.py` – the Python grid library (`Scr`, text wrapping, tables, braille curves), `build.py`, `render_tex.js`.
- `reference/thinning-deck/` – the covariance talk generator (`gen_term.py`, `slides.py`, `slides_s.py`).
  Paths inside are absolute from the original machine (`/home/claude/term`); adjust before running.
- `reference/weaving-deck/` – the weaving deck generator, including drafts/drawdowns (`weave.py`).
