# textmode-slides

A browser editor for slides made of a character grid (40×25, 80×24, 120×34), in the spirit of asciiflow:
boxes and lines that join automatically, free text, highlighted bars, brush characters, LaTeX that
renders inline and takes only its rendered width, vector or braille plots and heat maps / weaving drawdowns
anchored to the grid, and frame animations.

Live: https://otavioalonso.github.io/textslides/ (deployed by `.github/workflows/pages.yml` on every push to the
default branch).

## Run

Needs Node 20+.

```sh
npm install
npm run dev        # editor at http://localhost:5173
npm run build      # static site in dist/ (open it from any static file server)
```

Everything, KaTeX included, is bundled; no network needed at runtime. Decks autosave in the browser
(localStorage). **Ctrl+S** saves the deck to a file on disk and later saves go to the same file
(**Ctrl+Shift+S** saves as); **Ctrl+O** opens one. In browsers without the File System Access API, saving
downloads the file instead. Files use the `.tslides` text format: each slide is written as the text you see,
with optional colour, line, equation and object layers below it, so decks read well and diff well in git.
`.json` decks open and save too.

**present** (or P) plays the deck full screen from the current slide; Esc returns to the editor on the slide you
were showing. **export** downloads the same presentation as one self-contained HTML file (about 400 KB: player,
deck, pre-rendered equations and KaTeX fonts inlined) that opens from disk with no network. In the player:
← → / Space / PageUp / PageDown to page, Home / End, C to switch colours (modern, purple, green), T for the
plain-text view, N for speaker notes, E to show equations as their LaTeX source, F for full screen, A to
play/pause an animation; hovering a plot shows its values; `#3` in the URL opens slide 3.

Animations: copy a slide, change it, and tick "animation frame of the previous slide" in the side panel. The player
shows the run of frames as one page and loops it (ms per frame is set on the first slide).

## Plots from your analysis

Make the plot with matplotlib as usual and save it with the helper in `python/`:
`textslides.save(ax, "results/spectrum.json")`. In the deck, a plot whose spec says `data: results/spectrum.json`
draws it in the deck's style and theme colours (lines, markers, error bars, bars, histograms, `imshow`, reference
lines, log axes, legend). Link the folder once (**link data folder…** in the plot's side panel) and the plot
redraws whenever the analysis rewrites the file. You can also drop a data file on a slide, or **import** it, to
store the data in the deck. Presentations and exports always carry the data. See `python/README.md`.

## Test

```sh
npm test           # unit tests (vitest): junctions, equation groups, undo, plain text, plots
npm run e2e        # browser smoke tests (Playwright; builds first)
npm run typecheck
cd python && pytest   # the matplotlib exporter
```

## Keys

| key | action |
|---|---|
| V B L T F E G H | select, box, line, text, draw (brush), erase, plot, heat map |
| 1–4 | colour: normal, bright, accent, dim |
| R | highlighted bar on the selection (or for the next typed text) |
| $ (text tool) | open the equation bar; Enter or $ to place, $ first for display style |
| Shift / Alt while drawing a line | vertical-first route / arrow head |
| Ctrl+Z, Ctrl+Shift+Z | undo, redo |
| Ctrl+C / X / V | copy, cut, paste the selected cells (with the plots inside them) or the selected object; paste works on any slide, in the same place or at the selection |
| Ctrl+S, Ctrl+Shift+S, Ctrl+O | save, save as, open |
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
