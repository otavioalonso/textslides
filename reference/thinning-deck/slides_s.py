"""Compact 40x25 versions (content 36 wide, rows 2..22)."""
from lib import *
import slides as SL


def blk(s, x, W, y, lines, a='n'):
    return SL.block(s, x, W, y, lines, a)


def s_coinc(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Terms sorted by galaxies shared:")
    y += 1
    for ttl, dg, txt, th in [
        ("NONE SHARED", "(1)──(2)  (3)══(4)", "trispectrum, Gaussian", "unchanged"),
        ("ONE SHARED", "(2)──(1)══(3)", "bispectrum term C^B ~ 1/nbar", "(1+a)"),
        ("TWO SHARED", "(1)───(2) └═════┘", "power term C^P ~ 1/nbar²", "(1+a)²")]:
        s.box(x, y, W, 5, 's', 'd', ttl, 'b')
        s.put(x + 2, y + 1, dg if ttl != "TWO SHARED" else "(1)───(2)", 'n')
        if ttl == "TWO SHARED":
            s.put(x + 3, y + 2, "└═════┘", 'n')
        s.put(x + 2, y + 3, txt, 'n')
        s.rput(y + 1, "thinning:", 'd', x + W - 2 - 0) if False else None
        s.rput(y + 2, th, 'a', x + W - 2)
        y += 6
    s.put(x, y, "── pair in i      ══ pair in j", 'd')


def s_scale(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Keep each galaxy with probability p, weight 1/p; `a = 1/p − 1`.")
    y += 1
    import random
    r = random.Random(7)
    s.put(x, y, "full", 'd'); s.put(x, y + 1, "thin", 'd')
    for k in range(14):
        s.set(x + 6 + 2 * k, y, '●', 'b')
        kp = r.random() < .5
        s.set(x + 6 + 2 * k, y + 1, '●' if kp else '○', 'b' if kp else 'd')
    y += 3
    y = s.table(x + 2, y, [10, 5, 9], [["term", "shr", "thinned"], ["C^T", "0", "same"], ["C^B", "1", "(1+a)"], ["C^P", "2", "(1+a)²"]], aligns='lcl')
    s.wrap(x, y + 1, W, "The rest is a known discreteness rescaling.", 'b')


def s_pairs(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Realized shot noise removed, the estimator is a sum over distinct pairs:")
    y = SL.EQ(C, y + 1, r"P_i=\frac1N\sum_{z\neq z'}c_z c_{z'}w_z w_{z'}\,s_i", ["`     1`", "`P_i = ─ Σ c c' w w' s_i`", "`     N z≠z'`"], h=3)
    y += 1
    y = SL.defs(s, x, y, W, [("z", "galaxy c=+1, random c=−α"), ("w", "completeness, FKP"), ("s_i", "shell plane wave, real"), ("N", "fixed")], 5)
    s.wrap(x, y + 1, W, "Two pairs share at most two objects.", 'b')


def s_rew(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = SL.EQ(C, y, r"\begin{gathered}w_g\to w_g(1+\eta_g)\\ \langle\eta_g\eta_h\rangle=a\delta_{gh},\ a=\tfrac1p-1\end{gathered}", ["`w_g → w_g (1 + η_g)`", "`<η>=0   <η_g η_h> = a δ_gh`"], h=3)
    y = s.wrap(x, y + 1, W, "The thinned estimator minus the full one:")
    if SL.TEX:
        y = SL.EQ(C, y + 1, r"\Delta P=\tfrac1N\Big[\underbrace{\textstyle\sum_g\eta_g u(g)}_{\text{one galaxy}}+\underbrace{\textstyle\sum_{g\neq h}\eta_g\eta_h w w' s}_{\text{one pair}}\Big]", [], h=4)
        y = SL.EQ(C, y + 1, r"u(g)=2w_g\big[G(x_g)-w_g\big]", [], h=2)
    else:
        y = blk(s, x, W, y + 1, ["`ΔP = [ Σ_g η_g u(g)`", "`  + Σ_g≠h η_g η_h w w' s ] / N`", "¦ one galaxy      one pair¦"])
        y = blk(s, x, W, y + 1, ["`u(g) = 2 w_g [G(x_g) − w_g]`"])
    s.wrap(x, y + 1, W, "Both parts average to zero: unbiased.", 'b')


def s_closed(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Average two such changes over η:")
    y += 1
    for l, a_ in [("linear×linear:  same galaxy → a", 'n'), ("linear×quad:    zero", 'n'), ("quad×quad:      same pair → a²", 'n')]:
        s.put(x + 1, y, l, a_); y += 1
    if SL.TEX:
        y = SL.EQ(C, y + 1, r"\mathrm{Cov}[P_i,P_j]=\tfrac1{N^2}\Big[\underbrace{a\textstyle\sum_g u_i u_j}_{3}+\underbrace{a^2D_{ij}}_{2}\Big]", [], h=4)
        y = SL.EQ(C, y + 1, r"D_{ij}=2\sum_{g\neq h}w_g^2w_h^2\,s_i s_j", [], h=3)
    else:
        y = blk(s, x, W, y + 1, ["`Cov[P_i,P_j] =`", "`[ a Σ_g u_i u_j + a² D_ij ] / N²`", "¦  3 galaxies        2¦"])
        y = blk(s, x, W, y + 1, ["`D_ij = 2Σ w² w'² s_i s_j`"])
    s.wrap(x, y + 1, W, "Exact; valid for every p at once.", 'b')


def s_parts(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Expand over the partners of galaxy g.")
    y = SL.EQ(C, y + 1, r"\sum_g u_i u_j=T+2D+R", ["`Σ_g u_i u_j = T + 2D + R`"], h=2)
    y = s.table(x, y + 1, [6, 10, 10], [["", "Gauss", "Connected"], ["T", "ξ·shot", "ζ → C^B"], ["D", "1 (shot²)", "ξ → C^P"]], aligns='lll')
    s.wrap(x, y + 1, W, "R: same random twice. Cancels next.", 'd')


def s_rand(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Randoms: same window, no clustering. They give the Gaussian parts.")
    y = SL.EQ(C, y + 1, r"\begin{aligned}\Delta&=\sum_g uu'-\alpha\sum_r uu'\\ D^c&=2\sum c c' w^2 w'^2 s s'\end{aligned}", ["`Δ = Σ_g u u' − α Σ_r u u'`", "`D^c = 2Σ c c' w² w'² s s'`"], h=4)
    y = s.table(x, y + 1, [9, 7, 7], [["partners", "gal", "rand"], ["distinct", "G+C^B", "G"], ["same gal", "unc+cl", "unc"], ["same rand", "fin-R", "fin-R"]], aligns='lll')
    SL.EQ(C, y + 1, r"\begin{aligned}\langle\Delta\rangle&=N^2C^B+2\langle D^c\rangle\\ \langle D^c\rangle&=N^2C^P\end{aligned}", ["`<Δ> = N²C^B + 2<D^c>`", "`<D^c> = N²C^P`"], h=3)


def s_result(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    s.box(x, y, W, 7, 'd', 'b')
    if SL.TEX:
        s.eqs.append(dict(x=x + 2, y=y + 1, w=W - 4, h=3, col='b', tex=r"C^B=\dfrac{\langle\Delta-2D^c\rangle}{N^2}"))
        s.eqs.append(dict(x=x + 2, y=y + 4, w=W - 4, h=2, col='b', tex=r"C^P=\dfrac{\langle D^c\rangle}{N^2}"))
    else:
        s.cput(y + 2, "`C^B = <Δ − 2D^c> / N²`", 'b', x, W)
        s.cput(y + 4, "`C^P = <D^c> / N²`", 'b', x, W)
    y = SL.EQ(C, y + 8, r"C=C^G+C^T+C^B+C^P", ["§C = C^G + C^T + C^B + C^P§"], h=2, col='a')
    y = s.bullet(x, y + 1, W, "C^G: your Gaussian code")
    y = s.bullet(x, y, W, "C^T: trispectrum, SSC (not reachable)")
    s.bullet(x, y, W, "one catalog is noisy: average")


def s_multi(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "A = (shell i, multipole ℓ even). Only the kernel changes:")
    y = SL.EQ(C, y + 1, r"\begin{aligned}K&=\tfrac{2\ell+1}{N}\textstyle\sum\mathcal{L}_\ell(\mu)e^{-i\mathbf{k}\cdot\mathbf{r}}\\ s_A&=\tfrac12\big[K(z,z')+K(z',z)\big]\end{aligned}", ["`K = (2ℓ+1)/N Σ L_ℓ(μ) e^(−ik·r)`", "`s_A = ½[K(z,z') + K(z',z)]`"], h=4)
    y = s.wrap(x, y + 1, W, "Symmetrize so the factor 2 stays valid.")
    y = s.table(x, y + 1, [22, 6], [["toy, ℓ=0,2,4", "max"], ["closed form vs MC", "2.1σ"], ["bispectrum term", "1.9σ"], ["power term", "2.2σ"], ["Poisson null", "2.3σ"]], aligns='lc')


def s_mesh(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    items = [("1 TWO FIELDS", "paint F (w), F2 (w²)"), ("2 FILTER", "per shell, read at objects: u"),
             ("3 TRIPLETS", "Σ u_i u_j − α(randoms): Δ"), ("4 PAIRS", "|F2|² · kernels: D^c")]
    for t, tx in items:
        s.box(x, y, W, 4, 's', 'd')
        s.put(x + 2, y + 1, t, 'a')
        s.put(x + 2, y + 2, tx, 'n')
        y += 4
    s.wrap(x, y + 1, W, "ℓ>0: weights carry Y_ℓm.", 'b')


def s_t1(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Closed form vs 40,000 thinnings:")
    y = SL.chart_vbars(C, y + 1, SL.MC, SL.FM, SL.LAB)
    s.put(x, y, "█ MC  ▒ closed form", 'n')
    s.wrap(x, y + 2, W, "All 10 elements agree.", 'b')


def s_t2(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "est (bright) vs truth, S1..S4:")
    y += 1
    y = SL.panel(s, x, y, W, "BISPECTRUM", [1338, 459, 174, 66], [1350, 462, 174, 68], 1350, lambda v: f"{v:,.0f}", 0)
    y = SL.panel(s, x, y + 1, W, "POWER", [118.8, 74.4, 49.9, 35.2], [119.4, 74.7, 50.2, 35.4], 119.4, lambda v: f"{v:.1f}", 0)


def s_t3(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    y = s.wrap(x, y, W, "Poisson catalogs: connected terms must vanish.")
    y += 1
    for t, raw, sub in (("TRIPLET", "596", "2.7 ± 8.9"), ("PAIR", "2,958", "−0.2 ± 0.4")):
        s.put(x, y, t, 'b')
        s.put(x + 2, y + 1, "raw", 'd'); s.put(x + 9, y + 1, '█' * 20 + ' ' + raw, 'n')
        s.put(x + 2, y + 2, "subtracted", 'd'); s.put(x + 13, y + 2, sub, 'a')
        y += 4
    s.wrap(x, y, W, "All 16 elements within 1σ of zero.", 'b')


def s_lim(C):
    s, x, y, W = C.s, C.x, C.y, C.w
    s.put(x, y, "NOT TESTED YET", 'b')
    y += 1
    for t in ["mesh interpolation, aliasing", "FFT recipe for ℓ>0", "odd multipoles", "integral constraint", "real binning: ridge |i−j|≤1"]:
        y = s.bullet(x, y, W, t)
    y += 1
    s.put(x, y, "KEEP IN MIND", 'b')
    y = s.bullet(x, y + 1, W, "same weights & shot noise in the Gaussian model")
    s.bullet(x, y, W, "ℓ>0 self-term: subtract")


def s_cover(C):
    SL.cover(C)


SLS = [s_cover, s_coinc, s_scale, SL.sl_scaling, s_pairs, s_rew, s_closed, s_parts, s_rand, s_result, SL.sl_corr, s_multi, s_mesh, s_t1, s_t2, SL.sl_t2plot, s_t3, s_lim, SL.sl_density, SL.sl_wiggle, lambda C: SL.sl_wiggle(C, True), SL.sl_anim]
