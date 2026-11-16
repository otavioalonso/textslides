"""Weaving with a frame loom and heddle bar: text-mode slides at 80x24 (m) and 40x25 (s)."""
import sys, math
sys.path.insert(0, '/home/claude/term')
from lib import *
from weave import dd, cyc, STRAIGHT, POINT, cam_lift

TITLES = [
    ("WEAVING WITH A HEDDLE BAR", "WEAVING"),
    ("WARP AND WEFT: OVER ONE, UNDER ONE", "WARP AND WEFT"),
    ("THE FRAME LOOM", "THE FRAME LOOM"),
    ("THE SHED: ONE THROW INSTEAD OF A NEEDLE", "THE SHED"),
    ("THE HEDDLE BAR: SLOTS AND HOLES", "HEDDLE BAR"),
    ("HEDDLE UP, HEDDLE DOWN: THE TWO SHEDS", "TWO SHEDS"),
    ("THE WEAVING CYCLE, PICK BY PICK", "WEAVING CYCLE"),
    ("THE DRAFT: THREADING x LIFTS = CLOTH", "THE DRAFT"),
    ("COLOUR AND WEAVE: PATTERNS FROM PLAIN WEAVE", "COLOUR AND WEAVE"),
    ("BEYOND TWO SHEDS: WHY FOUR SHAFTS", "FOUR SHAFTS"),
    ("DESIGN A: FOUR STACKED BARS AND LIFT CARDS", "DESIGN A: 4 BARS"),
    ("DESIGN B: ONE ROTATING CAM BAR", "DESIGN B: CAM BAR"),
    ("CAM SHAPES AND THE WEAVES THEY GIVE", "CAM SHAPES"),
    ("TWILLS: STRAIGHT AND POINT THREADING", "TWILLS"),
    ("TURNING BACK: DIAMONDS AND HERRINGBONE", "DIAMONDS"),
    ("HOUNDSTOOTH, AND WHAT THE CAM BAR CANNOT DO", "HOUNDSTOOTH"),
    ("PRINTING IT: SIZES AND PITFALLS", "PRINTING IT"),
]
N = len(TITLES)
NOTES = [
    "",
    "Warp: threads held under tension on the loom. Weft: the thread passed across. Plain weave (tabby) alternates over-under, and every row is offset by one end from the last.",
    "The warp is wound around the top and bottom bars at an even spacing (the sett, in ends per cm). Weaving starts at the bottom; the top edge of the cloth is called the fell.",
    "A shed is the gap between two layers of warp. Without one, every row means darning over-under with a needle. With one, a single pass of the shuttle lays a whole row.",
    "The bar has alternating slots and holes. An end in a hole moves with the bar; an end in a slot stays where the warp tension puts it. The bar also spaces the warp and beats the weft.",
    "Bar up: hole ends rise above the slot ends. Bar down: hole ends drop below them. Those are the only two sheds, and alternating them gives plain weave.",
    "Change the shed, throw the shuttle, beat, repeat. Leave the weft at an angle in the shed before beating so the edges do not pull in.",
    "A draft is the weave written as a grid. The threading says which group each end belongs to, the lift column says which groups go up on each pick, and the drawdown is the result.",
    "With only plain weave, patterns come from the order of colours in warp and weft. Gingham is 4 and 4 in both; log cabin swaps the phase of single alternating ends every block.",
    "More sheds need more independent groups of ends, called shafts. With four shafts each pick can lift any combination of four groups, which opens up twills, diamonds and more.",
    "Each bar carries eyes for one quarter of the ends and long slots for the rest. A printed lift card with tabs picks which bars rise on a pick: the lift plan as physical objects.",
    "Each end goes through an eye in its own slim slider. The slider follows a cam on a square shaft. The same cam part, slid on in one of four orientations, sets which group that end belongs to.",
    "The lobe decides the weave: half a turn high gives 2/2 twill, a quarter gives 1/3, three quarters gives 3/1, and two opposite quarters give plain weave. Cam types can be mixed across the warp.",
    "Drawdowns computed from the threading and quarter-turn sequence shown. Straight threading gives a diagonal; point threading 1-2-3-4-3-2 folds it into a zigzag.",
    "Turning the crank back and forth (quarters 1-2-3-4-3-2) mirrors the pattern vertically. With point threading that gives diamonds; reversing the threading with a shift gives herringbone.",
    "Houndstooth is 2/2 twill with 4 ends of each colour in warp and weft. The cam bar only gives lift orders that follow the rotation, so weaves with arbitrary lift plans need Design A.",
    "Numbers here are starting points to test, not measured values. The key design point is that warp tension pushes raised ends down and lowered ends up, so the cam must drive the slider both ways.",
]

WARPA, WEFTA = 'q', 'p'


class Ctx:
    pass


def make(size):
    c = Ctx()
    c.size, c.S = size, size == 's'
    if c.S:
        c.s, c.x, c.y, c.w, c.h = Scr(40, 25), 2, 2, 36, 21
    else:
        c.s, c.x, c.y, c.w, c.h = Scr(80, 24), 2, 2, 76, 20
    c.s.eqs, c.s.plots, c.s.heats, c.s.frames = [], [], [], []
    return c


# ---------------------------------------------------------------- helpers
def heat_dd(s, x, y, M, warpc=None, weftc=None):
    """Drawdown as square half-block pixels (2 picks per text row). Warp on top = -1 (blue), weft = +1."""
    P, E = len(M), len(M[0])
    px = []
    for p in range(P):
        px.append([(warpc[e] if warpc else -1) if M[p][e] else (weftc[p] if weftc else 1) for e in range(E)])
    if P % 2:
        px.append([None] * E)
    rows = len(px) // 2
    s.heats.append(dict(x=x, y=y, cols=E, rows=rows, px=px))
    for r in range(rows):
        for c in range(E):
            t, b = px[2 * r][c], px[2 * r + 1][c]
            ti, bi = t is not None and t < 0, b is not None and b < 0
            s.set(x + c, y + r, {(1, 1): '█', (1, 0): '▀', (0, 1): '▄', (0, 0): ' '}[(ti, bi)], 'n')
    return y + rows


def cells_dd(s, x, y, M):
    """Drawdown with two characters per end and one row per pick."""
    for p, row in enumerate(M):
        for e, up in enumerate(row):
            s.put(x + 2 * e, y + p, '██' if up else '▓▓', WARPA if up else WEFTA)
    return y + len(M)


def key(s, x, y, warp="warp on top", weft="weft on top"):
    s.put(x, y, '██', WARPA)
    x = s.put(x + 3, y, warp, 'd')
    s.put(x + 2, y, '██', WEFTA)
    return s.put(x + 5, y, weft, 'd')


def side(s, x, y, cols, rows, series):
    curve_poly(s, x, y, cols, rows, series, (0, 1), (0, 1))


def cam_art(s, x, y, orient, lobe=(0, 1), cols=10, rows=5, at='a'):
    """A cam outline in braille: radius high over the quarters in `lobe`, rotated by `orient` quarters.
    Angle 0 is up, increasing clockwise; the follower sits at the top."""
    def hi(qpos):
        v = 0.0
        for L in lobe:
            a0 = (L + orient) % 4
            d = (qpos - a0) % 4                      # position inside the quarter, 0..1 when inside
            if d < 1:
                v = 1.0
            else:
                e = min(d - 1, 4 - d)               # distance outside the quarter, in quarters
                v = max(v, 0.5 + 0.5 * math.cos(math.pi * min(1, e / 0.25)) if e < 0.25 else 0)
        return v
    pts = []
    for k in range(241):
        th = 2 * math.pi * k / 240
        r = 0.38 + 0.57 * hi(th / (math.pi / 2))
        pts.append((0.5 + 0.5 * r * math.sin(th), 0.5 + 0.5 * r * math.cos(th)))
    curve_poly(s, x, y, cols, rows, [(pts, at)], (0, 1), (0, 1))
    s.set(x + cols // 2, y + rows // 2, '▪', 'd')


# ---------------------------------------------------------------- slides
def cover(C):
    s, W = C.s, C.s.w
    if C.S:
        s.cput(3, "§WEAVING WITH A HEDDLE BAR§")
        s.cput(4, "and a design for four shafts", 'n')
        E, P, hy = 32, 16, 7
    else:
        s.cput(2, "§WEAVING WITH A HEDDLE BAR§")
        s.cput(3, "frame loom, rigid heddle, and a design for four shafts", 'n')
        E, P, hy = 60, 16, 6
    M = dd(cyc(POINT, E), cam_lift(cyc(POINT, P)))
    heat_dd(s, (W - E) // 2, hy, M)
    sy = hy + P // 2 + 2
    sw = 32 if C.S else 62
    s.wrap((W - sw) // 2, sy, sw,
           "How plain weave is made, how a heddle bar opens the shed, and how a four-shaft heddle bar could be built and what it can weave."
           if not C.S else "Plain weave, the heddle bar, and how a four-shaft bar could work.", 'n', align='c')
    s.cput(22 if not C.S else 23, "¦press ► for the next screen¦")
    s.cur = (W // 2 + 15 if not C.S else W // 2 + 13, 22 if not C.S else 23)


def closeup(s, x, y, nw, nr):
    """Plain weave close-up: warp ends every 4 columns, weft rows every 2 rows."""
    for j in range(nr):
        yy = y + 2 * j
        for xx in range(4 * nw):
            s.set(x + xx, yy, '━', WEFTA)
        for i in range(nw):
            xc = x + 4 * i + 1
            if j + 1 < nr:
                s.set(xc, yy + 1, '┃', WARPA)
            if (i + j) % 2:
                s.set(xc - 1, yy, ' ')
                s.set(xc, yy, '┃', WARPA)
                s.set(xc + 1, yy, ' ')
    return y + 2 * nr - 1


def sl_warpweft(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        y = s.wrap(x0, y0, W, "`Warp`: threads stretched on the loom. `Weft`: the thread passed across, over one end, under the next.")
        y = closeup(s, x0, y + 1, 9, 5)
        y = key(s, x0, y + 2, "warp", "weft")
        s.wrap(x0, y + 2, W, "Each row starts one end later than the last: §plain weave§, or tabby.", 'n')
    else:
        y = s.wrap(x0, y0, 34, "`Warp`: the threads stretched on the loom, under tension, before weaving starts.")
        y = s.wrap(x0, y + 1, 34, "`Weft`: the thread passed across the warp, over one end and under the next.")
        y = s.wrap(x0, y + 1, 34, "The next row does the opposite. That is §plain weave§, or tabby: the simplest and the strongest interlacement.")
        y = s.wrap(x0, y + 1, 34, "Each warp thread is called an §end§; each row of weft is a §pick§.", 'n')
        cy = closeup(s, 40, y0, 9, 8)
        key(s, 40, cy + 2, "warp", "weft")
        s.put(40, cy + 3, "close-up, seen from the front", 'd')


def sl_frame(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        bx, by, bw, bh, ne, ly = x0, y0, 19, 19, 8, x0 + 21
    else:
        bx, by, bw, bh, ne, ly = 40, y0, 20, 20, 8, 62
    s.box(bx, by, bw, bh, 'd', 'n')
    x1 = bx + (bw - 2 * ne + 1) // 2
    hy, sy, fy = by + 6, by + 10, by + bh - 6
    for e in range(ne):
        xc = x1 + 2 * e
        for yy in range(by + 1, fy):
            s.set(xc, yy, '│', WARPA)
    for xx in range(bx + 1, bx + bw - 1):
        s.set(xx, hy, '▓', 'd')
    for e in range(ne):
        s.set(x1 + 2 * e, hy, '●' if e % 2 == 0 else '┃', 'a' if e % 2 == 0 else WARPA)
    for xx in range(x1 - 1, x1 + 2 * ne):
        s.set(xx, sy, '━', WEFTA)
    s.set(x1 - 2, sy, '◀', WEFTA)
    for j, yy in enumerate(range(fy, by + bh - 1)):
        for xx in range(x1 - 1, x1 + 2 * ne):
            s.set(xx, yy, '━', WEFTA)
        for e in range(ne):
            if (e + j) % 2:
                s.set(x1 + 2 * e, yy, '┃', WARPA)
    labels = [(by, "frame, top bar"), (by + 3, "warp"), (hy, "heddle bar"), (sy, "shuttle, weft"),
              (fy, "fell"), (fy + 2, "woven cloth"), (by + bh - 1, "bottom bar")]
    short = {"frame, top bar": "top bar", "heddle bar": "heddle", "shuttle, weft": "shuttle", "woven cloth": "cloth"}
    for yy, t in labels:
        s.put(ly, yy, '◀ ' + (short.get(t, t) if C.S else t), 'd')
    if not C.S:
        y = s.wrap(x0, y0, 36, "A rectangular frame holds the warp. The warp is wound round the top and bottom bars at an even spacing, the §sett§, counted in ends per cm.")
        y = s.wrap(x0, y + 1, 36, "Weaving starts at the bottom bar and builds upward. The top edge of the cloth is the §fell§.")
        y = s.wrap(x0, y + 1, 36, "The heddle bar sits across the warp and every end passes through it.")


def sl_shed(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        y = s.wrap(x0, y0, W, "Without help, every pick means darning over-under each end with a needle.")
        y = s.wrap(x0, y + 1, W, "A §shed§ separates the warp into two layers. One pass of the shuttle then lays a whole pick.")
        cols, rows, dy = 36, 7, y + 1
    else:
        y = s.wrap(x0, y0, W, "Without help, every pick means darning over-under each end with a needle: slow, and easy to get wrong.")
        y = s.wrap(x0, y + 1, W, "A §shed§ splits the warp into two layers. One pass of the shuttle through the gap lays the whole pick.")
        cols, rows, dy = 64, 9, y + 2
    fx, hx = 0.14, 0.6
    up = [(fx, .5), (hx, .92), (1, .62)]
    dn = [(fx, .5), (hx, .08), (1, .38)]
    cl = [(0, .5), (fx, .5)]
    side(s, x0, dy, cols, rows, [(cl, WEFTA), (up, WARPA), (dn, WARPA)])
    s.set(x0 + int(cols * 0.42), dy + rows // 2, '◆', WEFTA)
    s.put(x0 + int(cols * 0.42) + 2, dy + rows // 2, "shuttle", 'p')
    s.put(x0, dy + rows, "cloth", 'd')
    s.put(x0 + int(cols * hx) - 2, dy + rows, "shed", 'd')
    s.rput(dy + rows, "to back bar", 'd', x0 + cols)
    s.put(x0, dy + rows + 2, "side view, warp runs left to right" if not C.S else "side view", 'd')


def heddle_front(s, x, y, n, h):
    """Front view: material ▓, slots (blank, end shown ┃) and holes (● in the material)."""
    w = 3 * n + 1
    for xx in range(w):
        s.set(x + xx, y, '▄', 'd')
        s.set(x + xx, y + h + 1, '▀', 'd')
    mid = y + 1 + h // 2
    for k in range(n):
        xs = x + 3 * k
        for yy in range(y + 1, y + h + 1):
            s.set(xs, yy, '█', 'd')
            s.set(xs + 1, yy, ' ' if k % 2 == 0 else '█', 'd')
            s.set(xs + 2, yy, '█', 'd')
        if k % 2 == 0:
            s.set(xs + 1, mid, '┃', WARPA)
        else:
            s.set(xs + 1, mid, '●', 'a')
    for yy in range(y + 1, y + h + 1):
        s.set(x + w - 1, yy, '█', 'd')
    return y + h + 2


def sl_heddle(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        y = heddle_front(s, x0 + 1, y0, 11, 5)
        s.put(x0 + 1, y, '┃', WARPA); s.put(x0 + 3, y, "in a slot", 'd'); s.put(x0 + 14, y, '●', 'a'); s.put(x0 + 16, y, "in a hole", 'd')
        y = s.bullet(x0, y + 2, W, "End in a §hole§: moves with the bar.", '•')
        y = s.bullet(x0, y, W, "End in a `slot`: stays where the warp tension puts it.", '•')
        y = s.bullet(x0, y, W, "The bar also spaces the ends and beats the weft in.", '•')
    else:
        heddle_front(s, 44, y0 + 1, 11, 9)
        s.put(44, y0 + 13, '┃', WARPA); s.put(46, y0 + 13, "end in a slot", 'd'); s.put(61, y0 + 13, '●', 'a'); s.put(63, y0 + 13, "end in a hole", 'd')
        s.put(44, y0 + 14, "front view: ends run into the page", 'd')
        y = s.wrap(x0, y0, 38, "A rigid heddle is one bar with alternating `slots` and `holes`, one end through each.")
        y = s.bullet(x0, y + 1, 38, "An end in a §hole§ is held by the bar: it goes up and down with it.")
        y = s.bullet(x0, y + 1, 38, "An end in a `slot` is free to slide: it stays on the straight line between the bars.")
        y = s.bullet(x0, y + 1, 38, "The same bar keeps the ends evenly spaced, and is pulled toward you to beat each pick into place.")
        s.wrap(x0, y + 1, 38, "Spacing of slots and holes = the sett, e.g. ¦10 dents per inch¦.", 'n')


def sl_twosheds(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    fx, hx = 0.12, 0.55
    slot = [(fx, .5), (1, .5)]
    hup = [(fx, .5), (hx, .95), (1, .5)]
    hdn = [(fx, .5), (hx, .05), (1, .5)]
    cl = [(0, .5), (fx, .5)]
    if C.S:
        cols, rows = 34, 5
        panels = [(y0, "heddle §UP§", hup), (y0 + 8, "heddle §DOWN§", hdn)]
        for py, lab, hl in panels:
            s.put(x0, py, lab, 'n')
            side(s, x0, py + 1, cols, rows, [(cl, WEFTA), (slot, WARPA), (hl, 'a')])
            xh = x0 + int(cols * hx)
            for yy in range(py + 1, py + 1 + rows):
                if s.c[yy][xh] == ' ':
                    s.set(xh, yy, '┊', 'd')
        y = y0 + 16
    else:
        cols, rows = 34, 7
        for k, (lab, hl) in enumerate((("heddle §UP§: hole ends rise", hup), ("heddle §DOWN§: hole ends drop", hdn))):
            px = x0 + k * (cols + 6)
            s.put(px, y0, lab, 'n')
            side(s, px, y0 + 2, cols, rows, [(cl, WEFTA), (slot, WARPA), (hl, 'a')])
            xh = px + int(cols * hx)
            for yy in range(y0 + 2, y0 + 2 + rows):
                if s.c[yy][xh] == ' ':
                    s.set(xh, yy, '┊', 'd')
            s.put(xh - 3, y0 + 2 + rows, "heddle", 'd')
        y = y0 + 12
    s.put(x0, y, '━━', 'a')
    xx = s.put(x0 + 3, y, "ends in holes", 'd')
    s.put(xx + 2, y, '━━', WARPA)
    s.put(xx + 5, y, "ends in slots", 'd')
    s.wrap(x0, y + 2, W, "Only two sheds exist, and alternating them gives plain weave. Any other structure needs more groups of ends." if not C.S
           else "Two sheds, alternating: plain weave.", 'n')


def sl_cycle(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        E, P, cx, top, fell0, hy, tx, ty = 12, 7, x0 + 4, y0, y0 + 13, y0 + 3, x0, y0 + 15
    else:
        E, P, cx, top, fell0, hy, tx, ty = 14, 9, x0 + 3, y0, y0 + 18, y0 + 4, 40, y0 + 1
    steps = ["change the shed: heddle up/down", "throw the shuttle through", "beat: heddle to the fell"]
    if C.S:
        steps = ["change shed: heddle up/down", "throw the shuttle", "beat with the heddle"]

    def raised(k):  # pick k: heddle up on even picks -> hole ends (even e) up
        return {e for e in range(E) if (e % 2 == 0) == (k % 2 == 0)}

    base = ([r[:] for r in s.c], [r[:] for r in s.a])

    def draw(sc, k, ph, frac=1.0):
        done = k if ph < 2 else k + 1
        fell = fell0 - done
        for j in range(done):
            R = raised(j)
            for e in range(E):
                up = e in R
                sc.put(cx + 2 * e, fell0 - j, '██' if up else '▓▓', WARPA if up else WEFTA)
        R = raised(k)
        for e in range(E):
            for yy in range(top, fell + 1):
                sc.set(cx + 2 * e, yy, '┃' if e in R else '│', WARPA if e in R else 'd')
        for xx in range(cx - 1, cx + 2 * E):
            sc.set(xx, hy, '▓', 'd')
        for e in range(E):
            sc.set(cx + 2 * e, hy, '●' if e % 2 == 0 else '┃', 'a' if e % 2 == 0 else (WARPA if e in R else 'd'))
        up = k % 2 == 0
        sc.put(cx - 3 if not C.S else cx - 4, hy, '▲' if up else '▼', 'a')
        if ph == 1:
            n = max(1, round(frac * (2 * E + 1)))
            row = fell
            if k % 2 == 0:
                for i in range(n):
                    sc.set(cx - 1 + i, row, '━', WEFTA)
                sc.set(cx - 1 + n, row, '▶', WEFTA)
            else:
                for i in range(n):
                    sc.set(cx + 2 * E - 1 - i, row, '━', WEFTA)
                sc.set(cx + 2 * E - 1 - n, row, '◀', WEFTA)
        if C.S:
            sc.put(tx, ty, f"pick {k + 1} of {P}", 'b')
            sc.rput(ty, "heddle " + ("UP" if up else "DOWN"), 'a', tx + W)
            for i, t in enumerate(steps):
                cur = i == ph
                sc.put(tx, ty + 2 + i, ('▶ ' if cur else '  ') + f"{i + 1} {t}", 'b' if cur else 'd')
        else:
            sc.put(tx, ty, f"pick {k + 1} of {P}", 'b')
            sc.put(tx + 16, ty, "heddle " + ("UP  ▲" if up else "DOWN ▼"), 'a')
            for i, t in enumerate(steps):
                cur = i == ph
                sc.put(tx, ty + 2 + i, ('▶ ' if cur else '  ') + f"{i + 1}  {t}", 'b' if cur else 'd')
            sc.wrap(tx, ty + 7, 36, "Raised ends are drawn bright. The heddle alternates, so each pick covers the ends the last one left exposed.", 'd')
            sc.wrap(tx, ty + 12, 36, "Tip: lay the weft at an angle in the shed before beating, so the edges do not pull in.", 'd')

    seq = []
    for k in range(P):
        seq += [(k, 0, 1)] * 4 + [(k, 1, .33)] * 2 + [(k, 1, .66)] * 2 + [(k, 1, 1.0)] * 2 + [(k, 2, 1)] * 4
    seq += [(P - 1, 2, 1)] * 10
    for k, ph, fr in seq:
        sc = Scr(s.w, s.h)
        sc.c, sc.a = [r[:] for r in base[0]], [r[:] for r in base[1]]
        draw(sc, k, ph, fr)
        r, at = sc.lines()
        s.frames.append(dict(chars=r, attrs=at))
    draw(s, P // 2, 1, .5)


def sl_draft(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    E, P = (10, 8) if C.S else (12, 10)
    thr = [e % 2 for e in range(E)]
    lift = [{p % 2} for p in range(P)]
    M = dd(thr, lift)
    gx = x0 + 6
    for e in range(E):
        s.put(gx + 2 * e, y0 + 1, 'H' if thr[e] == 0 else 'S', 'a' if thr[e] == 0 else WARPA)
    s.put(x0, y0 + 1, "thr.", 'd')
    s.put(gx, y0, "threading", 'd')
    for p in range(P):
        s.put(x0 + 1, y0 + 3 + p, 'U' if p % 2 == 0 else 'D', 'a')
    s.put(x0, y0 + 2, "lift", 'd')
    y = cells_dd(s, gx, y0 + 3, M)
    if C.S:
        key(s, x0, y + 1)
        s.wrap(x0, y + 3, W, "H hole, S slot; U heddle up, D down. A cell shows the warp where its end is raised.", 'd')
    else:
        key(s, x0, y + 1)
        tx = 36
        yy = s.wrap(tx, y0, 40, "A §draft§ writes a weave as a grid:")
        yy = s.bullet(tx, yy + 1, 40, "`threading`: which group each end is in. Here H (hole) or S (slot).")
        yy = s.bullet(tx, yy + 1, 40, "`lift plan`: which groups go up on each pick. Here U (heddle up: holes) or D (down: slots).")
        yy = s.bullet(tx, yy + 1, 40, "`drawdown`: a cell shows the warp where that end is raised on that pick, the weft otherwise.")
        s.wrap(tx, yy + 1, 40, "The rest of this deck computes drawdowns this way.", 'd')


def sl_colour(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    E = 24 if not C.S else 16
    P = E
    thr = [e % 2 for e in range(E)]
    lift = [{p % 2} for p in range(P)]
    M = dd(thr, lift)
    ging = [-1 if (e // 4) % 2 == 0 else 1 for e in range(E)]
    lc = [(-1 if e % 2 == 0 else 1) * (1 if (e // 8) % 2 == 0 else -1) for e in range(E)]
    gwf = [-1 if (p // 4) % 2 == 0 else 1 for p in range(P)]
    lwf = [(1 if p % 2 == 0 else -1) * (1 if (p // 8) % 2 == 0 else -1) for p in range(P)]
    if C.S:
        y = s.wrap(x0, y0, W, "Plain weave + colour order in warp and weft:")
        heat_dd(s, x0, y + 1, M, ging, gwf)
        heat_dd(s, x0 + 19, y + 1, M, lc, lwf)
        s.put(x0, y + 2 + P // 2, "gingham", 'b')
        s.put(x0 + 19, y + 2 + P // 2, "log cabin", 'b')
        s.wrap(x0, y + 4 + P // 2, W, "4-and-4 vs single ends alternating, phase flipped every 8.", 'd')
    else:
        y = s.wrap(x0, y0, W, "With only two sheds, patterns come from the §order of colours§ in warp and weft. Same plain weave in both:")
        heat_dd(s, x0, y + 1, M, ging, gwf)
        heat_dd(s, x0 + 40, y + 1, M, lc, lwf)
        s.put(x0 + 26, y + 2, "gingham", 'b')
        s.wrap(x0 + 26, y + 3, 12, "4 ends of each colour, same in the weft", 'd')
        s.put(x0 + 66, y + 2, "log cabin", 'b')
        s.wrap(x0 + 66, y + 3, 10, "colours alternate end by end; the phase flips every 8", 'd')
        s.put(x0, y + 3 + P // 2, '██', WARPA)
        xx = s.put(x0 + 3, y + 3 + P // 2, "yarn A", 'd')
        s.put(xx + 2, y + 3 + P // 2, '██', WEFTA)
        s.put(xx + 5, y + 3 + P // 2, "yarn B", 'd')


def sl_why4(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        y = s.wrap(x0, y0, W, "Two sheds = plain weave only. Tricks for more:")
        y = s.bullet(x0, y + 1, W, "a §pick-up stick§ behind the heddle: one fixed extra shed")
        y = s.bullet(x0, y, W, "§two heddles§: three or four groups")
        y = s.wrap(x0, y + 1, W, "General answer: four independent groups of ends, `shafts`. Each pick lifts any set of them:")
        y += 1
        s.put(x0, y, "lifts per pick  weave", 'd')
        rows = [("1 1 3 3 …", "plain"), ("12 23 34 41", "2/2 twill"), ("1 2 3 4", "1/3 twill")]
        for a, b in rows:
            y += 1
            s.put(x0, y, a, 'a')
            s.put(x0 + 14, y, b, 'n')
        return
    y = s.wrap(x0, y0, W, "A rigid heddle gives two sheds, so only plain weave. Weavers add sheds with tricks:")
    y = s.bullet(x0, y + 1, W, "a §pick-up stick§ behind the heddle, turned on edge: one extra, fixed shed (floats, textures)")
    y = s.bullet(x0, y, W, "§two heddles§ together: three or four groups, with fiddly lifting")
    y = s.wrap(x0, y + 1, W, "The general answer is four independent groups of ends, called `shafts`. Threading puts each end on a shaft; each pick lifts any subset of the four.")
    y += 1
    s.table(x0, y, [22, 14, 24], [["lifts per pick", "weave", "look"],
                                   ["1+3, 2+4", "plain weave", "same as the heddle"],
                                   ["12, 23, 34, 41", "2/2 twill", "diagonal ribs"],
                                   ["1, 2, 3, 4", "1/3 twill", "weft-faced diagonal"],
                                   ["123, 234, 341, 412", "3/1 twill", "warp-faced diagonal"]], head='b')


def sl_designA(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    E = 16 if not C.S else 12
    if C.S:
        y = s.wrap(x0, y0, W, "Four thin bars, one behind the other. Bar k has §eyes§ for shaft-k ends, long `slots` elsewhere:")
    else:
        y = s.wrap(x0, y0, W, "Four thin heddle bars stacked front to back. Bar k has §eyes§ (●) for the ends on shaft k and long `slots` (│) for all the others, so each bar lifts only its own ends.")
    y += 1
    for k in range(4):
        s.put(x0, y + k, f"bar {k + 1}", 'd')
        for e in range(E):
            s.set(x0 + 7 + 2 * e, y + k, '●' if e % 4 == k else '│', 'a' if e % 4 == k else 'd')
    s.put(x0 + 7, y + 4, ''.join(f"{e % 4 + 1} " for e in range(E)).rstrip(), WARPA)
    s.put(x0, y + 4, "shaft", 'd')
    y += 6
    if C.S:
        y = s.bullet(x0, y, W, "Slots at least 2× the shed height long.")
        y = s.bullet(x0, y, W, "A printed §lift card§ with tabs raises the chosen bars; one card per pick.")
        s.bullet(x0, y, W, "Any lift plan works; the cost is changing cards.")
        return
    lx = x0 + 44
    s.put(lx, y0 + 4, "lift cards (tabs = bars raised)", 'd')
    cards = [(1, 2), (2, 3), (3, 4), (4, 1)]
    for i, cset in enumerate(cards):
        cy = y0 + 5 + i
        s.put(lx, cy, f"pick {i + 1}", 'd')
        for b in range(4):
            s.put(lx + 8 + 3 * b, cy, '▀▀' if b + 1 in cset else '──', 'a' if b + 1 in cset else 'd')
    s.put(lx + 8, y0 + 9, "1  2  3  4", 'd')
    y = s.bullet(x0, y, W, "Slots must be at least twice the shed height, so an end can ride from bottom to top while its own bar moves and the others stay put.")
    y = s.bullet(x0, y, W, "A printed §lift card§ with tabs slides under the bars and raises the chosen ones; notches in the side posts hold them. One card per pick type.")
    s.bullet(x0, y, W, "Fully general: any lift plan, any order. The price is handling cards, and four bars of friction on every end.")


def sl_designB(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        y = s.wrap(x0, y0, W, "Each end runs through an eye in a slim §slider§; the slider's foot follows a §cam§ on a square shaft.")
        cy = y + 1
        for o in range(4):
            cam_art(s, x0 + 9 * o, cy, o, cols=8, rows=4)
            s.put(x0 + 4 + 9 * o, cy + 4, "ABCD"[o], 'b')
        y = cy + 6
        s.put(x0, y, "turn   1 2 3 4", 'd')
        for o in range(4):
            st = ''.join(('▲' if (q - o) % 4 in (0, 1) else '▽') + ' ' for q in range(4))
            s.put(x0, y + 1 + o, f"cam {'ABCD'[o]}  " + st, 'a')
        s.wrap(x0 + 17, y + 1, 19, "Same part, 4 ways on the shaft = 4 shafts. A quarter turn per pick.", 'n')
        return
    y = s.wrap(x0, y0, W, "One crank instead of four bars. Each end runs through the eye of a slim printed §slider§; the slider's foot rides on a §cam§. All cams sit on one square shaft.")
    cy = y + 1
    for o in range(4):
        cam_art(s, x0 + 11 * o, cy, o)
        s.put(x0 + 3 + 11 * o, cy + 5, f"{'ABCD'[o]} {90 * o}°", 'b')
    tx = x0 + 47
    s.put(tx, cy, "quarter turn   1 2 3 4", 'd')
    for o in range(4):
        st = ''.join(('▲' if (q - o) % 4 in (0, 1) else '▽') + ' ' for q in range(4))
        s.put(tx, cy + 1 + o, f"cam {'ABCD'[o]}          " + st, 'a')
    y = cy + 7
    y = s.bullet(x0, y, W, "The cam is one part with a square bore. Slid on in one of four orientations, it puts its end on shaft A, B, C or D: §threading = orientation§.")
    y = s.bullet(x0, y, W, "Each quarter turn of the crank is one pick. With a lobe of half a turn, two shafts are up and two are down on every pick: 2/2 twill with no lift plan to remember.")
    s.bullet(x0, y, W, "Turning back reverses the order, which is how the diamonds two slides on are made.")


def sl_cams(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    kinds = [("half", (0, 1), "2/2 twill"), ("quarter", (0,), "1/3 twill"), ("3 quarters", (0, 1, 2), "3/1 twill"), ("opposite", (0, 2), "plain")]
    E = 12
    if C.S:
        y = s.wrap(x0, y0, W, "The lobe shape picks the weave:")
        for i, (nm, lobe, wv) in enumerate(kinds):
            px, py = x0 + (i % 2) * 19, y + 1 + (i // 2) * 10
            cam_art(s, px, py, 0, lobe, cols=6, rows=3)
            s.put(px + 7, py, nm, 'b')
            s.put(px + 7, py + 1, wv, 'a')
            M = dd(cyc(STRAIGHT, E), cam_lift(cyc([0, 1, 2, 3], 8), lobe))
            heat_dd(s, px, py + 4, M)
        return
    y = s.wrap(x0, y0, W, "The lobe of the cam decides how many quarter turns its end stays up. Each panel: straight threading A-B-C-D, crank turned 1-2-3-4.")
    for i, (nm, lobe, wv) in enumerate(kinds):
        px, py = x0 + 19 * i, y + 1
        cam_art(s, px + 1, py, 0, lobe, cols=10, rows=5)
        s.put(px, py + 6, nm + " lobe", 'b')
        s.put(px, py + 7, wv, 'a')
        M = dd(cyc(STRAIGHT, E), cam_lift(cyc([0, 1, 2, 3], 12), lobe))
        heat_dd(s, px, py + 9, M)
    s.wrap(x0, y + 16, W, "Cam types can be mixed across the warp, e.g. plain-weave cams at the edges for a firm selvedge.", 'd')


def two_dd(C, items):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    E, P = (16, 16) if C.S else (32, 24)
    for i, (title, thr, qs, sub) in enumerate(items):
        px = x0 + i * (19 if C.S else 39)
        s.put(px, y0, title, 'b')
        s.put(px, y0 + 1, ''.join(str('ABCD'[t]) for t in cyc(thr, E)), WARPA)
        y = heat_dd(s, px, y0 + 2, dd(cyc(thr, E), cam_lift(cyc(qs, P))))
        s.wrap(px, y + 1, 17 if C.S else 36, sub, 'd')
    return y0 + 2 + P // 2


def sl_twills(C):
    two_dd(C, [("straight", STRAIGHT, [0, 1, 2, 3], "threading A B C D, crank 1 2 3 4, repeat" if not C.S else "ABCD, turn on"),
               ("point (chevron)", POINT, [0, 1, 2, 3], "threading A B C D C B, crank 1 2 3 4" if not C.S else "ABCDCB, turn on")])
    if not C.S:
        key(C.s, C.x, 20)


def sl_diamonds(C):
    hb = [0, 1, 2, 3, 0, 1, 2, 3, 1, 0, 3, 2, 1, 0, 3, 2]
    two_dd(C, [("diamond", POINT, POINT, "threading A B C D C B, crank 1 2 3 4 3 2 (forward, then back)" if not C.S else "ABCDCB, turn 1234 back 32"),
               ("herringbone", hb, [0, 1, 2, 3], "threading ABCD ABCD BADC BADC, crank 1 2 3 4" if not C.S else "ABCDABCD BADCBADC")])
    if not C.S:
        key(C.s, C.x, 20)


def sl_hounds(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    E = 32 if not C.S else 16
    M = dd(cyc(STRAIGHT, E), cam_lift(cyc([0, 1, 2, 3], E)))
    wc = [-1 if ((e + 1) // 4) % 2 else 1 for e in range(E)]
    fc = [-1 if ((p + 1) // 4) % 2 else 1 for p in range(E)]
    if C.S:
        heat_dd(s, x0, y0, M, wc, fc)
        s.wrap(x0 + 18, y0, 18, "2/2 twill, 4 dark 4 light in warp and weft: §houndstooth§.")
        y = y0 + 10
        y = s.wrap(x0, y, W, "Limit: the cam bar only lifts in rotation order (forward or back). Lift plans that jump around need Design A.", 'n')
        return
    heat_dd(s, x0, y0, M, wc, fc)
    tx = x0 + 35
    y = s.wrap(tx, y0, 41, "§Houndstooth§: the straight 2/2 twill from the cam bar, with 4 ends of yarn A and 4 of yarn B in the warp, and the same in the weft.")
    y = s.wrap(tx, y + 1, 41, "What the cam bar cannot do:", 'b')
    y = s.bullet(tx, y + 1, 41, "lift plans that jump around, such as overshot or summer-and-winter: the next pick is always one quarter turn away")
    y = s.bullet(tx, y, 41, "change the weave mid-cloth without re-threading cams")
    s.wrap(tx, y + 1, 41, "Both are easy with Design A's lift cards, so the two designs complement each other.", 'd')


def sl_print(C):
    s, x0, y0, W = C.s, C.x, C.y, C.w
    if C.S:
        items = ["One slider per end: slider pitch = sett. At 10 ends/inch that is 2.5 mm, so ~2 mm sliders in a comb.",
                 "Cam lift ≈ shed height at the heddle, ~2 cm.",
                 "Warp tension pushes raised ends down and lowered ends up: use a §grooved cam§ that drives both ways.",
                 "4 clicks per turn on the crank.",
                 "Start with 8 ends."]
        y = y0
        for t in items:
            y = s.bullet(x0, y, W, t)
        return
    s.put(x0, y0, "Starting points to test, not measured values:", 'd')
    rows = [["sett", "10 ends/inch = 2.5 mm pitch", "~2 mm slider + 0.5 mm gap"],
            ["shed height", "~2 cm at the heddle", "cam lift ≈ shed height"],
            ["shaft", "square, 4 keyed faces", "hex shaft: 6 orientations"],
            ["crank", "detent, 4 clicks per turn", "count picks by clicks"]]
    y = s.table(x0, y0 + 1, [12, 27, 27], [["part", "value", "consequence"]] + rows, head='b')
    y = s.bullet(x0, y + 1, W, "§Pitfall:§ warp tension pushes raised ends down and lowered ends up. A cam the slider only rests on will lose it; use a grooved (box) cam or a pin in a slot.")
    y = s.bullet(x0, y, W, "Print the eyes smooth and chamfered, or glue in a short tube: rough eyes fray the warp.")
    s.bullet(x0, y, W, "Build a test with 8 ends and two cams first; check shed height and slider friction under tension.")


SLIDES = [cover, sl_warpweft, sl_frame, sl_shed, sl_heddle, sl_twosheds, sl_cycle, sl_draft, sl_colour, sl_why4,
          sl_designA, sl_designB, sl_cams, sl_twills, sl_diamonds, sl_hounds, sl_print]
assert len(SLIDES) == N
