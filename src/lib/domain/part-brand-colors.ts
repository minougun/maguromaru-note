import type { Part } from "@/lib/domain/types";

/**
 * 図鑑・記録・マップなど UI 表示用の部位スウォッチ。
 * 赤身（akami）は意図的に含めず、DB / シードの `color` をそのまま使う。
 *
 * 大トロ・中トロは参照 UI（reveal 焼き付け）に合わせて表示色だけ入れ替え。
 */
export const PART_DISPLAY_SWATCHES = {
  /** 大トロ（参照では腹がやや濃いローズ側） */
  otoro: "#e87384",
  /** 中トロ（参照では背・腹がやや淡いピンク側） */
  chutoro: "#ffcee0",
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
