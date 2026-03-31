#!/usr/bin/env python3
"""
`zukan-tuna-map-reveal.webp` から中トロ（背）3ブロック相当のピクセルを flood し、
赤身マップ path 内のピクセルを除いてアルファマスク PNG を書き出す。

出力: src/assets/zukan-chutoro-back-mask.png（白＝不透明、透明＝マスク外）
TunaMap.tsx の AKAMI_MAP_PATH_D とシード・thresh は build-map-regions-from-reveal.py と揃える。

  python3 scripts/generate-chutoro-back-mask.py
  python3 scripts/generate-chutoro-back-mask.py --reveal path/to.webp --out path/to.png
"""

from __future__ import annotations

import argparse
import re
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

# TunaMap.tsx の AKAMI_MAP_PATH_D と同期
AKAMI_MAP_PATH_D = (
    "M 499,327 L 523,303 L 557,299 L 561,299 L 607,300 L 662,302 L 686,304 L 732,309 L 816,321 L 834,325 L 843,328 L 894,394 L 891,403 L 558,452 L 529,422 Z "
    "M 1116,386 L 1117,379 L 1118,377 L 1128,377 L 1219,378 L 1218,380 L 1206,387 L 1117,393 L 1116,392 Z"
)


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


def build_chutoro_back_mask_pixels(
    px,
    w: int,
    h: int,
    *,
    akami_path_d: str = AKAMI_MAP_PATH_D,
) -> set[tuple[int, int]]:
    chu_l = flood_rgba(px, w, h, 500, 240, thresh=60, maxn=12000)
    chu_m = flood_rgba(px, w, h, 620, 255, thresh=56, maxn=28000)
    chu_r = flood_rgba(px, w, h, 930, 298, thresh=38, maxn=40000)
    union = chu_l | chu_m | chu_r
    ak_polys = _parse_path_polys(akami_path_d.replace(" Z ", "Z"))
    out: set[tuple[int, int]] = set()
    for x, y in union:
        if any(_point_in_poly(x, y, p) for p in ak_polys):
            continue
        out.add((x, y))
    return out


def write_mask_png(
    size: tuple[int, int],
    pixels: set[tuple[int, int]],
    out_path: Path,
    *,
    dilate: int = 1,
) -> None:
    w, h = size
    layer = Image.new("L", (w, h), 0)
    for x, y in pixels:
        layer.putpixel((x, y), 255)
    if dilate > 0:
        for _ in range(dilate):
            layer = layer.filter(ImageFilter.MaxFilter(3))
    rgba = Image.merge("RGBA", (layer, layer, layer, layer))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(out_path, "PNG")
    print(f"Wrote {out_path} ({w}x{h}), {len(pixels)} seed pixels, dilate={dilate}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reveal", type=Path, default=Path("src/assets/zukan-tuna-map-reveal.webp"))
    ap.add_argument("--out", type=Path, default=Path("src/assets/zukan-chutoro-back-mask.png"))
    ap.add_argument("--dilate", type=int, default=1, help="MaxFilter(3) を何回か（細い隙間の補間）")
    args = ap.parse_args()

    im = Image.open(args.reveal).convert("RGBA")
    w, h = im.size
    px = im.load()
    pix = build_chutoro_back_mask_pixels(px, w, h)
    write_mask_png((w, h), pix, args.out, dilate=args.dilate)


if __name__ == "__main__":
    main()
