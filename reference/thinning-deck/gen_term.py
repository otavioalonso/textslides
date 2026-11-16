import json, sys
from lib import *
import slides as SL

SIZES = {'s': (40, 25), 'm': (80, 24), 'l': (120, 34)}


def frame(C, i):
    s = C.s
    if i == 0:
        return
    t_full, t_side, t_small = SL.TITLES[i]
    if C.size == 'l':
        s.fill(0, 0, 120, 1, ' ', 'r')
        s.put(1, 0, " THINNING · CONNECTED SHOT-NOISE COVARIANCE", 'r')
        s.rput(0, f"{i + 1:02d}/{SL.N} ", 'r')
        y = 2
        for g, idxs in SL.GROUPS:
            s.put(2, y, g, 'd')
            y += 1
            for k in idxs:
                cur = k == i
                s.put(2, y, ('▶ ' if cur else '  ') + SL.TITLES[k][1], 'b' if cur else 'n')
                y += 1
        for r in range(1, 33):
            s.set(26, r, '│', 'd')
        s.put(28, 1, t_full, 'a')
        s.hline(28, 27, 90)
        note = SL.NOTES[i]
        s.put(28, 27, '─ notes ', 'd')
        s.wrap(28, 28, 90, note, 'd')
        foot_y = 33
        s.put(1, foot_y, '← → page · 1 2 3 size', 'd')
    elif C.size == 'm':
        s.fill(0, 0, 80, 1, ' ', 'r')
        s.put(1, 0, ' ' + t_full + ' ', 'r')
        s.rput(0, f"{i + 1:02d}/{SL.N} ", 'r')
        foot_y = 23
    else:
        s.fill(0, 0, 40, 1, ' ', 'r')
        s.put(1, 0, ' ' + t_small + ' ', 'r')
        s.rput(0, f"{i + 1:02d}/{SL.N} ", 'r')
        foot_y = 24
    if C.size != 'l':
        sq = ''.join('■' if k <= i else '□' for k in range(SL.N))
        s.put(1 if C.size == 'm' else 1, foot_y, sq, 'd')
    else:
        sq = ''.join('■' if k <= i else '□' for k in range(SL.N))
        s.put(28, foot_y, sq, 'd')


def footer_cover(C):
    pass


def build(size, fns):
    out = []
    for i, fn in enumerate(fns):
        C = SL.make(size)
        frame(C, i)
        # content drawn on a separate screen to check the region
        frame_snapshot = [row[:] for row in C.s.c]
        fn(C)
        s = C.s
        warn = []
        if s.bad:
            warn.append(f"off-grid writes {s.bad[:3]}")
        if i > 0:
            for yy in range(s.h):
                for xx in range(s.w):
                    if s.c[yy][xx] != frame_snapshot[yy][xx]:
                        inside = C.x <= xx < C.x + C.w and C.y <= yy < C.y + C.h
                        if not inside:
                            warn.append(f"outside region at ({xx},{yy}) {s.c[yy][xx]!r}")
                            break
                else:
                    continue
                break
        if warn:
            print(f"[{size}{"T" if SL.TEX else "A"}] slide {i + 1}: " + '; '.join(warn))
        rows, attrs = s.lines()
        out.append({'chars': rows, 'attrs': attrs, 'title': SL.TITLES[i][0], 'notes': SL.NOTES[i],
                    'cur': s.cur, 'eqs': list(s.eqs), 'plots': list(s.plots), 'frames': list(s.frames), 'heats': list(s.heats)})
    return out


if __name__ == '__main__':
    import importlib, subprocess
    sizes = [a for a in sys.argv[1:] if a in SIZES] or ['s', 'm']
    data, tex = {}, {}
    for mode in (False, True):
        SL.TEX = mode
        dd = {}
        for z in sizes:
            fns = SL.MLSL if z != 's' else importlib.import_module('slides_s').SLS
            dd[z] = build(z, fns)
        (tex if mode else data).update(dd)
    allt = sorted({e['tex'] for z in tex for sl in tex[z] for e in sl['eqs']})
    json.dump(allt, open('tex_in.json', 'w'))
    subprocess.run(['node', 'render_tex.js', 'tex_in.json', 'tex_out.json'], check=True)
    html = json.load(open('tex_out.json'))
    for z in tex:
        for sl in tex[z]:
            for e in sl['eqs']:
                e['html'] = html[e['tex']]
                assert e['html'], e['tex']
    json.dump({'ascii': data, 'tex': tex}, open('deck.json', 'w'), ensure_ascii=False)
