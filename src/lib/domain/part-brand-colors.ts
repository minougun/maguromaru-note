import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 * 赤身（akami）は意図的に含めず、DB / シードの `color` をそのまま使う。
 *
 * 大トロと中トロの表示色を入れ替える場合は、下の2定数だけを交換する。
 */
export const PART_DISPLAY_COLOR_OTORO = "#e87384";
export const PART_DISPLAY_COLOR_CHUTORO = "#ffcee0";

export const PART_DISPLAY_SWATCHES = {
  otoro: PART_DISPLAY_COLOR_OTORO,
  chutoro: PART_DISPLAY_COLOR_CHUTORO,
  /** 脳天：とろけ感の淡い桃白 */
  noten: "#fde8e6",
  /** 目裏：明るい珊瑚ピンク */
  meura: "#ff9fab",
  /** ほほ肉：くすませない鮮やかなルビー */
  hoho: "#e54560",
  /** カマ：焼き霜・脂の気配があるサーモンオレンジ */
  kama: "#f06b4a",
  /** ハラモ：軽い脂の甘みを感じるピーチ */
  haramo: "#ffb0ad",
  /** 背側の脂：中トロと赤身のあいだのローズ */
  senaka: "#dc7282",
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
