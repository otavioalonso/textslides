"""Export matplotlib plots as textslides plot data.

Keep your matplotlib code as it is and save the Axes at the end:

    import matplotlib.pyplot as plt
    import textslides

    fig, ax = plt.subplots()
    ax.plot(k, model, label="model")
    ax.errorbar(k, measured, yerr=sigma, fmt="o", label="measured")
    ax.set_yscale("log")
    ax.set_xlabel("k")
    ax.legend()
    textslides.save(ax, "results/power.json")

In the deck, a plot whose spec has the line `data: results/power.json` draws that file in the deck's own style and
theme colours, and redraws whenever the file changes (once the data folder is linked in the editor).

What is exported: plot (lines, markers, dashes), scatter, bar / barh / hist, imshow, errorbar (vertical error
bars), axhline / axvline, the title, axis labels, log scales and limits, and the labels if the Axes has a legend.
Colours follow matplotlib's colour cycle: C0 becomes the theme's primary plot colour, C1 the secondary, C2 bright,
C3 dim; greys and black become the dim colour. Things that are not exported are listed in the warnings
(e.g. fill_between, pcolormesh, text annotations, horizontal error bars).
"""

from __future__ import annotations

import json
import math
import os
import warnings
from typing import Any

import numpy as np

__all__ = ["save", "to_data"]
__version__ = "1"

_DIVERGING = {
    "RdBu", "coolwarm", "bwr", "seismic", "PuOr", "PiYG", "PRGn", "BrBG", "RdGy", "RdYlBu", "RdYlGn",
    "Spectral", "vlag", "icefire", "berlin", "managua", "vanimo",
}
_MAX_IMAGE = 200  # images larger than this (per side) are averaged down, to keep data files small


def save(ax_or_fig: Any, path: str | os.PathLike) -> str:
    """Write the plot in `ax_or_fig` (an Axes, or a Figure with one Axes) as a textslides data file."""
    data = to_data(ax_or_fig)
    path = os.fspath(path)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), allow_nan=False)
    os.replace(tmp, path)  # atomic, so the editor never reads a half-written file
    return path


def to_data(ax_or_fig: Any) -> dict:
    """The plot data as a dict (what `save` writes)."""
    ax = _axes(ax_or_fig)
    colours = _Colours()
    series: list[dict] = []

    err_lines: dict[int, Any] = {}  # id(data line) -> ErrorbarContainer
    skip: set[int] = set()  # artists that belong to a container and are exported with it
    from matplotlib.container import BarContainer, ErrorbarContainer

    for c in ax.containers:
        if isinstance(c, ErrorbarContainer):
            data_line, caplines, barlinecols = c.lines
            for a in caplines:
                skip.add(id(a))
            for a in barlinecols:
                skip.add(id(a))
            if data_line is not None:
                err_lines[id(data_line)] = c
            else:  # fmt="none": error bars only
                s = _errorbar_only(c, colours)
                if s:
                    series.append(s)

    for line in ax.get_lines():
        if id(line) in skip or not line.get_visible():
            continue
        s = _line(ax, line, colours, err_lines.get(id(line)))
        if s:
            series.append(s)

    for coll in ax.collections:
        if id(coll) in skip or not coll.get_visible():
            continue
        s = _scatter(coll, colours)
        if s:
            series.append(s)
        else:
            warnings.warn(f"textslides: {type(coll).__name__} (e.g. fill_between, pcolormesh) is not exported", stacklevel=2)

    for c in ax.containers:
        if isinstance(c, BarContainer):
            s = _bars(c, colours)
            if s:
                series.append(s)

    for im in ax.images:
        if im.get_visible():
            s = _image(im)
            if s:
                series.append(s)

    if ax.texts:
        warnings.warn("textslides: text annotations are not exported; add them as text on the slide", stacklevel=2)

    if ax.get_legend() is None:
        for s in series:
            s.pop("label", None)

    out: dict[str, Any] = {"textslides": "plot", "v": 1}
    for key, value in (("title", ax.get_title()), ("xlabel", ax.get_xlabel()), ("ylabel", ax.get_ylabel())):
        if value:
            out[key] = value
    for key, value in (("xscale", ax.get_xscale()), ("yscale", ax.get_yscale())):
        if value in ("log", "symlog"):
            out[key] = "log"
    out["xlim"] = [_num(v) for v in ax.get_xlim()]
    out["ylim"] = [_num(v) for v in ax.get_ylim()]
    out["series"] = series
    return out


# ---------------------------------------------------------------------------------------------------------- helpers


def _axes(obj: Any) -> Any:
    if hasattr(obj, "get_lines"):
        return obj
    axes = getattr(obj, "axes", None)
    if axes is not None and not hasattr(obj, "get_lines"):
        axes = [a for a in axes if a.get_visible()]
        if len(axes) == 1:
            return axes[0]
        raise ValueError(f"the figure has {len(axes)} Axes; pass the one to export, e.g. textslides.save(ax, ...)")
    raise TypeError("expected a matplotlib Axes or Figure")


def _num(v: Any) -> float | None:
    """A JSON-safe float with 6 significant digits, None for NaN / inf / masked."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(f):
        return None
    return float(f"{f:.6g}")


def _nums(a: Any) -> list[float | None]:
    arr = np.ma.masked_invalid(np.ma.asarray(a, dtype=float)).ravel()
    return [None if m else _num(v) for v, m in zip(arr.data, np.ma.getmaskarray(arr))]


class _Colours:
    """Map matplotlib colours to theme colour indices: the colour cycle by position, greys to dim (3)."""

    def __init__(self) -> None:
        import matplotlib as mpl
        from matplotlib.colors import to_hex

        self.to_hex = to_hex
        cycle = mpl.rcParams["axes.prop_cycle"].by_key().get("color", [])
        self.cycle = [to_hex(c) for c in cycle]
        self.extra: dict[str, int] = {}

    def __call__(self, c: Any) -> int | None:
        try:
            if not isinstance(c, str):
                arr = np.asarray(c, dtype=float)
                c = arr[0] if arr.ndim == 2 else arr  # a colour array (scatter, bars): its first colour
            h = self.to_hex(c)
        except (ValueError, TypeError, IndexError):
            return None
        if h in self.cycle:
            return self.cycle.index(h)
        r, g, b = (int(h[i : i + 2], 16) for i in (1, 3, 5))
        if max(r, g, b) - min(r, g, b) < 24:  # black, grey, white
            return 3
        if h not in self.extra:
            self.extra[h] = len(self.extra) % 4
        return self.extra[h]


def _marker(marker: Any, facecolor: Any) -> str | None:
    if marker in (None, "None", "none", "", " ") or marker == ",":
        return None
    try:
        filled = np.asarray(facecolor, dtype=float).ravel()
        if filled.size >= 4 and filled[3] == 0:
            return "ring"
    except (TypeError, ValueError):
        if isinstance(facecolor, str) and facecolor.lower() == "none":
            return "ring"
    return "dot"


def _label(artist: Any) -> str | None:
    lab = artist.get_label()
    return lab if lab and not lab.startswith("_") else None


def _clean(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None and v is not False}


def _line(ax: Any, line: Any, colours: _Colours, err: Any) -> dict | None:
    x = line.get_xdata(orig=False)
    y = line.get_ydata(orig=False)
    tr = line.get_transform()
    try:
        in_data_x, in_data_y = tr.contains_branch_seperately(ax.transData)
    except (AttributeError, ValueError):
        in_data_x = in_data_y = True
    colour = colours(line.get_color())
    dash = line.get_linestyle() in ("--", ":", "-.", "dashed", "dotted", "dashdot")
    if not in_data_x and in_data_y:  # axhline
        return _clean({"kind": "hline", "v": _num(np.asarray(y, dtype=float)[0]), "color": colour, "dash": dash})
    if in_data_x and not in_data_y:  # axvline
        return _clean({"kind": "vline", "v": _num(np.asarray(x, dtype=float)[0]), "color": colour, "dash": dash})
    if not (in_data_x and in_data_y):
        return None
    noline = line.get_linestyle() in ("None", "none", "", " ")
    s = {
        "kind": "line", "x": _nums(x), "y": _nums(y), "color": colour, "label": _label(err or line),
        "dash": dash and not noline, "marker": _marker(line.get_marker(), line.get_markerfacecolor()), "noline": noline,
    }
    if err is not None:
        s["yerr"] = _yerr(err, np.asarray(y, dtype=float))
    return _clean(s)


def _yerr(container: Any, y: np.ndarray) -> list[list[float]] | None:
    """Distances below and above each point, from the error bar segments (vertical ones only)."""
    if not getattr(container, "has_yerr", True):
        return None
    if getattr(container, "has_xerr", False):
        warnings.warn("textslides: horizontal error bars are not exported", stacklevel=4)
    cols = container.lines[2]
    segs = cols[-1].get_segments() if cols else []
    if len(segs) != len(y):
        return None
    lo = [_num(y[i] - min(s[0][1], s[1][1])) or 0.0 for i, s in enumerate(segs)]
    hi = [_num(max(s[0][1], s[1][1]) - y[i]) or 0.0 for i, s in enumerate(segs)]
    return [lo, hi]


def _errorbar_only(container: Any, colours: _Colours) -> dict | None:
    """errorbar(fmt="none"): matplotlib keeps only the bar segments, so each point is taken as its bar's middle
    (exact for symmetric errors)."""
    cols = container.lines[2]
    if not cols:
        return None
    segs = cols[-1].get_segments()
    x = [s[0][0] for s in segs]
    y = [(s[0][1] + s[1][1]) / 2 for s in segs]
    s = {
        "kind": "line", "x": _nums(x), "y": _nums(y), "noline": True, "label": _label(container),
        "color": colours(cols[-1].get_color()[0]) if len(cols[-1].get_color()) else None,
        "yerr": [[_num(yy - min(s[0][1], s[1][1])) or 0.0 for yy, s in zip(y, segs)],
                 [_num(max(s[0][1], s[1][1]) - yy) or 0.0 for yy, s in zip(y, segs)]],
    }
    return _clean(s)


def _scatter(coll: Any, colours: _Colours) -> dict | None:
    if type(coll).__name__ != "PathCollection":
        return None
    off = np.asarray(coll.get_offsets(), dtype=float)
    if off.ndim != 2 or off.shape[1] != 2 or not len(off):
        return None
    fc = coll.get_facecolor()
    ec = coll.get_edgecolor()
    if coll.get_array() is not None:
        warnings.warn("textslides: scatter colours mapped from values are exported in one colour", stacklevel=3)
    ring = len(fc) == 0 or (np.asarray(fc).ndim == 2 and np.all(np.asarray(fc)[:, 3] == 0))
    base = ec[0] if ring and len(ec) else (fc[0] if len(fc) else None)
    return _clean({
        "kind": "scatter", "x": _nums(off[:, 0]), "y": _nums(off[:, 1]), "color": colours(base) if base is not None else None,
        "label": _label(coll), "marker": "ring" if ring else "dot",
    })


def _bars(container: Any, colours: _Colours) -> dict | None:
    patches = [p for p in container.patches if p.get_visible()]
    if not patches:
        return None
    horizontal = getattr(container, "orientation", "vertical") == "horizontal"
    x, w, h, b = [], [], [], []
    for p in patches:
        px, py, pw, ph = p.get_x(), p.get_y(), p.get_width(), p.get_height()
        if horizontal:
            x.append(py + ph / 2); w.append(ph); b.append(px); h.append(pw)
        else:
            x.append(px + pw / 2); w.append(pw); b.append(py); h.append(ph)
    s = {
        "kind": "bar", "x": _nums(x), "height": _nums(h), "width": _nums(w), "horizontal": horizontal,
        "color": colours(patches[0].get_facecolor()), "label": _label(container) or _label(patches[0]),  # hist labels a patch
    }
    if any(v != 0 for v in b):
        s["bottom"] = _nums(b)
    return _clean(s)


def _image(im: Any) -> dict | None:
    z = np.ma.asarray(im.get_array(), dtype=float)
    if z.ndim != 2:
        warnings.warn("textslides: RGB(A) images are not exported, only 2-D arrays with a colour map", stacklevel=3)
        return None
    z = np.ma.masked_invalid(z)
    rows, cols = z.shape
    fy = max(1, math.ceil(rows / _MAX_IMAGE))
    fx = max(1, math.ceil(cols / _MAX_IMAGE))
    if fy > 1 or fx > 1:  # average blocks, ignoring masked values
        r2, c2 = rows // fy * fy, cols // fx * fx
        z = z[:r2, :c2].reshape(r2 // fy, fy, c2 // fx, fx).mean(axis=(1, 3))
    vmin, vmax = im.get_clim()
    name = im.get_cmap().name
    diverging = name.removesuffix("_r") in _DIVERGING
    mask = np.ma.getmaskarray(z)
    grid = [[None if mask[i, j] else _num(z.data[i, j]) for j in range(z.shape[1])] for i in range(z.shape[0])]
    left, right, bottom, top = im.get_extent()
    return _clean({
        "kind": "image", "z": grid, "extent": [_num(left), _num(right), _num(bottom), _num(top)],
        "origin": "lower" if im.origin == "lower" else "upper", "vmin": _num(vmin), "vmax": _num(vmax), "diverging": diverging,
    })
