"""Example: four ordinary matplotlib plots saved as textslides data files.

    python example.py            # writes results/*.json next to this script

In a deck, a plot with `data: results/spectrum.json` in its spec draws the first one.
"""

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

import textslides  # noqa: E402

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
rng = np.random.default_rng(1)

# A power spectrum: model curves, measurements with error bars, log axes.
k = np.logspace(-2, 0, 40)
model = 2e4 * k / (1 + (k / 0.05) ** 2.5)
fig, ax = plt.subplots()
ax.plot(k, model, label="model")
ax.plot(k, model * 0.6, "--", label="no BAO")
kk = k[::4]
meas = model[::4] * (1 + 0.08 * rng.standard_normal(len(kk)))
ax.errorbar(kk, meas, yerr=0.15 * meas, fmt="o", mfc="none", label="measured")
ax.set(xscale="log", yscale="log", xlabel="k [h/Mpc]", ylabel="P(k)", title="power spectrum")
ax.legend()
textslides.save(ax, os.path.join(out, "spectrum.json"))

# Residuals as a scatter with a reference line.
fig, ax = plt.subplots()
ax.scatter(kk, (meas - model[::4]) / (0.15 * meas), color="C1")
ax.axhline(0, color="k", ls="--")
ax.set(xscale="log", xlabel="k", ylabel="Δ/σ")
textslides.save(ax, os.path.join(out, "residuals.json"))

# A histogram.
fig, ax = plt.subplots()
ax.hist(rng.normal(size=2000), bins=24, label="samples")
ax.bar([3.2], [60], width=0.3, color="C1", label="outlier bin")
ax.set(xlabel="x", ylabel="count")
ax.legend()
textslides.save(ax, os.path.join(out, "histogram.json"))

# A correlation matrix with imshow.
n = 24
i = np.arange(n)
corr = np.exp(-np.abs(i[:, None] - i[None, :]) / 4) * np.cos((i[:, None] - i[None, :]) / 3)
fig, ax = plt.subplots()
ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set(title="correlation")
textslides.save(ax, os.path.join(out, "correlation.json"))
print("wrote", sorted(os.listdir(out)))
