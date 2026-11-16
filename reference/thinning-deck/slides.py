"""The 15 slides, laid out on character grids at three sizes: s 40x25, m 80x24, l 120x34."""
import random
from lib import *

N = 22
TITLES = [  # (header, sidebar, small header)
    ("CONNECTED SHOT-NOISE COVARIANCE", "Cover", "SHOT-NOISE COVARIANCE"),
    ("WHERE DISCRETENESS ENTERS THE COVARIANCE", "Where it enters", "WHERE IT ENTERS"),
    ("THINNING RESCALES EACH TERM BY A KNOWN FACTOR", "Thinning rescales", "THINNING RESCALES"),
    ("HOW EACH TERM SCALES WITH THE THINNING", "Scaling plot", "SCALING"),
    ("THE ESTIMATOR IS A SUM OVER PAIRS OF OBJECTS", "Sum over pairs", "SUM OVER PAIRS"),
    ("THINNING IS A RANDOM REWEIGHTING OF GALAXIES", "Random reweighting", "RANDOM REWEIGHTING"),
    ("THE COVARIANCE OVER THE THINNING, IN CLOSED FORM", "Closed form", "CLOSED FORM"),
    ("EACH SUM HOLDS A GAUSSIAN AND A CONNECTED PART", "Gaussian / connected", "GAUSSIAN / CONNECTED"),
    ("THE RANDOMS REMOVE THE GAUSSIAN PART", "Randoms cancel Gauss", "RANDOMS"),
    ("RESULT: TWO SUMS OVER THE CATALOG", "Result", "RESULT"),
    ("WHAT THE CONNECTED TERMS DO TO THE CORRELATION MATRIX", "Correlation matrix", "CORRELATION"),
    ("HIGHER MULTIPOLES: SYMMETRIZE THE KERNEL", "Higher multipoles", "MULTIPOLES"),
    ("EVALUATION: A FEW FFTS PER SHELL", "On a mesh", "ON A MESH"),
    ("TEST 1: CLOSED FORM VS 40,000 THINNINGS", "Closed form vs MC", "TEST 1"),
    ("TEST 2: CONNECTED TERMS VS THE TRUTH", "Connected vs truth", "TEST 2"),
    ("TEST 2 AS A PLOT: ESTIMATOR VS TRUTH BY SHELL", "Test 2 as a plot", "TEST 2 PLOT"),
    ("TEST 3: AN UNCLUSTERED CATALOG GIVES ZERO", "Poisson null", "TEST 3"),
    ("LIMITS: WHAT THE TOY TEST DOES NOT COVER", "Limits", "LIMITS"),
    ("THE SAME CURVE AT THREE TEXT DENSITIES", "Text density", "TEXT DENSITY"),
    ("SYNTHETIC SPECTRA: EIGHT NOISY MOCKS AND THEIR MEAN", "Noisy spectra", "NOISY SPECTRA"),
    ("THE SAME SPECTRA IN PURE TEXT: BRAILLE CHARACTERS", "Noisy, text only", "NOISY, TEXT ONLY"),
    ("ANIMATION: THINNING A CATALOG", "Animation", "ANIMATION"),
]
GROUPS = [("INTRO", [0]), ("IDEA", [1, 2, 3]), ("DERIVATION", [4, 5, 6, 7, 8, 9, 10]),
          ("GENERAL", [11, 12]), ("TESTS", [13, 14, 15, 16]), ("LIMITS", [17]), ("PLAYGROUND", [18, 19, 20, 21])]

NOTES = [
    "",
    "The estimator with the realized shot noise subtracted is a sum over distinct pairs. A product of two such sums can share zero, one or two galaxies. Terms with three or four shared galaxies do not exist.",
    "Keep each galaxy with probability p and multiply the survivors' weights by 1/p. A coincidence of two factors of one galaxy gains 1/p, two coincidences gain 1/p². Terms with four distinct galaxies do not change.",
    "Plotted against a = 1/p − 1 and normalized to the unthinned value: C^T stays flat, C^B grows linearly in (1 + a), C^P quadratically. Each curve is the closed-form factor itself; nothing here is measured.",
    "Galaxies and randoms form one set of objects with charges +1 and −α. The shell average of |F|², minus the realized shot noise, is a sum over distinct pairs weighted by the shell kernel. The rest is bookkeeping on that sum.",
    "A thinned weight is the original times (1+η), with η of zero mean and variance a. The linear part collects into u_i(g), the response of the estimator to one galaxy's weight. The quadratic part is a sum over pairs.",
    "The η are independent with zero mean, so a product in which some galaxy appears once averages to zero. Linear × linear keeps the same galaxy (factor a), quadratic × quadratic keeps the same pair (factor a²).",
    "Averaged over catalogs, the triplet sum holds the two-point function of the partners plus the three-point function, and the pair sum holds 1 + ξ. The first piece of each is a Gaussian term you already have.",
    "The randoms share the window but have no clustering, so the same sums on them reproduce the trivial parts. In Δ the central object becomes the overdensity. Finite-randoms terms cancel in expectation.",
    "The average is over catalogs; one catalog gives an unbiased but noisy estimate. The −2 D^conn removes the triplets whose two partners are the same galaxy: the linear part of (1+a)².",
    "Illustrative, with made-up numbers: three multipoles, four k bins each. The Gaussian covariance is nearly diagonal, with some coupling between multipoles at the same k. The connected shot-noise terms add a broad floor to the off-diagonal elements, with the sign of the coupling. Orange is positive, blue negative. Not a result.",
    "Only the kernel changes. It is real for even ℓ and symmetrized, so the factor 2 in u and in D stays valid. On a finite grid the ℓ > 0 self-term is not exactly zero, so subtract it.",
    "In configuration space the pair sum is one sum of weighted pair counts against the product of the two shell kernels: no double sum over modes. For ℓ > 0 the weights carry Y_ℓm of the line of sight.",
    "One lognormal catalog on a 16³ lattice with a window, weights and randoms (α = 0.1). The thinned estimator must subtract the thinned shot noise Σ w²/p²; getting that wrong biases it by hundreds of σ.",
    "3,000 lognormal mocks in the same window. The reference is the same sums computed from the continuous density field, which has no shot noise: an independent check of the self-terms, the factor 2 and the random subtraction.",
    "Same numbers as the bar chart, now against shell on a log axis, with the relative difference below. Hover a shell, or touch it, to read the values. The residuals come from the rounded values on the previous slide.",
    "The cleanest check of the random subtraction with a window: the unsubtracted sums are large because of the Gaussian shot-noise terms, and the subtraction removes them completely.",
    "The random-based route and a model-based Gaussian subtraction agree in expectation if the Gaussian model uses the same weights, normalization and Poisson shot noise.",
    "The same two curves drawn with one marker per column, with half-block characters (1×2 pixels per cell) and with braille characters (2×4 pixels per cell). Braille gives eight times the resolution of a cell.",
    "Synthetic data from a fixed seed, not a result: a smooth spectrum with a damped oscillation, and correlated noise that shrinks with k, drawn eight times. It is here to show how wiggly lines look in vector form.",
    "The same data as the previous slide, drawn only with braille characters: the data are averaged to one point per dot column and joined with lines at 2×4 dots per cell. With all eight mocks the lines merge into a band, so this slide draws three of them: wiggles of about one cell stay readable, finer ones turn into stipple.",
    "Each galaxy keeps a fixed random number and survives while it is below p, so thinning is nested. The bars are the closed-form factors for the three terms at that p: 1, (1+a) and (1+a)², with a = 1/p − 1. The loop sweeps p from 1 down to 0.15 and back.",
]


class Ctx:
    pass


TEX = False


def EQ(C, y, tex, ascii_lines, h=2, x=None, w=None, col='b', tex_s=None):
    """An equation: LaTeX region (h rows) in TeX mode, character art otherwise."""
    s = C.s
    x = C.x if x is None else x
    w = C.w if w is None else w
    if TEX:
        s.eqs.append(dict(x=x, y=y, w=w, h=h, tex=(tex_s if (C.S and tex_s) else tex), col=col))
        return y + h
    return block(s, x, w, y, ascii_lines)


def make(size):
    c = Ctx()
    c.size = size
    c.eqs = None
    c.L, c.S = size == 'l', size == 's'
    if size == 's':
        c.s, c.x, c.y, c.w, c.h = Scr(40, 25), 2, 2, 36, 21
    elif size == 'm':
        c.s, c.x, c.y, c.w, c.h = Scr(80, 24), 2, 2, 76, 20
    else:
        c.s, c.x, c.y, c.w, c.h = Scr(120, 34), 28, 2, 90, 25
    c.s.eqs = []
    c.s.plots = []
    c.s.heats = []
    c.s.frames = []
    return c


def block(s, x0, W, y, lines, a='n'):
    w = max(vlen(l) for l in lines)
    x = x0 + (W - w) // 2
    for k, l in enumerate(lines):
        s.put(x, y + k, l, a)
    return y + len(lines)


def defs(s, x, y, w, items, lw):
    for lab, txt in items:
        s.put(x, y, lab, 'b')
        y = s.wrap(x + lw, y, w - lw, txt, 'n')
    return y


# ============================================================ m / l slides
def cover(C):
    s, W = C.s, C.s.w
    if C.size == 'l':
        font, sx, gap, ty, by, sy, fy, fh, py, subw, nd = F5, 2, 2, 3, 7, 14, 19, 11, 32, 84, 46
    elif C.size == 'm':
        font, sx, gap, ty, by, sy, fy, fh, py, subw, nd = F5, 1, 1, 2, 5, 11, 15, 6, 22, 60, 22
    else:
        font, sx, gap, ty, by, sy, fy, fh, py, subw, nd = F3, 1, 1, 3, 7, 14, 17, 5, 23, 34, 11
    s.cput(ty, "§CONNECTED SHOT-NOISE COVARIANCE§" if not C.S else "§SHOT-NOISE COVARIANCE§")
    s.cput(ty + 1, "from a closed-form thinning covariance", 'n')
    rows = banner('THINNING', font, sx, gap)
    bw = max(len(r) for r in rows)
    for r, line in enumerate(rows):
        s.put((W - bw) // 2, by + r, line, 'b')
    s.wrap((W - subw) // 2, sy, subw,
           "The bispectrum and power-spectrum discreteness terms of the covariance, measured on the catalog itself, with the Gaussian part removed by the randoms."
           if not C.S else "bispectrum and power-spectrum terms, from the catalog itself", 'n', align='c')
    dot_field(s, 2, fy, W - 4, fh, nd, 5)
    s.cput(py, "¦press ► for the next screen¦")
    s.cur = (W // 2 + 15 if not C.S else W // 2 + 13, py)


def sl_coinc(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    y = s.wrap(x0, y0, W, "The covariance multiplies two pair sums, one per shell. Its terms are sorted by how many galaxies the two pairs share.")
    gp = 2
    bw = (W - 2 * gp) // 3
    bh = 16 if C.L else 12
    by = y + (2 if C.L else 1)
    specs = [
        ("NO GALAXY SHARED", ["(1)──(2)  (3)══(4)"], "trispectrum and super-sample terms, plus the Gaussian pairings", "thinning: unchanged"),
        ("ONE GALAXY SHARED", ["(2)──(1)══(3)"], "bispectrum term C^B, scaling as 1/nbar", "thinning: (1+a)"),
        ("TWO GALAXIES SHARED", ["(1)───(2)", " └═════┘"], "power-spectrum term C^P, scaling as 1/nbar²", "thinning: (1+a)²"),
    ]
    for k, (ttl, dg, txt, th) in enumerate(specs):
        bx = x0 + k * (bw + gp)
        s.box(bx, by, bw, bh, 's', 'd')
        s.cput(by + 1, ttl, 'b', bx, bw)
        dw = max(len(l) for l in dg)
        for r, l in enumerate(dg):
            s.put(bx + (bw - dw) // 2, by + 3 + r, l, 'n')
        s.wrap(bx + 2, by + 6, bw - 4, txt, 'n')
        s.cput(by + bh - 2, th, 'a', bx, bw)
    s.cput(by + bh + 1, "── pair in shell i          ══ pair in shell j", 'd', x0, W)
    s.wrap(x0, by + bh + 3, W, "Self-pairs are subtracted (realized shot noise), so two pair sums can never share more than two galaxies.", 'b')


def sl_scale(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "Keep each galaxy with probability p and give the survivors weight 1/p, so that `a = 1/p − 1`.")
    y += g
    n = 34 if C.L else 24
    rnd = random.Random(7)
    s.put(x0, y, "full", 'd')
    s.put(x0, y + 1, "thinned", 'd')
    for k in range(n):
        s.set(x0 + 9 + 2 * k, y, '●', 'b')
        kept = rnd.random() < 0.5
        s.set(x0 + 9 + 2 * k, y + 1, '●' if kept else '○', 'b' if kept else 'd')
    s.put(x0 + 9, y + 2, "● kept, weight × 1/p        ○ removed", 'd')
    y += 3 + g
    widths = [22, 17, 20] if C.L else [20, 17, 18]
    rows = [["term", "shared galaxies", "after thinning"],
            ["C^T  no coincidence", "0", "unchanged"],
            ["C^B  bispectrum", "1", "(1+a)  C^B"],
            ["C^P  power spectrum", "2", "(1+a)²  C^P"]]
    tw = table_width(widths)
    y = s.table(x0 + (W - tw) // 2, y, widths, rows, aligns='lcl')
    s.wrap(x0, y + g, W, "What remains in the difference between the thinned and the full covariance is a discreteness term.", 'b')


def xticks(s, ax, y, cols, labels_p, xmax=4):
    for a_, lab in labels_p:
        cx = ax + round(a_ / xmax * (cols - 1))
        s.set(cx, y, '┬', 'd')
        s.put(cx - len(lab) // 2, y + 1, lab, 'd')


def sl_scaling(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    ymax = 25
    f_p = lambda a_: (1 + a_) ** 2
    f_b = lambda a_: 1 + a_
    f_t = lambda a_: 1.0
    curves = [(f_t, 'n'), (f_b, 'a'), (f_p, 'b')]
    if C.L:
        cols, rows, lead = 60, 17, 7
    elif C.size == 'm':
        cols, rows, lead = 46, 10, 7
    else:
        cols, rows, lead = 26, 8, 4
    y = s.wrap(x0, y0, W, "Each term of the covariance after thinning, relative to its unthinned value, against a = 1/p − 1:")
    y += 1
    ax = x0 + lead + 1
    for r in range(rows):
        s.set(ax - 1, y + r, '│', 'd')
    s.set(ax - 1, y + rows, '└', 'd')
    s.hline(ax, y + rows, cols + 1)
    ticks = (0, 5, 10, 15, 20, 25) if rows >= 10 else (0, 10, 20)
    for v in ticks:
        rr = rows - 1 - round(v / ymax * (rows - 1))
        s.put(ax - 2 - len(str(v)), y + rr, str(v), 'd')
        s.set(ax - 1, y + rr, '┤', 'd')
    curve_plot(s, ax, y, cols, rows, curves, 4, ymax, 'braille')
    s.plots.append(dict(x=ax, y=y, w=cols, h=rows, xmax=4, ymax=ymax,
                        curves=[dict(at=at, pts=[[4 * k / 200, f(4 * k / 200)] for k in range(201)]) for f, at in curves]))
    xticks(s, ax, y + rows, cols, [(0, "1"), (1, "1/2"), (2, "1/3"), (3, "1/4"), (4, "1/5")])
    s.put(ax + cols - 12, y + rows + 2, "p, kept fraction", 'd') if not C.S else None
    # labels
    lab_x = ax + cols + 2
    if not C.S:
        for f, at, txt in ((f_p, 'b', "C^P  (1+a)²"), (f_b, 'a', "C^B  (1+a)"), (f_t, 'n', "C^T  1")):
            rr = rows - 1 - round(f(4) / ymax * (rows - 1))
            s.put(lab_x, y + rr, txt, at)
        y += rows + 3
    else:
        y += rows + 2
        s.put(x0, y, "C^P (1+a)²", 'b')
        s.put(x0 + 12, y, "C^B (1+a)", 'a')
        s.put(x0 + 23, y, "C^T 1", 'n')
        y += 2
    s.wrap(x0, y, W, "The thinning dependence differs term by term: that is what separates them." if not C.S else "Different a-dependence separates the terms.", 'b')


def sl_pairs(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "With the realized shot noise S subtracted, the monopole estimator is exactly a sum over distinct pairs of objects:")
    y += g
    y = EQ(C, y, r"P_i \;=\; \frac{1}{N}\sum_{z\neq z'} c_z\,c_{z'}\,w_z\,w_{z'}\;s_i(\mathbf{x}_z-\mathbf{x}_{z'})",
           ["`         1`",
            "`P_i  =  ───   Σ   c_z c_z'  w_z w_z'  s_i(x_z − x_z')`",
            "`         N    z≠z'`"], h=3)
    y += g + (0 if TEX else 1)
    y = defs(s, x0 + 2, y, W - 2, [("z", "galaxies (charge c = +1) and randoms (charge c = −α)"),
                                   ("w_z", "weights: completeness, systematics, FKP"),
                                   ("s_i", "plane wave averaged over the modes of shell i; real and even"),
                                   ("N", "normalization, held fixed")], 7)
    s.wrap(x0, y + g, W, "No self-pairs, so two pair sums can share at most two objects.", 'b')


def sl_reweight(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = EQ(C, y0, r"w_g \to w_g\,(1+\eta_g)\qquad \langle\eta_g\rangle=0\qquad \langle\eta_g\eta_h\rangle=a\,\delta_{gh}\qquad a=\frac1p-1",
           ["`w_g  →  w_g (1 + η_g)`", "",
            "`<η_g> = 0`      `<η_g η_h> = a δ_gh`      `a = 1/p − 1`"], h=3)
    y += g
    y = s.wrap(x0, y, W, "A galaxy pair is multiplied by (1+η_g)(1+η_h) and a galaxy–random pair by (1+η_g). The thinned estimator minus the full one, ΔP_i, keeps the terms with η:")
    y += g
    if TEX:
        y = EQ(C, y, r"\Delta P_i=\frac1N\Big[\underbrace{\sum_g \eta_g\,u_i(g)}_{\text{one galaxy}}+\underbrace{\sum_{g\neq h}\eta_g\eta_h\,w_g w_h\,s_i(g,h)}_{\text{one pair}}\Big]", [], h=4)
        y += g
        y = EQ(C, y, r"u_i(g)=2\,w_g\big[G_i(\mathbf{x}_g)-w_g\big]\qquad \text{(every pair that contains galaxy }g\text{)}", [], h=2)
    else:
        parts = [("ΔP_i  =  1/N [ ", 'n'), ("Σ_g η_g u_i(g)", 'b'), ("  +  ", 'n'),
                 ("Σ_{g≠h} η_g η_h w_g w_h s_i(g,h)", 'b'), (" ]", 'n')]
        fx = x0 + (W - seg_width(parts)) // 2
        sp = seg_line(s, fx, y, parts)
        brace(s, sp[1][0], y + 1, sp[1][1] - sp[1][0], "one galaxy")
        brace(s, sp[3][0], y + 1, sp[3][1] - sp[3][0], "one pair")
        y += 2 + g
        y = block(s, x0, W, y, ["`u_i(g)  =  2 w_g [ G_i(x_g) − w_g ]`   ¦every pair that contains galaxy g¦"])
    s.wrap(x0, y + g, W, "Both sums average to zero over the thinning: for a fixed catalog the thinned estimator is unbiased.", 'b')


def sl_closed(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "Average the product of two such changes over η (independent, zero mean). Only these survive:")
    y += 1
    cx = x0 + (W - 62) // 2
    for k, (a_, b_, c_) in enumerate([("linear × linear", "same galaxy only", "→ factor a"),
                                       ("linear × quadratic", "always zero", ""),
                                       ("quadratic × quadratic", "same pair only", "→ factor a²")]):
        s.put(cx, y + k, a_, 'b')
        s.put(cx + 24, y + k, b_, 'n')
        s.put(cx + 46, y + k, c_, 'a')
    y += 3 + g
    if TEX:
        y = EQ(C, y, r"\mathrm{Cov}_\eta\!\left[P_i,P_j\right]=\frac1{N^2}\Big[\underbrace{a\sum_g u_i(g)\,u_j(g)}_{\text{3 galaxies}}+\underbrace{a^2 D_{ij}}_{\text{2 galaxies}}\Big]", [], h=4)
        y += g
        y = EQ(C, y, r"\displaystyle D_{ij}=2\sum_{g\neq h} w_g^2\,w_h^2\;s_i(g,h)\,s_j(g,h)", [], h=3)
    else:
        parts = [("Cov_η[ P_i , P_j ]  =  1/N² [ ", 'n'), ("a Σ_g u_i(g) u_j(g)", 'b'), ("  +  ", 'n'),
                 ("a² D_ij", 'b'), (" ]", 'n')]
        fx = x0 + (W - seg_width(parts)) // 2
        sp = seg_line(s, fx, y, parts)
        brace(s, sp[1][0], y + 1, sp[1][1] - sp[1][0], "3 galaxies")
        brace(s, sp[3][0], y + 1, sp[3][1] - sp[3][0], "2")
        y += 2 + g
        y = block(s, x0, W, y, ["`D_ij  =  2 Σ_{g≠h} w_g² w_h² s_i(g,h) s_j(g,h)`"])
    s.wrap(x0, y + g, W, "Exact for a given catalog and valid for every p at once: nothing is thinned.", 'b')


def sl_parts(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "Expand u_i(g) u_j(g) over the two partners of galaxy g: distinct objects, the same galaxy, or the same random.")
    y = EQ(C, y + (0 if TEX else g), r"\sum_g u_i(g)\,u_j(g)\;=\;T_{ij}+2\,D_{ij}+R_{ij}", ["`Σ_g u_i(g) u_j(g)  =  T_ij + 2 D_ij + R_ij`"], h=2)
    y += g
    widths = [14, 28, 28] if C.L else [12, 26, 26]
    rows = [["", "Gaussian: already yours", "Connected: the wanted part"],
            ["T  triplets, one galaxy shared", "ξ_bc : power × shot noise. Only the two partners are correlated.",
             "ζ_abc : all three galaxies correlated. Bispectrum term C^B, ~ 1/nbar."],
            ["D  pairs, both galaxies shared", "1 : shot noise squared. Pairs exist without any clustering.",
             "ξ_12 : the pair is clustered. Power-spectrum term C^P, ~ 1/nbar²."]]
    tw = table_width(widths)
    y = s.table(x0 + (W - tw) // 2, y, widths, rows, rule_rows=True)
    s.wrap(x0, y + 1, W, "R is the term where both partners are the same random. It cancels with the randoms, next.", 'd')


def sl_randoms(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "The same sums on the randoms (same window, no clustering) reproduce the Gaussian parts exactly.")
    y = EQ(C, y + g, r"\begin{aligned}\Delta_{ij}&=\sum_g u_i(g)u_j(g)-\alpha\sum_r u_i(r)u_j(r)\\ D^{\mathrm{conn}}_{ij}&=2\sum_{z\neq z'} c_z c_{z'}\,w_z^2 w_{z'}^2\,s_i(z,z')\,s_j(z,z')\end{aligned}",
           ["`Δ_ij  =  Σ_g u_i(g) u_j(g)  −  α Σ_r u_i(r) u_j(r)`",
            "`D^conn_ij  =  2 Σ_{z≠z'} c_z c_z' w_z² w_z'² s_i(z,z') s_j(z,z')`"], h=4)
    y += g
    widths = [14, 26, 20] if C.L else [14, 24, 18]
    rows = [["partners", "galaxy sum", "α × random sum"],
            ["distinct", "Gaussian + C^B", "Gaussian"],
            ["same galaxy", "unclustered + clustered pairs", "unclustered pairs"],
            ["same random", "finite-randoms term", "the same term"]]
    tw = table_width(widths)
    y = s.table(x0 + (W - tw) // 2, y, widths, rows)
    y += g
    EQ(C, y, r"\langle\Delta_{ij}\rangle=N^2 C^B_{ij}+2\langle D^{\mathrm{conn}}_{ij}\rangle\qquad\qquad \langle D^{\mathrm{conn}}_{ij}\rangle=N^2 C^P_{ij}",
       ["`<Δ_ij> = N² C^B + 2 <D^conn_ij>`        `<D^conn_ij> = N² C^P`"], h=2)


def sl_result(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    bw = 84 if C.L else 70
    bx = x0 + (W - bw) // 2
    bh = 9 if C.L else 7
    s.box(bx, y0, bw, bh, 'd', 'b')
    yy = y0 + (2 if C.L else 2)
    gap = 3 if C.L else 2
    if TEX:
        s.eqs.append(dict(x=bx + 3, y=y0 + 1, w=bw // 2 - 1, h=bh // 2 - 0, col='b', tex=r"C^B_{ij}=\dfrac{\big\langle \Delta_{ij}-2D^{\mathrm{conn}}_{ij}\big\rangle}{N^2}"))
        s.eqs.append(dict(x=bx + 3, y=y0 + 1 + bh // 2, w=bw // 2 - 1, h=bh // 2 - 1, col='b', tex=r"C^P_{ij}=\dfrac{\big\langle D^{\mathrm{conn}}_{ij}\big\rangle}{N^2}"))
        s.rput(y0 + 2, "bispectrum term, ~ 1/nbar", 'd', bx + bw - 3)
        s.rput(y0 + 2 + bh // 2, "power-spectrum term, ~ 1/nbar²", 'd', bx + bw - 3)
    else:
        s.put(bx + 3, yy, "`C^B  =  < Δ_ij − 2 D^conn_ij > / N²`", 'b')
        s.rput(yy, "bispectrum term, ~ 1/nbar", 'd', bx + bw - 3)
        s.put(bx + 3, yy + gap, "`C^P  =  < D^conn_ij > / N²`", 'b')
        s.rput(yy + gap, "power-spectrum term, ~ 1/nbar²", 'd', bx + bw - 3)
    y = y0 + bh + g + 1
    y = EQ(C, y, r"C \;=\; C^{\mathrm{Gauss}}+C^{T}+C^{B}+C^{P}", ["§C  =  C^Gauss + C^T + C^B + C^P§"], h=2, col='a')
    y += g + 1
    y = s.bullet(x0 + 2, y, W - 2, "`C^Gauss` comes from your existing Gaussian code, window included.")
    y = s.bullet(x0 + 2, y + (g - 1), W - 2, "`C^T` stands for the terms with no shared galaxy (connected trispectrum, super-sample). Thinning cannot reach them.")
    s.bullet(x0 + 2, y + (g - 1), W - 2, "One catalog gives an unbiased but noisy estimate. Average over a few mocks, or smooth in (k, k').")


def sl_multi(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "Observable A = (shell i, multipole ℓ), ℓ even. Only the kernel changes. With the line of sight on one object of the pair:")
    y = EQ(C, y + (0 if TEX else g), r"K_A(z,z')=\frac{2\ell+1}{N_i}\sum_{\mathbf{k}\in i}\mathcal{L}_\ell(\mu)\,e^{-i\mathbf{k}\cdot(\mathbf{x}_z-\mathbf{x}_{z'})}",
           ["`K_A(z,z')  =  (2ℓ+1)/N_i  Σ_{k in i}  L_ℓ(μ)  e^(−i k·(x_z − x_z'))`"], h=3)
    y = s.wrap(x0, y + (1 if C.L else 0), W, "μ: cosine of k and the line of sight of z'. K is real for even ℓ but not symmetric, so:", 'd')
    y = EQ(C, y + (0 if TEX else g), r"s_A(z,z')=\tfrac12\big[K_A(z,z')+K_A(z',z)\big]",
           ["`s_A(z,z')  =  ½ [ K_A(z,z') + K_A(z',z) ]`      §use s_A wherever s_i appeared§"], h=2)
    y = s.wrap(x0, y + (1 if C.L else 0), W, "The factor 2 in u and D needs the symmetric kernel; cross blocks use s_A and s_B.")
    y += g if C.L else 0
    widths = [40, 17] if C.L else [38, 17]
    rows = [["toy test, ℓ = 0, 2, 4 (21 elements)", "largest deviation"],
            ["closed form vs 40,000 thinnings", "2.1σ"],
            ["bispectrum term vs continuous field", "1.9σ"],
            ["power term vs continuous field", "2.2σ"],
            ["Poisson catalog: both terms zero", "2.3σ"]]
    s.table(x0 + (W - table_width(widths)) // 2, y, widths, rows, aligns='lc')


def sl_recipe(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    bw = (W - 2) // 2
    bh = 8 if C.L else 7
    items = [("1  TWO FIELDS", "Paint galaxies − α·randoms on a mesh twice: F with weights w, and F2 with weights w²."),
             ("2  FILTER PER SHELL", "Filter F by each shell, read it at every object, drop the self-term. That is u."),
             ("3  TRIPLET SUM", "Sum u_i u_j over galaxies, minus α times the same sum over randoms. That is Δ."),
             ("4  PAIR SUM", "Transform |F2|², sum against both shell kernels. That is D^conn.")]
    for k, (t, txt) in enumerate(items):
        bx = x0 + (k % 2) * (bw + 2)
        by = y0 + (k // 2) * (bh + g)
        s.box(bx, by, bw, bh, 's', 'd')
        s.put(bx + 2, by + 1, t, 'a')
        s.wrap(bx + 2, by + 3, bw - 4, txt, 'n')
    y = y0 + 2 * bh + g + g
    s.wrap(x0, y, W, "For ℓ > 0 the weights also carry Y_ℓm of the line of sight: 2(2ℓ+1) FFTs per shell for u, and cross-spectra at k+k' for the pair sum. The cost is a few FFTs per shell.", 'b')


def chart_vbars(C, y, mc, fm, labels):
    s, x0, W = C.s, C.x, C.w
    bwid, gw, h, lead = {'s': (1, 3, 11, 4), 'm': (2, 6, 10, 7), 'l': (3, 8, 14, 7)}[C.size]
    vmax = 15000
    ax = x0 + lead
    for r in range(h):
        s.set(ax, y + r, '│', 'd')
    s.set(ax, y + h, '└', 'd')
    s.hline(ax + 1, y + h, len(mc) * gw + (0 if C.S else 2))
    ticks = ((15000, "15k"), (10000, "10k"), (5000, "5k"), (0, "0")) if C.S else ((15000, "15000"), (10000, "10000"), (5000, "5000"), (0, "0"))
    for v, lab in ticks:
        row = y + h - round(v / vmax * h)
        s.put(ax - 1 - len(lab), row, lab, 'd')
    for k in range(len(mc)):
        gx = ax + 2 + k * gw
        for off, vals, at in ((0, mc, 'b'), (bwid, fm, 'n')):
            col = vbar_col(vals[k], vmax, h)
            for r, chv in enumerate(col):
                for b_ in range(bwid):
                    if chv != ' ':
                        s.set(gx + off + b_, y + r, '▒' if (at == 'n' and chv == '█') else chv, at)
        lab = labels[k].replace('-', '') if C.S else labels[k]
        s.put(gx + (2 * bwid - len(lab)) // 2, y + h + 1, lab, 'd')
    return y + h + 2


MC = [13706.4, 3173.1, 20.6, 451.7, 7783.1, 1586.9, 229.9, 2946.9, 622.8, 1630.1]
FM = [13726.7, 3195.8, 58.5, 450.8, 7824.2, 1608.7, 254.8, 2974.3, 639.7, 1628.8]
LAB = ["1-1", "1-2", "1-3", "1-4", "2-2", "2-3", "2-4", "3-3", "3-4", "4-4"]


def sl_test1(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    y = s.wrap(x0, y0, W, "Covariance of one catalog over its thinnings, element by element (shell pair):")
    y = chart_vbars(C, y + 1, MC, FM, LAB)
    s.put(x0 + 8, y, "█", 'b')
    s.put(x0 + 10, y, "Monte Carlo, 40,000 thinnings", 'n')
    s.put(x0 + 42, y, "▒", 'n')
    s.put(x0 + 44, y, "closed form", 'n')
    s.wrap(x0, y + (2 if C.L else 1), W, "One lognormal catalog with window, weights and randoms. Every element agrees within chance fluctuations.", 'b')


def panel(s, x, y, w, title, est, tru, vmax, fmt, gap=1):
    s.put(x, y, title, 'b')
    y += 1
    bw = w - 7 - 7
    for k in range(len(est)):
        s.put(x, y, f"S{k + 1} est", 'd')
        s.put(x + 7, y, hbar(est[k], vmax, bw), 'b')
        s.put(x + 7 + bw + 1, y, fmt(est[k]), 'n')
        s.put(x, y + 1, "  true", 'd')
        s.put(x + 7, y + 1, hbar(tru[k], vmax, bw), 'n')
        s.put(x + 7 + bw + 1, y + 1, fmt(tru[k]), 'd')
        y += 2 + gap
    return y


def sl_test2(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    y = s.wrap(x0, y0, W, "Diagonal elements per shell: the estimator on galaxies and randoms (bright) against the same sums on the continuous field, which has no shot noise (normal).")
    y += 1 if not C.L else 2
    pw = (W - 4) // 2
    ya = panel(s, x0, y, pw, "BISPECTRUM TERM  Δ − 2 D^conn", [1338, 459, 174, 66], [1350, 462, 174, 68], 1350, lambda v: f"{v:,.0f}", 1)
    panel(s, x0 + pw + 4, y, pw, "POWER TERM  D^conn", [118.8, 74.4, 49.9, 35.2], [119.4, 74.7, 50.2, 35.4], 119.4, lambda v: f"{v:.1f}", 1)
    s.wrap(x0, ya, W, "3,000 lognormal mocks. All 16 elements agree: at most 0.9σ for the bispectrum term and 1.3σ for the power term.", 'b')


def sl_test3(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    g = 2 if C.L else 1
    y = s.wrap(x0, y0, W, "Poisson catalogs in the same window have no clustering, so both connected terms must vanish. First-shell diagonal element:")
    y += g
    lab, bwid = 22, (W - 22 - 18)
    for title, raw, sub, err, txt in (("TRIPLET TERM", 596, 2.7, 8.9, "596"), ("PAIR TERM", 2958, -0.2, 0.4, "2,958")):
        s.put(x0, y, title, 'b')
        s.put(x0 + 2, y + 1, "without subtraction", 'd')
        s.put(x0 + 2, y + 2, "randoms subtracted", 'd')
        for r in (1, 2):
            s.set(x0 + lab, y + r, '│', 'd')
        s.put(x0 + lab + 1, y + 1, hbar(raw, raw, bwid), 'n')
        s.put(x0 + lab + 2 + bwid, y + 1, txt, 'n')
        s.put(x0 + lab + 2 + bwid, y + 2, f"{sub:.1f} ± {err}".replace('-', '−'), 'a')
        s.put(x0 + lab + 2, y + 2, "≈ 0", 'a')
        y += 4 + g
    s.wrap(x0, y, W, "All 16 elements of both matrices are within one standard error of zero over 3,000 mocks. Window leakage and the finite-randoms terms cancel.", 'b')


def sl_limits(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    bw = (W - 2) // 2
    bh = 19 if C.L else 18
    left = ["Mesh interpolation and aliasing: toy objects sit on lattice cells.",
            "The FFT evaluation for ℓ > 0: the recipe is not yet run.",
            "Odd multipoles: the kernel is imaginary.",
            "The integral constraint, in the lowest k bins.",
            "With real binning, the ridge at neighbouring shells (|i−j| ≤ 1)."]
    right = ["The Gaussian model and the randoms must use the same weights, normalization and Poisson shot noise.",
             "The ℓ > 0 self-term is not exactly zero on a grid: subtract it.",
             "One catalog gives an unbiased but noisy estimate: average over mocks or smooth in (k, k')."]
    for k, (ttl, items) in enumerate((("NOT TESTED YET", left), ("TO KEEP IN MIND", right))):
        bx = x0 + k * (bw + 2)
        s.box(bx, y0, bw, bh, 's', 'd', ttl, 'b')
        y = y0 + 2
        for it in items:
            y = s.bullet(bx + 2, y, bw - 4, it) + (1 if C.L else 0)


def sl_density(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    f1 = lambda a_: (1 + a_) ** 2
    f2 = lambda a_: 1 + a_
    curves = [(f2, 'a'), (f1, 'b')]
    ymax = 25
    modes = [('dot', "● one marker per column", "1 × 1"), ('half', "▀▄ half blocks", "1 × 2"), ('braille', "⠿ braille dots", "2 × 4")]
    if C.S:
        s.put(x0, y0, "Same curves, three densities:", 'n')
        y = y0 + 2
        for m, t, res in modes:
            s.put(x0, y, t.replace("one marker per column", "markers").replace("half blocks", "half blocks").replace("braille dots", "braille"), 'b')
            s.rput(y, res + " px/cell", 'd', x0 + W)
            curve_plot(s, x0 + 1, y + 1, W - 2, 4, curves, 4, ymax, m)
            y += 6
        return
    pw = 28 if C.L else 23
    gap = (W - 3 * pw) // 2
    rows = 14 if C.L else 10
    y = s.wrap(x0, y0, W, "Same two curves from the previous slide, drawn at three densities in the same area of the grid:")
    y += 1
    for k, (m, t, res) in enumerate(modes):
        px = x0 + k * (pw + gap)
        s.put(px, y, t, 'b')
        s.put(px, y + 1, res + " pixels per cell", 'd')
        for r in range(rows):
            s.set(px, y + 2 + r, '│', 'd')
        s.set(px, y + 2 + rows, '└', 'd')
        s.hline(px + 1, y + 2 + rows, pw - 1)
        curve_plot(s, px + 1, y + 2, pw - 1, rows, curves, 4, ymax, m)
    y += rows + 4
    s.wrap(x0, y, W, "Each step in density multiplies the vertical resolution; braille also doubles the horizontal one.", 'b')


import math

BI_T, BI_E = [1350, 462, 174, 68], [1338, 459, 174, 66]
PW_T, PW_E = [119.4, 74.7, 50.2, 35.4], [118.8, 74.4, 49.9, 35.2]


def sl_t2plot(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    lead, pw, mh, rh = {'l': (7, 62, 14, 4), 'm': (6, 52, 9, 4), 's': (6, 28, 7, 3)}[C.size]
    if C.S:
        y = s.wrap(x0, y0, W, "Estimator (rings) vs truth (lines), by shell:")
        y += 1
    else:
        y = s.wrap(x0, y0, W, "Estimator (rings) vs continuous-field truth (lines), by shell:")
        y += 1
    ax = x0 + lead
    lo, hi = 20.0, 2000.0
    lg = lambda v: (math.log10(v) - math.log10(lo)) / (math.log10(hi) - math.log10(lo))
    my = y
    for r in range(mh):
        s.set(ax - 1, my + r, '│', 'd')
    s.set(ax - 1, my + mh, '└', 'd')
    s.hline(ax, my + mh, pw)
    used = set()
    labs = (20, 50, 100, 200, 500, 1000, 2000) if C.L else (20, 100, 1000)
    for v in labs:
        rr = min(my + mh - 1, max(my, round(my + mh * (1 - lg(v)) - 0.5)))
        if rr in used:
            continue
        used.add(rr)
        s.put(ax - 2 - len(str(v)), rr, str(v), 'd')
        s.set(ax - 1, rr, '┤', 'd')
    ry = my + mh + 1
    rlo, rhi = -4.0, 1.0
    for r in range(rh):
        s.set(ax - 1, ry + r, '│', 'd')
    s.set(ax - 1, ry + rh, '└', 'd')
    s.hline(ax, ry + rh, pw)
    for v, lab in ((0, "0%"), (-2, "−2%")):
        rr = min(ry + rh - 1, max(ry, round(ry + rh * (1 - (v - rlo) / (rhi - rlo)) - 0.5)))
        s.put(ax - 2 - len(lab), rr, lab, 'd')
        s.set(ax - 1, rr, '┤', 'd')
    for k in range(4):
        cx = ax + int((k + 0.5) / 4 * pw)
        s.set(cx, ry + rh, '┬', 'd')
        s.put(cx - 1, ry + rh + 1, f"S{k + 1}", 'd')
    if C.L:
        s.put(ax - 7, ry + rh + 1, "shell", 'd')
    pct = lambda e, t_: [100 * (a_ / b_ - 1) for a_, b_ in zip(e, t_)]
    rb, rp = pct(BI_E, BI_T), pct(PW_E, PW_T)
    xs = [1, 2, 3, 4]
    grid_y = [dict(v=v, major=True) for v in labs]
    main = dict(kind='xy', x=ax, y=my, w=pw, h=mh, xr=[0.5, 4.5], yr=[lo, hi], ylog=True,
                gridy=list(labs), gridx=xs, hlines=[],
                series=[dict(at='a', pts=list(zip(xs, BI_T)), line=True, marker='dot'),
                        dict(at='b', pts=list(zip(xs, PW_T)), line=True, marker='dot'),
                        dict(at='a', pts=list(zip(xs, BI_E)), line=False, marker='ring'),
                        dict(at='b', pts=list(zip(xs, PW_E)), line=False, marker='ring')])
    res = dict(kind='xy', x=ax, y=ry, w=pw, h=rh, xr=[0.5, 4.5], yr=[rlo, rhi], ylog=False,
               gridy=[-2, 0], gridx=xs, hlines=[0],
               series=[dict(at='a', pts=list(zip(xs, rb)), line=True, marker='ring', thin=True),
                       dict(at='b', pts=list(zip(xs, rp)), line=True, marker='ring', thin=True)])
    rows_txt = y + 0
    ty = ry + rh + 2
    fmt = lambda v: (f"{v:,.0f}" if v >= 100 else f"{v:.1f}")
    sg = lambda v: ("+" if v > 0.005 else "−" if v < -0.005 else " ") + f"{abs(v):.1f}%"
    texts = []
    for k in range(4):
        texts.append([f"S{k + 1}  bisp  {fmt(BI_E[k])} / {fmt(BI_T[k])}  {sg(rb[k])}",
                      f"    power {fmt(PW_E[k])} / {fmt(PW_T[k])}  {sg(rp[k])}"])
    main['hover'] = dict(xs=xs, text=texts, dflt=["hover or touch a shell", "est / truth, difference"],
                         rx=x0, ry=ty, y1=ry + rh)
    s.plots.append(main)
    s.plots.append(res)
    # legend
    if C.S:
        s.put(x0, ry + rh + 2, "─○ bispectrum", 'a')
        s.put(x0 + 15, ry + rh + 2, "─○ power", 'b')
        main['hover']['ry'] = ry + rh + 4
    else:
        lx = ax + pw + 2
        s.put(lx, my + 1, "─○ bispectrum", 'a')
        s.put(lx, my + 2, "─○ power", 'b')
        s.put(lx, my + 4, "line: truth", 'd')
        s.put(lx, my + 5, "ring: estimate", 'd')
        s.put(lx, ry + 1, "difference", 'd')
        s.put(lx, ry + 2, "est/truth − 1", 'd')


def sl_wiggle(C, text=False):
    import random
    s, x0, y0, W = C.s, C.x, C.y, C.w
    lead, pw, mh = {'l': (6, 66, 17), 'm': (6, 50, 12), 's': (6, 28, 10)}[C.size]
    if C.S:
        y = s.wrap(x0, y0, W, "Synthetic: 8 noisy mocks, their mean, and the truth.")
        y += 1
    else:
        y = s.wrap(x0, y0, W, ("Same spectra, braille characters only (2×4 dots per cell); three of the eight mocks:" if text else
                               "Synthetic spectra: eight noisy mocks, their mean and the underlying truth (P / smooth fit):"))
        y += 1
    xr, yr = (0.02, 0.30), (0.6, 1.4)
    n = 240
    ks = [xr[0] + (xr[1] - xr[0]) * i / (n - 1) for i in range(n)]
    truth = [1 + 0.08 * math.sin(2 * math.pi * k / 0.055) * math.exp(-(k / 0.18) ** 2) for k in ks]
    rnd = random.Random(11)
    mocks = []
    for _ in range(8):
        e, ys = 0.0, []
        for k, tr in zip(ks, truth):
            sig = 0.10 * (0.04 / k) ** 0.5
            e = 0.55 * e + math.sqrt(1 - 0.55 ** 2) * rnd.gauss(0, sig)
            ys.append(tr + e)
        mocks.append(ys)
    mean = [sum(m[i] for m in mocks) / 8 for i in range(n)]
    ax = x0 + lead
    my = y
    for r in range(mh):
        s.set(ax - 1, my + r, '│', 'd')
    s.set(ax - 1, my + mh, '└', 'd')
    s.hline(ax, my + mh, pw)
    for v in (0.6, 0.8, 1.0, 1.2, 1.4):
        rr = min(my + mh - 1, max(my, round(my + mh * (1 - (v - yr[0]) / (yr[1] - yr[0])) - 0.5)))
        lab = f"{v:.1f}"
        s.put(ax - 2 - len(lab), rr, lab, 'd')
        s.set(ax - 1, rr, '┤', 'd')
    gx = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30] if not C.S else [0.1, 0.2, 0.3]
    for k in gx:
        cx = min(ax + pw - 1, ax + int((k - xr[0]) / (xr[1] - xr[0]) * pw))
        s.set(cx, my + mh, '┬', 'd')
        lab = f"{k:.2f}"
        s.put(cx - len(lab) // 2, my + mh + 1, lab, 'd')
    s.put(ax + pw // 2 - 6, my + mh + 2, "k  [h/Mpc]", 'd') if not C.S else None
    ser = [dict(at='d', pts=list(zip(ks, m)), line=True, thin=True) for m in mocks]
    ser.append(dict(at='b', pts=list(zip(ks, truth)), line=True))
    ser.append(dict(at='a', pts=list(zip(ks, mean)), line=True))
    if text:
        order = ser[:3] + [ser[9], ser[8]]   # three mocks, then mean, then truth on top
        curve_poly(s, ax, my, pw, mh, [(sr['pts'], sr['at']) for sr in order], xr, yr, 'braille', decim=True)
    else:
        s.plots.append(dict(kind='xy', x=ax, y=my, w=pw, h=mh, xr=list(xr), yr=list(yr), ylog=False,
                            gridy=[0.8, 1.0, 1.2], gridx=gx, hlines=[], series=ser))
    if C.S:
        s.put(x0, my + mh + 3, "─ truth", 'b')
        s.put(x0 + 10, my + mh + 3, "─ mean", 'a')
        s.put(x0 + 19, my + mh + 3, "─ 8 mocks", 'd')
    else:
        lx = ax + pw + 2
        s.put(lx, my + 1, "─ truth", 'b')
        s.put(lx, my + 2, "─ mean of 8", 'a')
        s.put(lx, my + 3, "─ single mocks", 'd')
        s.put(lx, my + 5, "noise shrinks", 'd')
        s.put(lx, my + 6, "with k", 'd')


def sl_anim(C):
    import random
    s, x0, y0, W = C.s, C.x, C.y, C.w
    F = 48
    if C.S:
        fw, fh, n, bw = 36, 8, 46, 17
    else:
        fw, fh, n, bw = 72, 9, 110, 38
    rnd = random.Random(21)
    gal, occ = [], set()
    tries = 0
    while len(gal) < n and tries < n * 200:
        tries += 1
        cx, cy = rnd.randrange(fw), rnd.randrange(fh)
        if rnd.random() > 0.25 + 0.75 * (cx / fw):
            continue
        if (cx, cy) in occ or any((cx + dx, cy + dy) in occ for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
            continue
        occ.add((cx, cy))
        gal.append((cx, cy, rnd.random()))
    base = ([row[:] for row in s.c], [row[:] for row in s.a])
    VMAX = 45.0

    def draw(s2, p):
        a_ = 1 / p - 1
        y = s2_put(s2, x0, y0, "Keep each galaxy with probability p; the three terms rescale by their closed-form factors:" if not C.S else "Thin with probability p:")
        y += 1 if not C.S else 1
        top = y
        kept = 0
        for cx, cy, th in gal:
            k = th < p
            kept += k
            s2.set(x0 + cx, top + cy, '●' if k else '○', 'b' if k else 'd')
        y = top + fh + 1
        s2.put(x0, y, f"p = {p:4.2f}", 'b')
        if C.S:
            s2.put(x0 + 10, y, f"a = {a_:4.2f}", 'n')
            s2.rput(y, f"kept {kept} / {len(gal)}", 'd', x0 + W)
        else:
            s2.put(x0 + 10, y, f"a = 1/p − 1 = {a_:4.2f}", 'n')
            s2.rput(y, f"kept {kept:3d} of {len(gal)}", 'd', x0 + W)
        y += 2
        for lab, val, at in (("C^T", 1.0, 'n'), ("C^B", 1 + a_, 'a'), ("C^P", (1 + a_) ** 2, 'b')):
            s2.put(x0, y, lab, at)
            s2.put(x0 + 4, y, hbar(val, VMAX, bw), at)
            s2.put(x0 + 5 + bw, y, f"×{val:5.2f}", at)
            y += 1

    def s2_put(s2, x, y, text):
        return s2.wrap(x, y, W, text)

    ps = [1 - 0.85 * (1 - math.cos(2 * math.pi * k / F)) / 2 for k in range(F)]
    for k in range(F):
        sc = Scr(s.w, s.h)
        sc.c, sc.a = [row[:] for row in base[0]], [row[:] for row in base[1]]
        draw(sc, ps[k])
        r, at = sc.lines()
        s.frames.append(dict(chars=r, attrs=at))
    draw(s, ps[F // 3])


def _heat(s, x, y, px, cols, rows):
    """Half-block heat map: px has 2*rows pixel rows (None = gap). Writes a colourless character
    approximation (plain-text view) and records the coloured pixels for the page."""
    s.heats.append(dict(x=x, y=y, cols=cols, rows=rows, px=[[None if v is None else round(v, 2) for v in r] for r in px]))
    for r in range(rows):
        for c in range(cols):
            top, bot = px[2 * r][c], px[2 * r + 1][c]
            tt = top is not None and abs(top) > 0.25
            bb = bot is not None and abs(bot) > 0.25
            ch = {(True, True): '█', (True, False): '▀', (False, True): '▄'}.get((tt, bb), ' ')
            v = top if tt else bot
            s.set(x + c, y + r, ch, 'p' if (v or 0) >= 0 else 'q')


def sl_corr(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    nb, ells = 8, (0, 2, 4)
    N = nb * 3
    ks = [0.04 + 0.035 * i for i in range(nb)]
    idx = [(l, i) for l in ells for i in range(nb)]
    var = {(l, i): (1.0 + 0.3 * l) / ks[i] for l, i in idx}
    rho = {(0, 2): -0.4, (2, 4): 0.25, (0, 4): -0.15}
    band_same = {0: 1.0, 1: 0.25, 2: 0.08}
    band_cross = {0: 1.0, 1: 0.5, 2: 0.15}

    def cov(connected):
        M = [[0.0] * N for _ in range(N)]
        for a_, (la, ia) in enumerate(idx):
            for b_, (lb, ib) in enumerate(idx):
                d = abs(ia - ib)
                v = 0.0
                if la == lb:
                    v = band_same.get(d, 0.0)
                else:
                    r_ = rho[(min(la, lb), max(la, lb))]
                    v = r_ * band_cross.get(d, 0.0)
                if connected:
                    sg = 1.0 if la == lb else (1.0 if rho[(min(la, lb), max(la, lb))] > 0 else -1.0)
                    v += 0.9 * math.exp(-abs(ks[ia] - ks[ib]) / 0.35) * (1.0 if la == lb else 0.6) * sg
                M[a_][b_] = v * (var[(la, ia)] * var[(lb, ib)]) ** .5
        return M

    def corr(M):
        return [[M[i][j] / (M[i][i] * M[j][j]) ** .5 for j in range(N)] for i in range(N)]

    GAPX, GAPY = 1, 2                       # block gap: 1 column, 2 pixel rows (= 1 text row)
    cols = N + 2 * GAPX
    prow = N + 2 * GAPY
    trow = prow // 2

    def pixels(R):
        out = []
        for g in range(3):
            for a_ in range(nb):
                row = []
                for h in range(3):
                    row += [R[g * nb + a_][h * nb + b_] for b_ in range(nb)]
                    if h < 2:
                        row += [None] * GAPX
                out.append(row)
            if g < 2:
                out += [[None] * cols for _ in range(GAPY)]
        return out

    def panel(px, py, R, title):
        s.put(px + 4, py, title, 'b')
        for h, l in enumerate(ells):
            s.put(px + 4 + h * (nb + GAPX), py + 1, f"ℓ={l}", 'd')
        for g, l in enumerate(ells):
            s.put(px, py + 2 + (g * (nb + GAPY)) // 2 + nb // 4, f"ℓ={l}", 'd')
        _heat(s, px + 4, py + 2, pixels(R), cols, trow)

    Rg, Rc = corr(cov(False)), corr(cov(True))
    if C.S:
        y = s.wrap(x0, y0, W, "Correlation matrix with connected terms (illustrative):")
        panel(x0 + 1, y, Rc, "Gauss + connected")
        y += 2 + trow
    else:
        y = s.wrap(x0, y0, W, "Correlation matrix of three multipoles (illustrative numbers, not a result):")
        pw = 4 + cols
        panel(x0, y, Rg, "Gaussian only")
        panel(x0 + pw + 6, y, Rc, "+ connected shot-noise terms")
        y += 2 + trow
    lw = 21
    s.put(x0, y, "−1", 'd')
    _heat(s, x0 + 3, y, [[-1 + 2 * c / (lw - 1) for c in range(lw)]] * 2, lw, 1)
    s.put(x0 + 3 + lw + 1, y, "+1", 'd')
    if not C.S:
        s.put(x0 + 3 + lw + 6, y, "correlation: orange positive, blue negative", 'd')
        s.wrap(x0, y + 1, W, "Connected terms add a broad floor to the off-diagonal elements.", 'b')


MLSL = [cover, sl_coinc, sl_scale, sl_scaling, sl_pairs, sl_reweight, sl_closed, sl_parts, sl_randoms, sl_result, sl_corr, sl_multi, sl_recipe,
        sl_test1, sl_test2, sl_t2plot, sl_test3, sl_limits, sl_density, sl_wiggle, lambda C: sl_wiggle(C, True), sl_anim]
