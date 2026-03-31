import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 * 赤身（akami）は意図的に含めず、DB / シードの `color` をそのまま使う。
 *
 * 本番の身色・脂の乗りのイメージ（大トロは淡く、中トロは締まった紅色、カマはオレンジ寄り、ほほは最深のルビー等）に
 * 寄せた調色。輝度順は otoro → haramo → meura → noten → senaka → kama → chutoro → hoho。
 */
export const PART_DISPLAY_COLOR_OTORO = "#fff6f4";
export const PART_DISPLAY_COLOR_CHUTORO = "#d4324d";

export const PART_DISPLAY_SWATCHES = {
  otoro: PART_DISPLAY_COLOR_OTORO,
  chutoro: PART_DISPLAY_COLOR_CHUTORO,
  /** 脳天：脂が乗ったローズ（大トロより肉色がはっきり） */
  noten: "#f0a0ad",
  /** 目裏：明るい珊瑚ピンク */
  meura: "#ffc0cb",
  /** ほほ肉：希少部位の深いルビー */
  hoho: "#b4102a",
  /** カマ：焼き霜・脂の気配があるサーモンオレンジ */
  kama: "#e8643a",
  /** ハラモ：甘みのあるピーチピンク */
  haramo: "#ffd8d2",
  /** 背側の脂：中トロと赤身のあいだのローズ */
  senaka: "#e07082",
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
