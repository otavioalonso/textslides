"""Character-grid drawing helpers for the text-mode slides.

Attribute codes per cell: n normal, b bright, d dim, a accent, r reverse video.
Inline markup in strings: `bright`  §accent§  ¦dim¦
"""
import random


def parse(text, base='n'):
    cells, b, a, d = [], False, False, False
    for ch in text:
        if ch == '`':
            b = not b
            continue
        if ch == '§':
            a = not a
            continue
        if ch == '¦':
            d = not d
            continue
        at = 'a' if a else 'b' if b else 'd' if d else base
        cells.append((ch, at))
    return cells


def vlen(text):
    return len(parse(text))


def wrap_cells(text, w, base='n', hang=0):
    """Greedy word wrap -> list of (cells, is_first_line). A newline forces a break."""
    out = []
    for para in text.split('\n'):
        words, cur = [], []
        for cell in parse(para, base):
            if cell[0] == ' ':
                if cur:
                    words.append(cur)
                    cur = []
            else:
                cur.append(cell)
        if cur:
            words.append(cur)
        line, first = [], True
        for wd in words:
            lim = w if first else w - hang
            if line and len(line) + 1 + len(wd) > lim:
                out.append((line, first))
                line, first = [], False
            if line:
                line.append((' ', base))
            line.extend(wd)
        out.append((line, first))
    return out


class Scr:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.c = [[' '] * w for _ in range(h)]
        self.a = [['n'] * w for _ in range(h)]
        self.bad = []
        self.cur = None

    def set(self, x, y, ch, a='n'):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y][x] = ch
            self.a[y][x] = a
        elif ch != ' ':
            self.bad.append((x, y, ch))

    def put(self, x, y, text, a='n'):
        cells = parse(text, a)
        for i, (ch, at) in enumerate(cells):
            self.set(x + i, y, ch, at)
        return x + len(cells)

    def cput(self, y, text, a='n', x=0, w=None):
        w = self.w if w is None else w
        n = vlen(text)
        self.put(x + (w - n) // 2, y, text, a)

    def rput(self, y, text, a='n', x1=None):
        x1 = self.w if x1 is None else x1
        self.put(x1 - vlen(text), y, text, a)

    def fill(self, x, y, w, h, ch=' ', a='n'):
        for j in range(h):
            for i in range(w):
                self.set(x + i, y + j, ch, a)

    def wrap(self, x, y, w, text, a='n', hang=0, align='l'):
        for line, first in wrap_cells(text, w, a, hang):
            ox = 0 if first else hang
            if align == 'c':
                ox = (w - len(line)) // 2
            for i, (ch, at) in enumerate(line):
                self.set(x + ox + i, y, ch, at)
            y += 1
        return y

    def bullet(self, x, y, w, text, mark='•', a='n', ma=None):
        self.put(x, y, mark, ma or a)
        return self.wrap(x + 2, y, w - 2, text, a)

    def hline(self, x, y, w, ch='─', a='d'):
        for i in range(w):
            self.set(x + i, y, ch, a)

    def box(self, x, y, w, h, style='s', a='d', title=None, ta='b'):
        tl, tr, bl, br, hz, vt = {'s': '┌┐└┘─│', 'd': '╔╗╚╝═║'}[style]
        self.set(x, y, tl, a)
        self.set(x + w - 1, y, tr, a)
        self.set(x, y + h - 1, bl, a)
        self.set(x + w - 1, y + h - 1, br, a)
        for i in range(1, w - 1):
            self.set(x + i, y, hz, a)
            self.set(x + i, y + h - 1, hz, a)
        for j in range(1, h - 1):
            self.set(x, y + j, vt, a)
            self.set(x + w - 1, y + j, vt, a)
        if title:
            self.put(x + 2, y, ' ' + title + ' ', ta)

    def table(self, x, y, widths, rows, a='n', head='b', pad=1, aligns=None, rule_rows=False):
        """Boxed table. rows[0] is the header when head is not None. Returns the next free y."""
        ncol = len(widths)
        aligns = aligns or 'l' * ncol

        def hr(yy, l, m, r):
            xx = x
            self.set(xx, yy, l, 'd')
            xx += 1
            for k, wd in enumerate(widths):
                for _ in range(wd + 2 * pad):
                    self.set(xx, yy, '─', 'd')
                    xx += 1
                self.set(xx, yy, m if k < ncol - 1 else r, 'd')
                xx += 1

        hr(y, '┌', '┬', '┐')
        y += 1
        for ri, row in enumerate(rows):
            base = head if (ri == 0 and head) else a
            cells = [wrap_cells(t, widths[k], base) for k, t in enumerate(row)]
            hgt = max(len(c) for c in cells)
            for j in range(hgt):
                xx = x
                self.set(xx, y + j, '│', 'd')
                xx += 1
                for k, c in enumerate(cells):
                    line = c[j][0] if j < len(c) else []
                    off = pad + {'l': 0, 'c': (widths[k] - len(line)) // 2, 'r': widths[k] - len(line)}[aligns[k]]
                    for i, (ch, at) in enumerate(line):
                        self.set(xx + off + i, y + j, ch, at)
                    xx += widths[k] + 2 * pad
                    self.set(xx, y + j, '│', 'd')
                    xx += 1
            y += hgt
            if ri == 0 and head:
                hr(y, '├', '┼', '┤')
                y += 1
            elif rule_rows and ri < len(rows) - 1:
                hr(y, '├', '┼', '┤')
                y += 1
        hr(y, '└', '┴', '┘')
        return y + 1

    def lines(self):
        return [''.join(r) for r in self.c], [''.join(r) for r in self.a]


def table_width(widths, pad=1):
    return sum(widths) + 2 * pad * len(widths) + len(widths) + 1


def seg_width(parts):
    return sum(vlen(t) for t, _ in parts)


def seg_line(s, x, y, parts):
    spans = []
    for text, a in parts:
        x0 = x
        x = s.put(x, y, text, a)
        spans.append((x0, x))
    return spans


def brace(s, x, y, w, label, a='d'):
    inner = (' ' + label + ' ').center(w - 2, '─')
    s.put(x, y, '└' + inner + '┘', a)


def hbar(v, vmax, w):
    e = max(0, min(w * 8, int(round(v / vmax * w * 8))))
    full, rem = divmod(e, 8)
    return '█' * full + ('' if rem == 0 else ' ▏▎▍▌▋▊▉'[rem])


def vbar_col(v, vmax, h):
    e = max(0, min(h * 8, int(round(v / vmax * h * 8))))
    full, rem = divmod(e, 8)
    col = [' '] * h
    for k in range(full):
        col[h - 1 - k] = '█'
    if rem and full < h:
        col[h - 1 - full] = '▁▂▃▄▅▆▇'[rem - 1]
    return col


F5 = {
    'T': ['#####', '..#..', '..#..', '..#..', '..#..'],
    'H': ['#...#', '#...#', '#####', '#...#', '#...#'],
    'I': ['#####', '..#..', '..#..', '..#..', '#####'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
    'G': ['.####', '#....', '#..##', '#...#', '.####'],
}
F3 = {
    'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'I': ['###', '.#.', '.#.', '.#.', '###'],
    'N': ['#..#', '##.#', '#.##', '#..#', '#..#'],
    'G': ['###', '#..', '#.#', '#.#', '###'],
}


def banner(word, font, sx=1, gap=1):
    rows = [''] * 5
    for chv in word:
        g = font[chv]
        for r in range(5):
            rows[r] += ''.join(('█' if p == '#' else ' ') * sx for p in g[r]) + ' ' * gap
    return [r.rstrip() for r in rows]


def dot_field(s, x, y, w, h, n, seed, keep=0.6):
    """Galaxies scattered with a density that grows to the right; filled = kept, hollow = thinned away."""
    rnd = random.Random(seed)
    occ, placed, tries = set(), 0, 0
    while placed < n and tries < n * 80:
        tries += 1
        cx, cy = rnd.randrange(w), rnd.randrange(h)
        if rnd.random() > 0.12 + 0.88 * cx / w:
            continue
        if any((cx + dx, cy + dy) in occ for dx in range(-2, 3) for dy in range(-1, 2)):
            continue
        occ.add((cx, cy))
        placed += 1
        kept = rnd.random() < keep
        s.set(x + cx, y + cy, '●' if kept else '○', 'b' if kept else 'd')


# ---------------------------------------------------------------- curve plotting at several densities
_BR = [[0x01, 0x02, 0x04, 0x40], [0x08, 0x10, 0x20, 0x80]]


def _line(pts, put):
    """Bresenham through the list of integer points."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            put(x0, y0)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy


def curve_plot(s, x, y, cols, rows, curves, xmax, ymax, mode='braille'):
    """curves: list of (f, attr). Draws into the cols x rows block at (x, y).
    mode: 'dot' (one marker per column), 'half' (1x2 per cell), 'braille' (2x4 per cell)."""
    if mode == 'dot':
        for f, at in curves:
            for c in range(cols):
                v = f(xmax * c / (cols - 1))
                r = rows - 1 - round(v / ymax * (rows - 1))
                if 0 <= r < rows:
                    s.set(x + c, y + r, '●', at)
        return
    rx, ry = (2, 4) if mode == 'braille' else (1, 2)
    pw, ph = cols * rx, rows * ry
    cell = {}
    for f, at in curves:
        pts = []
        for px in range(pw):
            v = f(xmax * px / (pw - 1))
            pts.append((px, (ph - 1) - round(v / ymax * (ph - 1))))

        def put(px, py, at=at):
            if 0 <= px < pw and 0 <= py < ph:
                c, r = px // rx, py // ry
                m, _ = cell.get((c, r), (0, at))
                bit = _BR[px % rx][py % ry] if mode == 'braille' else (1 << (py % ry))
                cell[(c, r)] = (m | bit, at)
        _line(pts, put)
    for (c, r), (m, at) in cell.items():
        if mode == 'braille':
            ch = chr(0x2800 + m)
        else:
            ch = {1: '▀', 2: '▄', 3: '█'}[m]
        s.set(x + c, y + r, ch, at)


def curve_poly(s, x, y, cols, rows, series, xr, yr, mode='braille', decim=False):
    """Polylines through data points (not sampled functions), drawn with braille (2x4) or half blocks (1x2).
    series: list of (pts, attr); later series win the colour of a shared cell."""
    rx, ry = (2, 4) if mode == 'braille' else (1, 2)
    pw, ph = cols * rx, rows * ry
    cell = {}
    for pts, at in series:
        if decim:
            cols_ = {}
            for a_, b_ in pts:
                cols_.setdefault(round((a_ - xr[0]) / (xr[1] - xr[0]) * (pw - 1)), []).append(b_)
            pts = [(xr[0] + (xr[1] - xr[0]) * c_ / (pw - 1), sum(v) / len(v)) for c_, v in sorted(cols_.items())]
        pp = [(round((a_ - xr[0]) / (xr[1] - xr[0]) * (pw - 1)), (ph - 1) - round((b_ - yr[0]) / (yr[1] - yr[0]) * (ph - 1))) for a_, b_ in pts]

        def put(px, py, at=at):
            if 0 <= px < pw and 0 <= py < ph:
                c, r = px // rx, py // ry
                m, _ = cell.get((c, r), (0, at))
                bit = _BR[px % rx][py % ry] if mode == 'braille' else (1 << (py % ry))
                cell[(c, r)] = (m | bit, at)
        _line(pp, put)
    for (c, r), (m, at) in cell.items():
        ch = chr(0x2800 + m) if mode == 'braille' else {1: '▀', 2: '▄', 3: '█'}[m]
        s.set(x + c, y + r, ch, at)
