#!/usr/bin/env python3
"""
`src/assets/zukan-tuna-map-reveal.webp` から部位 path を再生成し、
TunaMap.tsx の MAP_REGIONS に貼れる `d:` 文字列を標準出力する。

- **輪郭トレース**: flood したピクセル集合の外周（ピクセル格子の辺）をなぞり、
  Ramer–Douglas–Peucker で簡略化。
- **穴埋め**: ほほなど塗りに穴があると外周グラフが分岐するため、バウンディングボックス内の
  囲まれた背景を前景で埋めてから外周を取る。

**注意**:
- **赤身**は広い flood の輪郭が階段状に見えるため、`TunaMap.tsx` では手調整の `d` を維持。
- **中トロ（背）**は本番も 3 ブロックとも `path_contour_from_pixels`（左 ε2.5・中央 ε5・尾 ε7、尾はシード 930,298）。
  WebP 差し替え後は本スクリプトの `chutoro-back` 出力を `TunaMap.tsx` に反映する。

Pillow が必要: pip install pillow

使い方:
  python3 scripts/build-map-regions-from-reveal.py \\
    --reveal src/assets/zukan-tuna-map-reveal.webp

  # 中トロ（背）のすき間ピンク演出 path だけ出す:
  python3 scripts/build-map-regions-from-reveal.py --chutoro-gap-fill
"""

from __future__ import annotations

import argparse
import math
import random
import re
from collections import deque
from pathlib import Path

from PIL import Image


def flood_rgba(
    px,
    w: int,
    h: int,
    sx: int,
    sy: int,
    *,
    thresh: int,
    maxn: int,
) -> set[tuple[int, int]]:
    br, bg, bb = px[sx, sy][:3]

    def ok(x: int, y: int) -> bool:
        if x < 0 or y < 0 or x >= w or y >= h:
            return False
        r, g, b = px[x, y][:3]
        if (r + g + b) / 3 < 40:
            return False
        return abs(r - br) + abs(g - bg) + abs(b - bb) <= thresh

    q = deque([(sx, sy)])
    seen: set[tuple[int, int]] = {(sx, sy)}
    while q and len(seen) < maxn:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) in seen or not ok(nx, ny):
                continue
            seen.add((nx, ny))
            q.append((nx, ny))
    return seen


def bbox(pts: set[tuple[int, int]]) -> tuple[int, int, int, int]:
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def fill_holes_in_bbox(pts: set[tuple[int, int]]) -> set[tuple[int, int]]:
    """4 連結前景の内部に囲まれた背景ピクセルを埋め、外周が単一ループになるようにする。"""
    if not pts:
        return pts
    minx, miny, maxx, maxy = bbox(pts)
    pad = 1
    rw = maxx - minx + 1 + 2 * pad
    rh = maxy - miny + 1 + 2 * pad
    loc = [[0] * rw for _ in range(rh)]
    for x, y in pts:
        loc[y - miny + pad][x - minx + pad] = 1

    outside = [[False] * rw for _ in range(rh)]
    q: deque[tuple[int, int]] = deque()
    for yy in range(rh):
        for xx in (0, rw - 1):
            if loc[yy][xx] == 0 and not outside[yy][xx]:
                outside[yy][xx] = True
                q.append((xx, yy))
    for xx in range(rw):
        for yy in (0, rh - 1):
            if loc[yy][xx] == 0 and not outside[yy][xx]:
                outside[yy][xx] = True
                q.append((xx, yy))
    while q:
        xx, yy = q.popleft()
        for nxx, nyy in ((xx + 1, yy), (xx - 1, yy), (xx, yy + 1), (xx, yy - 1)):
            if 0 <= nxx < rw and 0 <= nyy < rh and loc[nyy][nxx] == 0 and not outside[nyy][nxx]:
                outside[nyy][nxx] = True
                q.append((nxx, nyy))

    filled = set(pts)
    for yy in range(rh):
        for xx in range(rw):
            if loc[yy][xx] == 0 and not outside[yy][xx]:
                gx = xx - pad + minx
                gy = yy - pad + miny
                filled.add((gx, gy))
    return filled


def orthogonal_outer_contour(pts: set[tuple[int, int]]) -> list[tuple[int, int]]:
    """各ピクセルを [x,x+1)×[y,y+1) の正方形とみなしたときの外周（角の格子点の閉路）。"""
    edge_set: set[frozenset[tuple[int, int]]] = set()
    for x, y in pts:
        if (x, y - 1) not in pts:
            edge_set.add(frozenset({(x, y), (x + 1, y)}))
        if (x + 1, y) not in pts:
            edge_set.add(frozenset({(x + 1, y), (x + 1, y + 1)}))
        if (x, y + 1) not in pts:
            edge_set.add(frozenset({(x + 1, y + 1), (x, y + 1)}))
        if (x - 1, y) not in pts:
            edge_set.add(frozenset({(x, y + 1), (x, y)}))

    g: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for e in edge_set:
        a, b = tuple(e)
        g.setdefault(a, []).append(b)
        g.setdefault(b, []).append(a)
    if not g:
        return []

    start = min(g.keys())
    prev: tuple[int, int] | None = None
    cur = start
    path: list[tuple[int, int]] = []
    for _ in range(len(edge_set) + 10):
        path.append(cur)
        nbrs = g[cur]
        if len(nbrs) == 1:
            nxt = nbrs[0]
        elif prev is None:
            nxt = nbrs[0]
        else:
            nxt = nbrs[0] if nbrs[1] == prev else nbrs[1]
        if nxt == start and len(path) > 1:
            break
        prev, cur = cur, nxt
    return path


def dist_point_to_segment(
    p: tuple[int, int],
    a: tuple[int, int],
    b: tuple[int, int],
) -> float:
    px, py = p
    x1, y1 = a
    x2, y2 = b
    dx, dy = x2 - x1, y2 - y1
    if dx == dy == 0:
        return math.hypot(px - x1, py - y1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    qx, qy = x1 + t * dx, y1 + t * dy
    return math.hypot(px - qx, py - qy)


def rdp_simplify(pts: list[tuple[int, int]], epsilon: float) -> list[tuple[int, int]]:
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    imax, dmax = 0, 0.0
    for i in range(1, len(pts) - 1):
        d = dist_point_to_segment(pts[i], a, b)
        if d > dmax:
            dmax, imax = d, i
    if dmax > epsilon:
        left = rdp_simplify(pts[: imax + 1], epsilon)
        right = rdp_simplify(pts[imax:], epsilon)
        return left[:-1] + right
    return [a, b]


def path_contour_from_pixels(
    pts: set[tuple[int, int]],
    *,
    epsilon: float,
    fill_holes: bool = True,
) -> str:
    if len(pts) < 3:
        return ""
    work = fill_holes_in_bbox(pts) if fill_holes else set(pts)
    ring = orthogonal_outer_contour(work)
    if len(ring) < 3:
        return ""
    closed = ring + [ring[0]]
    simp = rdp_simplify(closed, epsilon)
    if len(simp) >= 2 and simp[0] == simp[-1]:
        simp = simp[:-1]
    if len(simp) < 3:
        return ""
    return "M " + " L ".join(f"{x},{y}" for x, y in simp) + " Z"


def convex_hull(points: list[tuple[int, int]]) -> list[tuple[int, int]]:
    points = sorted(set(points))
    if len(points) < 3:
        return points

    def cross(o: tuple[int, int], a: tuple[int, int], b: tuple[int, int]) -> int:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[tuple[int, int]] = []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper: list[tuple[int, int]] = []
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def path_hull_from_pixels(
    pts: set[tuple[int, int]],
    *,
    max_pts: int,
    rng: random.Random,
) -> str:
    """従来のランダム標本＋凸包（参考用）。"""
    lst = list(pts)
    if len(lst) > max_pts:
        lst = rng.sample(lst, max_pts)
    h = convex_hull(lst)
    if len(h) < 3:
        mi_x, mi_y, ma_x, ma_y = bbox(pts)
        h = [(mi_x, mi_y), (ma_x, mi_y), (ma_x, ma_y), (mi_x, ma_y)]
    return "M " + " L ".join(f"{x},{y}" for x, y in h) + " Z"


def path_centroid(d: str) -> tuple[int, int]:
    nums = [int(x) for x in re.findall(r"\d+", d)]
    xs = nums[0::2]
    ys = nums[1::2]
    return round(sum(xs) / len(xs)), round(sum(ys) / len(ys))


def flood_centroid(pts: set[tuple[int, int]]) -> tuple[float, float]:
    n = len(pts)
    return sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n


def weighted_centroid(sets: list[set[tuple[int, int]]]) -> tuple[int, int]:
    total = sum(len(s) for s in sets)
    cx = sum(len(s) * flood_centroid(s)[0] for s in sets) / total
    cy = sum(len(s) * flood_centroid(s)[1] for s in sets) / total
    return round(cx), round(cy)


# TunaMap.tsx の AKAMI_MAP_PATH_D と同期すること
_AKAMI_MAP_PATH_D = (
    "M 499,327 L 523,303 L 557,299 L 561,299 L 607,300 L 662,302 L 686,304 L 732,309 L 816,321 L 834,325 L 843,328 L 894,394 L 891,403 L 558,452 L 529,422 Z "
    "M 1116,386 L 1117,379 L 1118,377 L 1128,377 L 1219,378 L 1218,380 L 1206,387 L 1117,393 L 1116,392 Z"
)


def _parse_path_polys(d: str) -> list[list[tuple[int, int]]]:
    polys: list[list[tuple[int, int]]] = []
    for part in d.split("Z"):
        part = part.strip()
        if not part:
            continue
        if not part.startswith("M"):
            part = "M " + part
        nums = [int(x) for x in re.findall(r"-?\d+", part)]
        pts = list(zip(nums[0::2], nums[1::2]))
        if pts and pts[0] == pts[-1]:
            pts = pts[:-1]
        if len(pts) >= 3:
            polys.append(list(pts))
    return polys


def _point_in_poly(x: int, y: int, poly: list[tuple[int, int]]) -> bool:
    n = len(poly)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def _in_any_poly(x: int, y: int, polys: list[list[tuple[int, int]]]) -> bool:
    return any(_point_in_poly(x, y, p) for p in polys)


def _connected_components(pts: set[tuple[int, int]]) -> list[set[tuple[int, int]]]:
    rem = set(pts)
    out: list[set[tuple[int, int]]] = []
    while rem:
        start = next(iter(rem))
        stack = [start]
        comp: set[tuple[int, int]] = set()
        while stack:
            x, y = stack.pop()
            if (x, y) not in rem:
                continue
            rem.remove((x, y))
            comp.add((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) in rem:
                    stack.append((nx, ny))
        out.append(comp)
    return out


def chutoro_back_gap_fill_d(
    px,
    w: int,
    h: int,
    *,
    akami_path_d: str = _AKAMI_MAP_PATH_D,
    min_component: int = 80,
    rdp_eps: float = 3.0,
) -> str:
    """TunaMap の CHUTORO_BACK_GAP_FILL_D 再生成用。"""
    ak_polys = _parse_path_polys(akami_path_d.replace(" Z ", "Z"))

    def pf(sx: int, sy: int, th: int, mx: int) -> set[tuple[int, int]]:
        return flood_rgba(px, w, h, sx, sy, thresh=th, maxn=mx)

    chu_l = pf(500, 240, 60, 12000)
    chu_m = pf(620, 255, 56, 28000)
    chu_r = pf(930, 298, 38, 40000)
    core = chu_l | chu_m | chu_r
    wide = pf(565, 275, 85, 50000) | pf(850, 275, 85, 50000)
    fill_pixels: set[tuple[int, int]] = set()
    for p in wide:
        if p in core:
            continue
        x, y = p
        if _in_any_poly(x, y, ak_polys):
            continue
        fill_pixels.add(p)

    comps = [c for c in _connected_components(fill_pixels) if len(c) >= min_component]
    comps.sort(key=len, reverse=True)
    parts = [path_contour_from_pixels(c, epsilon=rdp_eps, fill_holes=True) for c in comps]
    return " ".join(p for p in parts if p).strip()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reveal", type=Path, default=Path("src/assets/zukan-tuna-map-reveal.webp"))
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument(
        "--legacy-hull",
        action="store_true",
        help="輪郭の代わりに凸包＋ランダム標本（旧挙動）で出力する",
    )
    ap.add_argument(
        "--chutoro-gap-fill",
        action="store_true",
        help="中トロ（背）すき間演出用 path のみ出力（TunaMap CHUTORO_BACK_GAP_FILL_D 用）",
    )
    args = ap.parse_args()

    rng = random.Random(args.seed)
    im = Image.open(args.reveal).convert("RGBA")
    w, h = im.size
    px = im.load()

    if args.chutoro_gap_fill:
        print("### CHUTORO_BACK_GAP_FILL_D（TunaMap.tsx に貼付）")
        print(chutoro_back_gap_fill_d(px, w, h))
        return

    def pflood(sx: int, sy: int, thresh: int, maxn: int) -> set[tuple[int, int]]:
        return flood_rgba(px, w, h, sx, sy, thresh=thresh, maxn=maxn)

    def ppath(pts: set[tuple[int, int]], eps: float, *, fill_holes: bool = True) -> str:
        if args.legacy_hull:
            return path_hull_from_pixels(pts, max_pts=50000, rng=rng)
        return path_contour_from_pixels(pts, epsilon=eps, fill_holes=fill_holes)

    # 脳天・目裏は TunaMap では楕円。ここは参考用（頭頂はピンク上のシードを使用）
    noten_pts = pflood(430, 218, 28, 600)
    meura_pts = pflood(236, 294, 22, 800)
    hoho_pts = pflood(268, 425, 34, 20000)

    chu_l = pflood(500, 240, 60, 12000)
    chu_m = pflood(620, 255, 56, 28000)
    # 尾寄りブロックは白地シードだと全域に繋がるため、必ずピンク上の点から flood する
    chu_r = pflood(930, 298, 38, 40000)

    ak_main = pflood(700, 360, 22, 25000)
    tail = pflood(1168, 385, 32, 2000)

    ot_f = pflood(455, 505, 52, 60000)
    ot_r = pflood(680, 510, 52, 60000)
    chu_belly = pflood(900, 455, 42, 15000)

    noten = ppath(noten_pts, 3.5)
    meura = ppath(meura_pts, 2.5)
    hoho = ppath(hoho_pts, 4.0)

    chu_l_d = ppath(chu_l, 2.5)
    chu_m_d = ppath(chu_m, 5.0)
    chu_r_d = ppath(chu_r, 7.0)
    chutoro_combined = f"{chu_l_d} {chu_m_d} {chu_r_d}".strip()

    ak_main_d = ppath(ak_main, 4.5)
    tail_d = ppath(tail, 2.5)
    akami_combined = f"{ak_main_d} {tail_d}".strip()

    ot_f_d = ppath(ot_f, 3.0)
    ot_r_d = ppath(ot_r, 3.0)
    chu_belly_d = ppath(chu_belly, 4.0)

    blocks: list[tuple[str, str, tuple[int, int] | None]] = [
        ("noten", noten, path_centroid(noten) if noten else None),
        ("meura", meura, path_centroid(meura) if meura else None),
        ("hoho", hoho, weighted_centroid([hoho_pts]) if hoho else None),
        ("chutoro-back (3 subpaths)", chutoro_combined, weighted_centroid([chu_l, chu_m, chu_r])),
        ("chutoro-back L", chu_l_d, path_centroid(chu_l_d)),
        ("chutoro-back M", chu_m_d, path_centroid(chu_m_d)),
        ("chutoro-back R", chu_r_d, path_centroid(chu_r_d)),
        ("akami main", ak_main_d, path_centroid(ak_main_d)),
        ("akami tail", tail_d, path_centroid(tail_d)),
        ("akami combined", akami_combined, weighted_centroid([ak_main, tail])),
        ("belly-otoro-front", ot_f_d, weighted_centroid([ot_f])),
        ("belly-otoro-rear", ot_r_d, weighted_centroid([ot_r])),
        ("belly-chutoro", chu_belly_d, weighted_centroid([chu_belly])),
    ]

    for name, d, hint in blocks:
        print(f"### {name}  lineTo ~ {hint}")
        print(d)
        print()


if __name__ == "__main__":
    main()
