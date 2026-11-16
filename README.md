# textmode-slides

A browser editor for slides made of a character grid (40×25, 80×24, 120×34), in the spirit of asciiflow:
boxes and lines that join automatically, free text, highlighted bars, brush characters, LaTeX that
renders inline and takes only its rendered width, and vector plots anchored to the grid.

## Run

It's a single static page. Serve the folder and open it:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

KaTeX loads from jsDelivr, so the first load needs network. Decks autosave in the browser (localStorage);
**save** / **open** move them in and out as JSON.

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

## Layout

```
index.html              the editor (all code inline, no build step yet)
reference/player/       the presentation page the slides were first built for, plus its Python grid library
reference/*-deck/       two decks generated with that library (examples of the target output)
CLAUDE.md               architecture, data format and roadmap, for working on this with Claude Code
```
