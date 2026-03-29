export const partIds = [
  "otoro",
  "chutoro",
  "akami",
  "noten",
  "hoho",
  "meura",
  "kama",
  "haramo",
  "senaka",
] as const;

export const trackedPartIds = [
  "otoro",
  "chutoro",
  "akami",
  "noten",
  "hoho",
  "meura",
] as const;

export const menuItemIds = [
  "maguro_don",
  "maguro_don_mini",
  "tokujo_don",
  "tokujo_don_mini",
] as const;

export type MenuStockStatus = "available" | "few" | "soldout";

export const menuStockLabels: Record<MenuStockStatus, { text: string; className: string }> = {
  available: { text: "◎ あり", className: "badge badge-available" },
  few: { text: "△ 残りわずか", className: "badge badge-few" },
  soldout: { text: "✕ 終了", className: "badge badge-soldout" },
};

export const defaultMenuStockById: Record<(typeof menuItemIds)[number], MenuStockStatus> = {
  maguro_don: "available",
  maguro_don_mini: "available",
  tokujo_don: "few",
  tokujo_don_mini: "soldout",
};

export const storeStatuses = ["open", "busy", "closing_soon", "closed"] as const;
export const quizQuestionsPerStage = 10;
export const quizStageCount = 100;
export const quizStagesPerTier = 20;

export const TITLES = [
  { id: "beginner", name: "まぐろ入門者", icon: "🐟", requiredVisits: 1, requiredCollectedParts: 0, requiredQuizCorrect: 0 },
  { id: "akami_fan", name: "赤身の理解者", icon: "🎣", requiredVisits: 3, requiredCollectedParts: 5, requiredQuizCorrect: 200 },
  { id: "chutoro", name: "中とろ通", icon: "🍣", requiredVisits: 5, requiredCollectedParts: 5, requiredQuizCorrect: 500 },
  { id: "hunter", name: "希少部位ハンター", icon: "🏆", requiredVisits: 10, requiredCollectedParts: 6, requiredQuizCorrect: 750 },
  { id: "master", name: "まぐろマスター", icon: "👑", requiredVisits: 20, requiredCollectedParts: 6, requiredQuizCorrect: 1000 },
] as const;

export const STORE_INFO = {
  name: "海鮮丼まぐろ丸",
  facility: "HUB KITCHEN内",
  address: "大阪府大阪市中央区久太郎町3-1-27 ヒグチビル 1F",
  access: "大阪メトロ本町駅12番出口 徒歩1-2分",
  hours: "10:00〜24:00（売り切れ次第終了）",
  instagram: "@maguromaru_honten",
  lat: 34.6851,
  lng: 135.5006,
} as const;
