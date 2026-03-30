#!/usr/bin/env python3
"""ベース画・色付き画を同じ cover クロップで 1365×768 WebP に揃える（TunaMap の二層表示用）。"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

VIEW_W = 1365
VIEW_H = 768


def to_viewbox_webp(src: Path, dst: Path, *, quality: int = 88) -> None:
    im = Image.open(src).convert("RGBA")
    sw, sh = im.size
    scale = max(VIEW_W / sw, VIEW_H / sh)
    nw = int(sw * scale + 0.5)
    nh = int(sh * scale + 0.5)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - VIEW_W) // 2
    top = (nh - VIEW_H) // 2
    cropped = resized.crop((left, top, left + VIEW_W, top + VIEW_H))
    rgb = Image.new("RGB", (VIEW_W, VIEW_H), (255, 255, 255))
    rgb.paste(cropped, mask=cropped.split()[3])
    dst.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(dst, "WEBP", quality=quality, method=6)
    print(f"wrote {dst} ({dst.stat().st_size} bytes)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base-png", type=Path, required=True)
    p.add_argument("--reveal-png", type=Path, required=True)
    p.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "src" / "assets",
    )
    args = p.parse_args()
    out = args.out_dir
    to_viewbox_webp(args.base_png, out / "zukan-tuna-map.webp")
    to_viewbox_webp(args.reveal_png, out / "zukan-tuna-map-reveal.webp")


if __name__ == "__main__":
    main()
