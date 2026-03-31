import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 *
 * 部位マップの配色: `C:\Users\minou\Downloads\スクリーンショット 2026-03-31 160835.png`
 * （`mapOverlayTintHex` は明度・彩度 1 倍でそのまま反映）
 * マップ上のラベル帯は `TunaMap` で #701d1d 背景・白文字（160835 と同系）。
 * - 脳天: 明るいピンク、中トロ（背・腹）・ほほ: サーモン、大トロ: ローズ、赤身: 深赤
 * - 目裏: イラスト地色に近い青みグレー（#96a2ae は同画像内のベース色サンプル）
 * カマ・ハラモ・背側脂帯は図中ラベルなしのため大トロ／中トロ系で統一。
 */
export const PART_DISPLAY_COLOR_OTORO = "#bf4460";
export const PART_DISPLAY_COLOR_CHUTORO = "#d35b6b";

export const PART_DISPLAY_SWATCHES = {
  otoro: PART_DISPLAY_COLOR_OTORO,
  chutoro: PART_DISPLAY_COLOR_CHUTORO,
  noten: "#ff82a5",
  /** 地色寄り（マップ上はベーストーンに近づける） */
  meura: "#96a2ae",
  hoho: "#f48c8c",
  kama: "#cc4c64",
  haramo: "#cc4c64",
  senaka: "#f48c8c",
  akami: "#b61c28",
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
