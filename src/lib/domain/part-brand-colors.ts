import type { Part } from "@/lib/domain/types";

/**
 * 表示用の大とろ・中とろの色（スクショサンプリング値）。
 * Supabase の `parts.color` が未更新でもスナップショット経由の UI に反映する。
 */
export const DISPLAY_COLOR_OTORO = "#d66078";
export const DISPLAY_COLOR_CHUTORO = "#eb7e7c";

export function applyOtoroChutoroDisplayColors(parts: Part[]): Part[] {
  return parts.map((p) => {
    if (p.id === "otoro") {
      return { ...p, color: DISPLAY_COLOR_OTORO };
    }
    if (p.id === "chutoro") {
      return { ...p, color: DISPLAY_COLOR_CHUTORO };
    }
    return p;
  });
}

/* --- 後続コミットとの互換エクスポート --- */

export const PART_DISPLAY_SWATCHES = {
  otoro: DISPLAY_COLOR_OTORO,
  chutoro: DISPLAY_COLOR_CHUTORO,
  noten: "#f5a0b0",
  meura: "#96a2ae",
  hoho: "#d66078",
  kama: "#eb7e7c",
  haramo: "#eb7e7c",
  senaka: "#d66078",
  akami: "#b61c28",
} as const;

export type PartDisplaySwatchId = keyof typeof PART_DISPLAY_SWATCHES;

export function applyPartDisplayColors(parts: Part[]): Part[] {
  return parts.map((p) => {
    const swatch = PART_DISPLAY_SWATCHES[p.id as PartDisplaySwatchId];
    return swatch ? { ...p, color: swatch } : p;
  });
}

export function mapDisplayColorForPart(part: Part): string {
  const swatch = PART_DISPLAY_SWATCHES[part.id as PartDisplaySwatchId];
  return swatch ?? part.color;
}
