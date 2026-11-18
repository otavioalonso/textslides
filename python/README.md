# textslides (Python)

Saves a matplotlib plot as a data file that a textmode-slides deck draws in its own style and theme colours.

```sh
pip install -e path/to/textslides/python      # or copy textslides.py next to your analysis
```

```python
import matplotlib.pyplot as plt
import textslides

fig, ax = plt.subplots()
ax.plot(k, model, label="model")
ax.errorbar(k, measured, yerr=sigma, fmt="o", mfc="none", label="measured")
ax.set(xscale="log", yscale="log", xlabel="k", ylabel="P(k)")
ax.legend()
textslides.save(ax, "results/spectrum.json")
```

In the editor, put `data: results/spectrum.json` in a plot's spec and link the folder the path is relative to
(**link data folder…** in the plot's side panel). The plot redraws whenever the file changes, so re-running the
analysis updates the slides. Without folder access (Firefox, Safari), use **import file…** or drop the file on the
slide; the data is then stored in the deck.

Exported: `plot`, `scatter`, `bar` / `barh` / `hist`, `imshow`, `errorbar` (vertical), `axhline` / `axvline`, the
title, axis labels, log scales and limits, and labels if the Axes has a legend. Colours follow the colour cycle
(C0 → the theme's primary plot colour, C1 → secondary, C2 → bright, C3 → dim; greys → dim). Anything else
(`fill_between`, `pcolormesh`, text annotations, horizontal error bars, colour-mapped scatter) gives a warning.
Images larger than 200 × 200 are averaged down.

`python example.py` writes four example files to `results/`. Tests: `pytest` (in this folder).
