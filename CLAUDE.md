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
4. Plain-text export should stay meaningful: a slide should still read as text with no canvas.

## Commands

```sh
npm install          # .npmrc sets legacy-peer-deps (npm 10 crashes on vitest 4's optional peers otherwise)
npm run dev          # Vite dev server
npm run build        # typecheck + static build into dist/
npm test             # vitest unit tests (tests/unit, model only, no DOM)
npm run e2e          # Playwright smoke tests (tests/e2e) against `vite preview` of a fresh build
npm run typecheck    # app (tsconfig.json) and tests (tsconfig.test.json)
```

## Code layout

Vite + TypeScript, no framework. KaTeX is an npm dependency, pinned to 0.16.47 (the version the prototype used
from the CDN; equation widths in saved decks were measured with it).

- `src/model/`: pure, DOM-free, unit-tested. Every cell operation takes a `Grid` (`{cols, rows, s: Slide}`)
  explicitly: `grid.ts` (put/clear cells, junction `seg`/`route`/`drawLine`/`drawBox`, extract/paste),
  `equations.ts` (anchor encoding, `eqAt`, `eqClear`, `putEq` with the measured width passed in), `history.ts`
  (snapshot undo stack), `text.ts` (plain-text export), `plot.ts` (spec parser, ticks), `demo.ts`, `types.ts`.
- `src/state.ts`: the one mutable editor state object `ed` (current doc, slide, tool, selection, cell metrics…),
  `S()`/`G()`/`T()` accessors, `mark()` to schedule a render, and `ui`: late-bound UI functions (filled in by
  `main.ts`) so lower layers can ask for a toolbar/inspector refresh without importing the UI.
- `src/editor.ts`: `snap()`, `commit(pre)`, `undo`/`redo`, autosave, `fresh()`.
- `src/render/`: `draw.ts` canvas primitives (`drawMask`, `drawGlyph`, plots), `scene.ts` the main canvas,
  `overlay.ts` KaTeX equation overlay, `katex.ts` rendering + width measurement, `layout.ts` cell sizing.
- `src/tools/`: `pointer.ts` dispatches canvas events to `select.ts`, `draw.ts` (box/line/brush/erase),
  `text.ts`, `plot.ts`, `path.ts` (legacy curves); `hit.ts` has hit-testing.
- `src/ui/`: toolbar, inspector, slide list, equation bar, modals, keyboard, status, tool hints.
- `src/hook.ts`: type of `window.ED`, the handle tests use to read the doc and cell size.

The restructure from the original single-file `index.html` (commit `9008359`) was checked by replaying a 46-step
editing session in both and comparing doc JSON, canvas pixels, overlay and panels after every step (identical
at device pixel ratio 1 and 2).

### Data model (saved as JSON, also in localStorage key `textmode-slide-editor-v2`)

```js
doc = { v: 1, cols: 80, rows: 24, theme: 'modern' | 'c64',
        slides: [ { ch: [...], mk: [...], at: [...], vec: [...] } ] }   // ch/mk/at are flat arrays, index y*cols+x
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
  (Older code also has `{ t: 'path', pts, smooth, arrow, dash, attr }`; the curve tool was removed from the UI on
  request but rendering and selection code for paths still exists.)

### Rendering

- Cell size is integer device pixels: `cw` chosen from the viewport, `ch = round(cw * 2.2)`, font size `cw / advance`.
- Box drawing is not done with font glyphs: `drawMask` paints the junction mask as rectangles so lines meet exactly.
  Block elements and shades (█ ▀ ▄ ▌ ▐ ░ ▒ ▓) and arrow heads are also painted, not typed, for the same reason.
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
  Clicking an equation selects its whole group.

## Known limits / bugs to keep in mind

- Selecting part of an equation with a drag rectangle and moving it can split the group.
- An equation on a highlighted bar is drawn on the normal background (overlay has no bar fill).
- `$$…$$` display equations can be taller than a row; nothing reserves the rows above and below.
- Plain-text export writes equations back as `$…$` source, which is longer than their cells, so that row loses alignment.
- Downloads (`save` → download .json) do not work inside the claude.ai artifact viewer; they do work when served normally.
- Touch input is untested.

## Roadmap (suggested order)

1. ~~Restructure without changing behaviour~~ (done: Vite + TypeScript modules, KaTeX from npm).
2. ~~Tests~~ (done: unit tests for junctions, equation groups, undo, plain text, plots; Playwright smoke tests).
   Still open: `it.todo` for moving part of an equation group.
3. **Presenter mode / export**: play a deck full-screen with the look of `reference/player/page.html`
   (header bar, progress footer, ←/→, theme toggle, plain-text view). Ideally export one self-contained HTML file.
   The player's slide record is `{chars, attrs, title, notes, eqs, plots, frames, heats}` (see `reference/player`).
4. **More objects**: drawdown/heat-map grids (half-block pixels, two colours; see `heat_dd` in
   `reference/weaving-deck/loom_slides.py`), braille line plots as a grid-native alternative to vector plots,
   simple frame animations.
5. **Files**: open/save to disk with the File System Access API, deck as a readable text format
   (one file per slide?) so decks diff well in git.

## Conventions

- Keep the grid exact: never let fonts decide where lines or blocks land.
- Every user-visible operation must be undoable in one step.
- When adding a theme colour, add it to both themes.
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
