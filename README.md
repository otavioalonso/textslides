# textmode-slides

A browser editor for slides made of a character grid (40×25, 80×24, 120×34), in the spirit of asciiflow:
boxes and lines that join automatically, free text, highlighted bars, brush characters, LaTeX that
renders inline and takes only its rendered width, and vector plots anchored to the grid.

## Run

Needs Node 20+.

```sh
npm install
npm run dev        # editor at http://localhost:5173
npm run build      # static site in dist/ (open it from any static file server)
```

Everything, KaTeX included, is bundled; no network needed at runtime. Decks autosave in the browser
(localStorage); **save** / **open** move them in and out as JSON.

**present** (or P) plays the deck full screen from the current slide; Esc returns to the editor on the slide you
were showing. **export** downloads the same presentation as one self-contained HTML file (about 400 KB: player,
deck, pre-rendered equations and KaTeX fonts inlined) that opens from disk with no network. In the player:
← → / Space / PageUp / PageDown to page, Home / End, C to switch colours, T for the plain-text view, F for full
screen; `#3` in the URL opens slide 3.

## Test

```sh
npm test           # unit tests (vitest): junctions, equation groups, undo, plain text, plots
npm run e2e        # browser smoke tests (Playwright; builds first)
npm run typecheck
```

## Keys

| key | action |
|---|---|
| V B L T F E G | select, box, line, text, draw (brush), erase, plot |
| 1–4 | colour: normal, bright, accent, dim |
| R | highlighted bar on the selection (or for the next typed text) |
| $ (text tool) | open the equation bar; Enter or $ to place, $ first for display style |
| Shift / Alt while drawing a line | vertical-first route / arrow head |
| Ctrl+Z, Ctrl+Shift+Z | undo, redo |
| Ctrl+C / X / V | copy, cut, paste a selection |
| P | present (Esc returns) |

## Layout

```
index.html              page markup; the editor is src/main.ts
src/model/              grid, junctions, equations, undo history, plain text, plot specs (pure, no DOM)
src/render/             canvas drawing, KaTeX overlay, layout
src/tools/              one file per tool, plus the pointer dispatcher
src/ui/                 toolbar, inspector, slide list, equation bar, modals, keyboard, present mode
src/player/             the presentation player (bundled separately, inlined into exports)
src/export/             builds the self-contained presentation HTML
tests/unit/             vitest unit tests for src/model
tests/e2e/              Playwright smoke tests against the built app
reference/player/       the presentation page the slides were first built for, plus its Python grid library
reference/*-deck/       two decks generated with that library (examples of the target output)
CLAUDE.md               architecture, data format and roadmap, for working on this with Claude Code
```
