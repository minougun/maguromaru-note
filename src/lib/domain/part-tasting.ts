import type { PartId } from "@/lib/domain/types";

export const partFatLevels = ["light", "balanced", "rich"] as const;
export type PartFatLevel = (typeof partFatLevels)[number];

export const partTextureLevels = ["firm", "smooth", "melty"] as const;
export type PartTextureLevel = (typeof partTextureLevels)[number];

export interface PartTastingInput {
  partId: PartId;
  fatLevel: PartFatLevel;
  textureLevel: PartTextureLevel;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  wantAgain: boolean;
}

export const PART_FAT_LEVEL_LABELS: Record<PartFatLevel, string> = {
  light: "あっさり",
  balanced: "ちょうどいい",
  rich: "濃厚",
};

export const PART_TEXTURE_LEVEL_LABELS: Record<PartTextureLevel, string> = {
  firm: "弾力あり",
  smooth: "なめらか",
  melty: "とろける",
};

export const DEFAULT_PART_TASTING_INPUT: Omit<PartTastingInput, "partId"> = {
  fatLevel: "balanced",
  textureLevel: "smooth",
  satisfaction: 4,
  wantAgain: true,
};
