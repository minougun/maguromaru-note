import type { Part } from "@/lib/domain/types";

/**
 * アプリ表示用の大とろ・中とろの色（マスターとマップを一致させる）。
 * Supabase の `parts` が未移行でもスナップショット経由の UI はここで上書きする。
 */
export const PART_DISPLAY_COLOR_OTORO = "#e85555";
export const PART_DISPLAY_COLOR_CHUTORO = "#ff6b6b";

export function applyCanonicalPartDisplayColors(parts: Part[]): Part[] {
  return parts.map((p) => {
    if (p.id === "otoro") {
      return { ...p, color: PART_DISPLAY_COLOR_OTORO };
    }
    if (p.id === "chutoro") {
      return { ...p, color: PART_DISPLAY_COLOR_CHUTORO };
    }
    return p;
  });
}
