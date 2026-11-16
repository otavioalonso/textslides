import json, sys
sys.path.insert(0, '/home/claude/term')
from lib import Scr
import loom_slides as SL

def frame(C, i):
    s = C.s
    if i == 0: return
    full, small = SL.TITLES[i]
    W = s.w
    s.fill(0, 0, W, 1, ' ', 'r')
    s.put(1, 0, ' ' + (small if C.S else full) + ' ', 'r')
    s.rput(0, f"{i + 1:02d}/{SL.N} ", 'r')
    s.put(1, 24 if C.S else 23, ''.join('■' if k <= i else '□' for k in range(SL.N)), 'd')

def build(size):
    out = []
    for i, fn in enumerate(SL.SLIDES):
        C = SL.make(size); frame(C, i)
        snap = [r[:] for r in C.s.c]
        fn(C)
        s = C.s; warn = []
        if s.bad: warn.append(f"off-grid {s.bad[:3]}")
        if i > 0:
            for yy in range(s.h):
                for xx in range(s.w):
                    if s.c[yy][xx] != snap[yy][xx] and not (C.x <= xx < C.x + C.w and C.y <= yy < C.y + C.h):
                        warn.append(f"outside ({xx},{yy}) {s.c[yy][xx]!r}")
        for h in s.heats:
            if h['y'] + h['rows'] > C.y + C.h or h['x'] + h['cols'] > C.x + C.w: warn.append(f"heat outside {h['x'],h['y'],h['cols'],h['rows']}")
        if warn: print(f"[{size}] slide {i + 1}: " + '; '.join(warn[:4]))
        rows, attrs = s.lines()
        out.append({'chars': rows, 'attrs': attrs, 'title': SL.TITLES[i][0].title() if False else SL.TITLES[i][0], 'notes': SL.NOTES[i],
                    'cur': s.cur, 'eqs': [], 'plots': [], 'frames': s.frames, 'heats': s.heats})
    return out

d = {z: build(z) for z in ('s', 'm')}
json.dump({'ascii': d, 'tex': d}, open('deck.json', 'w'), ensure_ascii=False)
p = open('/home/claude/term/page.html').read()
def rp(a, b):
    global p
    assert p.count(a) >= 1, a
    p = p.replace(a, b)
rp('<title>Thinning covariance: text-mode slides</title>', '<title>Weaving with a heddle bar: text-mode slides</title>')
rp("'thinning — '+SIZE_LABEL[size]", "'weaving — '+SIZE_LABEL[size]")
rp('<button id="mathbtn"', '<button id="mathbtn" style="display:none"')
rp(' · E toggles LaTeX equations', '')
p = p.replace('__DECK__', open('deck.json').read().replace('</', '<\\/')).replace('/*KATEXCSS*/', '')
open('index.html', 'w').write(p)
print('ok', len(p))
