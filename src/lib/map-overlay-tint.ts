/**
 * 図鑑マップのティント／ラベル用。表示スウォッチを HSL で調整する。
 * - 明度 L: MAP_OVERLAY_LIGHTNESS_MULTIPLIER
 * - 彩度 S（赤の濃さ）: MAP_OVERLAY_SATURATION_MULTIPLIER
 * キャッシュキーに倍率を含め、定数変更後も古い結果を返さない。
 */

const MAP_OVERLAY_LIGHTNESS_MULTIPLIER = 1.2;
const MAP_OVERLAY_SATURATION_MULTIPLIER = 1.5;

const overlayTintCache = new Map<string, string>();

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const q = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${q(r)}${q(g)}${q(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

export function mapOverlayTintHex(hex: string): string {
  const cacheKey = `${hex}|${MAP_OVERLAY_LIGHTNESS_MULTIPLIER}|${MAP_OVERLAY_SATURATION_MULTIPLIER}`;
  const hit = overlayTintCache.get(cacheKey);
  if (hit) return hit;

  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const s2 = Math.max(0, Math.min(1, s * MAP_OVERLAY_SATURATION_MULTIPLIER));
  const l2 = Math.max(0, Math.min(1, l * MAP_OVERLAY_LIGHTNESS_MULTIPLIER));
  const out = hslToRgb(h, s2, l2);
  const next = rgbToHex(out.r, out.g, out.b);
  overlayTintCache.set(cacheKey, next);
  return next;
}
