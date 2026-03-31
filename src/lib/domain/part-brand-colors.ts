import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 * 赤身（akami）は意図的に含めず、DB / シードの `color` をそのまま使う。
 */
export const PART_DISPLAY_SWATCHES = {
  otoro: "#d66078",
  chutoro: "#eb7e7c",
  /** 脳天：上品なローズ（大トロ級のとろけ感） */
  noten: "#c9a4b8",
  /** 目裏：ピーチ寄りサモートーン（希少・繊細） */
  meura: "#df9578",
  /** ほほ肉：ワイン系の深紅（赤身より紫味・弾力のイメージ） */
  hoho: "#9a3d4c",
  /** カマ：テラコッタ寄り（脂と骨周りの濃さ） */
  kama: "#b9563f",
  /** ハラモ：腹側の柔らかいサーモンピンク */
  haramo: "#e07d75",
  /** 背側の脂（senaka）：赤身と中とろのあいだの落ち着いたローズ */
  senaka: "#a85760",
} as const;

export type PartDisplaySwatchId = keyof typeof PART_DISPLAY_SWATCHES;

/** 後方互換・短い参照用 */
export const DISPLAY_COLOR_OTORO = PART_DISPLAY_SWATCHES.otoro;
export const DISPLAY_COLOR_CHUTORO = PART_DISPLAY_SWATCHES.chutoro;

/**
 * Supabase の `parts.color` が未更新でも、スナップショット経由の UI を表示スウォッチに揃える。
 * 赤身のみ DB 値を維持する。
 */
export function applyPartDisplayColors(parts: Part[]): Part[] {
  return parts.map((p) => {
    if (p.id === "akami") return p;
    const swatch = PART_DISPLAY_SWATCHES[p.id as PartDisplaySwatchId];
    return swatch ? { ...p, color: swatch } : p;
  });
}

/** 図鑑マップ等：DB が旧色でもスウォッチを優先（赤身は常に `part.color`） */
export function mapDisplayColorForPart(part: Part): string {
  if (part.id === "akami") return part.color;
  const swatch = PART_DISPLAY_SWATCHES[part.id as PartDisplaySwatchId];
  return swatch ?? part.color;
}
