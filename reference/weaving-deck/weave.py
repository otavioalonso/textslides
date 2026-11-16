def dd(thr, lift):
    """drawdown: rows = picks, cols = ends; True where the warp end is on top."""
    return [[thr[e] in lift[p] for e in range(len(thr))] for p in range(len(lift))]

def cyc(seq, n): return [seq[i % len(seq)] for i in range(n)]
STRAIGHT = [0, 1, 2, 3]
POINT = [0, 1, 2, 3, 2, 1]
def twill22(q): return {q % 4, (q - 1) % 4}
def cam_lift(quarters, lobe=(0, 1)):  # cam orientation o is high when (q - o) % 4 in lobe
    return [{o for o in range(4) if (q - o) % 4 in lobe} for q in quarters]

def show(M):
    print('\n'.join(''.join('█' if v else '·' for v in r) for r in M)); print()
if __name__ == '__main__':
    show(dd(cyc(STRAIGHT, 24), cam_lift(cyc([0,1,2,3], 12))))
    show(dd(cyc(POINT, 24), cam_lift(cyc([0,1,2,3], 12))))
    show(dd(cyc(POINT, 24), cam_lift(cyc(POINT, 12))))
    hb = [0,1,2,3,0,1,2,3, 1,0,3,2,1,0,3,2]
    show(dd(cyc(hb, 24), cam_lift(cyc([0,1,2,3], 12))))
    hb2 = [0,1,2,3,0,1,2,3, 2,1,0,3,2,1,0,3]
    show(dd(cyc(hb2, 24), cam_lift(cyc([0,1,2,3], 12))))
