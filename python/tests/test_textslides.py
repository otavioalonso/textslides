import json
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pytest  # noqa: E402

import textslides  # noqa: E402


@pytest.fixture(autouse=True)
def _close():
    yield
    plt.close("all")


def kinds(d):
    return [s["kind"] for s in d["series"]]


def test_plot_with_markers_dashes_labels_and_axes():
    fig, ax = plt.subplots()
    ax.plot([1, 2, 3], [1, 4, 9], label="model")
    ax.plot([1, 2, 3], [2, 3, 4], "o--", label="other")
    ax.plot([1, 2], [5, 6], "s", mfc="none")
    ax.set(title="T", xlabel="k", ylabel="P", yscale="log")
    ax.legend()
    d = textslides.to_data(ax)
    assert d["textslides"] == "plot" and d["v"] == 1
    assert (d["title"], d["xlabel"], d["ylabel"], d["yscale"]) == ("T", "k", "P", "log")
    assert "xscale" not in d
    a, b, c = d["series"]
    assert a == {"kind": "line", "x": [1, 2, 3], "y": [1, 4, 9], "color": 0, "label": "model"}
    assert b["color"] == 1 and b["dash"] is True and b["marker"] == "dot" and b["label"] == "other"
    assert c["noline"] is True and c["marker"] == "ring" and c["color"] == 2


def test_labels_only_with_a_legend():
    fig, ax = plt.subplots()
    ax.plot([0, 1], [0, 1], label="x")
    assert "label" not in textslides.to_data(ax)["series"][0]


def test_nan_becomes_null_and_values_are_rounded():
    fig, ax = plt.subplots()
    ax.plot([0, 1, 2], [1 / 3, np.nan, 2])
    s = textslides.to_data(ax)["series"][0]
    assert s["y"] == [0.333333, None, 2]


def test_scatter_and_errorbar():
    fig, ax = plt.subplots()
    ax.scatter([1, 2], [3, 4], label="pts")
    ax.errorbar([1, 2, 3], [1, 2, 3], yerr=[0.1, 0.2, 0.3], fmt="o", color="C1", label="meas")
    ax.errorbar([4, 5], [1, 1], yerr=[0.5, 1], fmt="none", color="k")  # no points: taken as the bars' middles
    ax.legend()
    d = textslides.to_data(ax)
    assert sorted(kinds(d)) == ["line", "line", "scatter"]
    sc = next(s for s in d["series"] if s["kind"] == "scatter")
    assert sc["x"] == [1, 2] and sc["y"] == [3, 4] and sc["marker"] == "dot" and sc["label"] == "pts"
    eb = next(s for s in d["series"] if s.get("label") == "meas")
    assert eb["noline"] is True and eb["marker"] == "dot" and eb["color"] == 1
    assert eb["yerr"] == [[0.1, 0.2, 0.3], [0.1, 0.2, 0.3]]
    only = next(s for s in d["series"] if s["kind"] == "line" and "marker" not in s)
    assert only["y"] == [1, 1] and only["yerr"] == [[0.5, 1], [0.5, 1]] and only["color"] == 3


def test_bars_hist_and_barh():
    fig, ax = plt.subplots()
    ax.bar([1, 2, 3], [4, 5, 6], width=0.5, label="b")
    ax.legend()
    s = textslides.to_data(ax)["series"][0]
    assert s == {"kind": "bar", "x": [1, 2, 3], "height": [4, 5, 6], "width": [0.5, 0.5, 0.5], "color": 0, "label": "b"}
    fig, ax = plt.subplots()
    ax.barh([0, 1], [3, 2], left=[1, 1])
    s = textslides.to_data(ax)["series"][0]
    assert s["horizontal"] is True and s["x"] == [0, 1] and s["height"] == [3, 2] and s["bottom"] == [1, 1]
    fig, ax = plt.subplots()
    ax.hist([1, 1, 2, 3, 3, 3], bins=3, label="h")
    ax.legend()
    s = textslides.to_data(ax)["series"][0]
    assert s["kind"] == "bar" and s["height"] == [2, 1, 3] and s["label"] == "h"


def test_imshow_and_reference_lines():
    fig, ax = plt.subplots()
    z = np.arange(6.0).reshape(2, 3) - 2.5
    ax.imshow(z, cmap="RdBu_r", vmin=-3, vmax=3)
    ax.axhline(0.5, color="k", ls="--")
    ax.axvline(1, color="C1")
    d = textslides.to_data(ax)
    im = next(s for s in d["series"] if s["kind"] == "image")
    assert im["z"] == [[-2.5, -1.5, -0.5], [0.5, 1.5, 2.5]]
    assert im["extent"] == [-0.5, 2.5, 1.5, -0.5] and im["origin"] == "upper"
    assert (im["vmin"], im["vmax"], im["diverging"]) == (-3, 3, True)
    assert {"kind": "hline", "v": 0.5, "color": 3, "dash": True} in d["series"]
    assert {"kind": "vline", "v": 1, "color": 1} in d["series"]
    assert d["ylim"] == [1.5, -0.5]  # imshow flips the y axis; the deck keeps it


def test_large_images_are_averaged_down():
    fig, ax = plt.subplots()
    ax.imshow(np.ones((450, 30)), cmap="viridis")
    im = textslides.to_data(ax)["series"][0]
    assert len(im["z"]) == 150 and len(im["z"][0]) == 30 and "diverging" not in im


def test_unsupported_artists_warn():
    fig, ax = plt.subplots()
    ax.fill_between([0, 1], [0, 1], [1, 2])
    ax.text(0, 0, "hi")
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        d = textslides.to_data(ax)
    assert d["series"] == []
    msgs = " ".join(str(x.message) for x in w)
    assert "not exported" in msgs and "text annotations" in msgs


def test_save_writes_json_atomically_and_accepts_a_figure(tmp_path):
    fig, ax = plt.subplots()
    ax.plot([0, 1], [0, 1])
    out = textslides.save(fig, tmp_path / "sub" / "p.json")
    d = json.loads(open(out).read())
    assert d["series"][0]["kind"] == "line"
    assert not (tmp_path / "sub" / "p.json.tmp").exists()
    fig, (a, b) = plt.subplots(1, 2)
    with pytest.raises(ValueError, match="2 Axes"):
        textslides.save(fig, tmp_path / "x.json")
