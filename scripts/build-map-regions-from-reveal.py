#!/usr/bin/env python3
"""
`src/assets/zukan-tuna-map-reveal.webp` から部位 path を再生成し、
TunaMap.tsx の MAP_REGIONS に貼れる `d:` 文字列を標準出力する。

Pillow が必要: pip install pillow

使い方:
  python3 scripts/build-map-regions-from-reveal.py \\
    --reveal src/assets/zukan-tuna-map-reveal.webp
"""

from __future__ import annotations

import argparse
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


def path_from_set(pts: set[tuple[int, int]], *, max_pts: int, rng: random.Random) -> str:
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reveal", type=Path, default=Path("src/assets/zukan-tuna-map-reveal.webp"))
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    im = Image.open(args.reveal).convert("RGBA")
    w, h = im.size
    px = im.load()

    # 脳天: TunaMap では楕円 (308,251) 参考。ここは頭頂ピンクの凸包（別位置）
    noten = path_from_set(flood_rgba(px, w, h, 402, 182, thresh=20, maxn=550), max_pts=350, rng=rng)

    # 目裏: TunaMap では目〜ほほの間の楕円 (236,294)。参考用 flood
    meura = path_from_set(flood_rgba(px, w, h, 236, 294, thresh=22, maxn=500), max_pts=350, rng=rng)
    hoho = path_from_set(flood_rgba(px, w, h, 268, 425, thresh=34, maxn=20000), max_pts=1000, rng=rng)
    # 背中の中とろ: 左ブロック＋背中中央の大きなピンク＋尾寄りの3つ
    chu_l = path_from_set(flood_rgba(px, w, h, 500, 240, thresh=60, maxn=12000), max_pts=1000, rng=rng)
    chu_m = path_from_set(flood_rgba(px, w, h, 620, 255, thresh=56, maxn=28000), max_pts=1200, rng=rng)
    chu_r = path_from_set(flood_rgba(px, w, h, 1000, 268, thresh=36, maxn=12000), max_pts=800, rng=rng)
    ak_main = path_from_set(flood_rgba(px, w, h, 700, 360, thresh=22, maxn=25000), max_pts=900, rng=rng)
    tail = path_from_set(flood_rgba(px, w, h, 1168, 385, thresh=32, maxn=2000), max_pts=400, rng=rng)
    # 大トロ腹2ブロック: サンプル縮小すると凸包が小さくなるため max_pts 大きめ・thresh で塗り全体を取る
    ot_f = path_from_set(flood_rgba(px, w, h, 455, 505, thresh=52, maxn=60000), max_pts=50000, rng=rng)
    ot_r = path_from_set(flood_rgba(px, w, h, 680, 510, thresh=52, maxn=60000), max_pts=50000, rng=rng)
    chu_belly = path_from_set(flood_rgba(px, w, h, 900, 455, thresh=42, maxn=15000), max_pts=900, rng=rng)

    blocks = [
        ("noten", noten),
        ("meura", meura),
        ("hoho", hoho),
        ("chutoro-back L", chu_l),
        ("chutoro-back M", chu_m),
        ("chutoro-back R", chu_r),
        ("akami main", ak_main),
        ("akami tail", tail),
        ("belly-otoro-front", ot_f),
        ("belly-otoro-rear", ot_r),
        ("belly-chutoro", chu_belly),
    ]

    for name, d in blocks:
        cx, cy = path_centroid(d)
        print(f"### {name}  lineTo ~ ({cx},{cy})")
        print(d)
        print()


if __name__ == "__main__":
    main()
