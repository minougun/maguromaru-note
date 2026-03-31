import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 *
 * 赤身・大トロはスクリーンショット中央部の RGB 各チャンネル中央値:
 * - 赤身: `C:\Users\minou\Downloads\スクリーンショット 2026-03-31 153206.png`
 * - 大トロ: `C:\Users\minou\Downloads\スクリーンショット 2026-03-31 153237.png`
 * 中トロ: `C:\Users\minou\Downloads\スクリーンショット 2026-03-31 155338.png`（画像全体ピクセル平均 `#ea7e7b`）
 */
export const PART_DISPLAY_COLOR_OTORO = "#e6708a";
export const PART_DISPLAY_COLOR_CHUTORO = "#ea7e7b";

export const PART_DISPLAY_SWATCHES = {
  otoro: PART_DISPLAY_COLOR_OTORO,
  chutoro: PART_DISPLAY_COLOR_CHUTORO,
  /** 脳天（大トロと表示色を入れ替え） */
  noten: "#b43854",
  /** 目裏 */
  meura: "#de7c7c",
  /** ほほ肉 */
  hoho: "#e9817e",
  /** カマ */
  kama: "#ea7f7d",
  /** ハラモ */
  haramo: "#b1354b",
  /** 背側の脂（図中の背部トロ帯） */
  senaka: "#d77a7b",
  /** 赤身 */
  akami: "#b2354b",
} as const;

export type PartDisplaySwatchId = keyof typeof PART_DISPLAY_SWATCHES;

/** 後方互換・短い参照用 */
export const DISPLAY_COLOR_OTORO = PART_DISPLAY_COLOR_OTORO;
export const DISPLAY_COLOR_CHUTORO = PART_DISPLAY_COLOR_CHUTORO;

/**
 * Supabase の `parts.color` が未更新でも、スナップショット経由の UI を表示スウォッチに揃える。
 */
export function applyPartDisplayColors(parts: Part[]): Part[] {
  return parts.map((p) => {
    const swatch = PART_DISPLAY_SWATCHES[p.id as PartDisplaySwatchId];
    return swatch ? { ...p, color: swatch } : p;
  });
}

/** 図鑑マップ等：DB が旧色でもスウォッチを優先 */
export function mapDisplayColorForPart(part: Part): string {
  const swatch = PART_DISPLAY_SWATCHES[part.id as PartDisplaySwatchId];
  return swatch ?? part.color;
}
