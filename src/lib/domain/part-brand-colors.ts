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

/** 図鑑マップなど、DB の `color` が旧値でも大トロ・中トロだけ必ず表示用スウォッチに揃える */
export function mapDisplayColorForPart(part: Part): string {
  if (part.id === "otoro") return DISPLAY_COLOR_OTORO;
  if (part.id === "chutoro") return DISPLAY_COLOR_CHUTORO;
  return part.color;
}
