import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 * 赤身（akami）は意図的に含めず、DB / シードの `color` をそのまま使う。
 *
 * 大トロ・中トロはスクショサンプル。大トロと脳天の表示色は入れ替え済み。
 * 部位間の明暗順を保ったまま、全体を赤寄りに寄せたスウォッチ。
 */
export const PART_DISPLAY_COLOR_OTORO = "#ffe1df";
export const PART_DISPLAY_COLOR_CHUTORO = "#e14459";

export const PART_DISPLAY_SWATCHES = {
  otoro: PART_DISPLAY_COLOR_OTORO,
  chutoro: PART_DISPLAY_COLOR_CHUTORO,
  /** 脳天（大トロと色を入れ替え） */
  noten: "#ff726f",
  /** 目裏：明るい珊瑚ピンク */
  meura: "#ff99a5",
  /** ほほ肉：くすませない鮮やかなルビー */
  hoho: "#fa3a53",
  /** カマ：焼き霜・脂の気配があるサーモンオレンジ */
  kama: "#ff6141",
  /** ハラモ：軽い脂の甘みを感じるピーチ */
  haramo: "#ffaaa7",
  /** 背側の脂：中トロと赤身のあいだのローズ */
  senaka: "#f66574",
} as const;

export type PartDisplaySwatchId = keyof typeof PART_DISPLAY_SWATCHES;

/** 後方互換・短い参照用 */
export const DISPLAY_COLOR_OTORO = PART_DISPLAY_COLOR_OTORO;
export const DISPLAY_COLOR_CHUTORO = PART_DISPLAY_COLOR_CHUTORO;

function toroSwatchColor(partId: string): string | undefined {
  if (partId === "otoro") return PART_DISPLAY_COLOR_OTORO;
  if (partId === "chutoro") return PART_DISPLAY_COLOR_CHUTORO;
  return undefined;
}

/**
 * Supabase の `parts.color` が未更新でも、スナップショット経由の UI を表示スウォッチに揃える。
 * 赤身のみ DB 値を維持する。
 */
export function applyPartDisplayColors(parts: Part[]): Part[] {
  return parts.map((p) => {
    if (p.id === "akami") return p;
    const toro = toroSwatchColor(p.id);
    if (toro) return { ...p, color: toro };
    const swatch = PART_DISPLAY_SWATCHES[p.id as PartDisplaySwatchId];
    return swatch ? { ...p, color: swatch } : p;
  });
}

/** 図鑑マップ等：DB が旧色でもスウォッチを優先（赤身は常に `part.color`） */
export function mapDisplayColorForPart(part: Part): string {
  if (part.id === "akami") return part.color;
  const toro = toroSwatchColor(part.id);
  if (toro) return toro;
  const swatch = PART_DISPLAY_SWATCHES[part.id as PartDisplaySwatchId];
  return swatch ?? part.color;
}
