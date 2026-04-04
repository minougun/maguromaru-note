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

export type MenuStockStatus = "available" | "few" | "soldout" | "unset";

export const menuStockLabels: Record<MenuStockStatus, { text: string; className: string }> = {
  available: { text: "◎ あり", className: "badge badge-available" },
  few: { text: "△ 残りわずか", className: "badge badge-few" },
  soldout: { text: "✕ 終了", className: "badge badge-soldout" },
  unset: { text: "— 未設定", className: "badge badge-unset" },
};

export const defaultMenuStockById: Record<(typeof menuItemIds)[number], MenuStockStatus> = {
  maguro_don: "available",
  maguro_don_mini: "available",
  tokujo_don: "available",
  tokujo_don_mini: "available",
};

export const storeStatuses = ["open", "busy", "closing_soon", "closed", "unset"] as const;
export const quizQuestionsPerStage = 10;
export const quizStageCount = 100;
export const quizStagesPerTier = 20;

export const APP_INFO = {
  appName: "まぐろの鉄人ノート",
  description: "まぐろの鉄人の公式Webアプリ",
  subtitle: "まぐろの鉄人 ── 南堀江",
  botName: "鉄人Bot",
  shareTags: "#まぐろの鉄人ノート #まぐろの鉄人 #南堀江グルメ",
  shareImageFileName: "maguro-tetsujin-note-share.png",
  inventoryTitle: "本日のメニュー状況",
  recordTitle: "今日のメニューを記録",
  inventoryMark: "鮪",
} as const;

export const TITLES = [
  { id: "kozou", name: "まぐろ小僧", icon: "🐟", requiredVisits: 5, requiredCollectedParts: 0, requiredQuizCorrect: 10 },
  { id: "beginner", name: "まぐろ入門者", icon: "🎣", requiredVisits: 10, requiredCollectedParts: 0, requiredQuizCorrect: 100 },
  { id: "akami_fan", name: "赤身の理解者", icon: "🥩", requiredVisits: 20, requiredCollectedParts: 5, requiredQuizCorrect: 200 },
  { id: "chutoro", name: "中とろ通", icon: "🍣", requiredVisits: 50, requiredCollectedParts: 5, requiredQuizCorrect: 500 },
  { id: "hunter", name: "希少部位ハンター", icon: "🏆", requiredVisits: 75, requiredCollectedParts: 6, requiredQuizCorrect: 750 },
  { id: "master", name: "まぐろマスター", icon: "👑", requiredVisits: 100, requiredCollectedParts: 6, requiredQuizCorrect: 1000 },
] as const;

export const STORE_INFO = {
  name: "まぐろの鉄人",
  shopLabel: "1号店",
  facility: "単独路面店",
  concept: "まぐろ卸問屋直営店",
  region: "大阪・南堀江",
  address: "大阪府大阪市西区南堀江4-31-21",
  phone: "06-6535-0567",
  hours: "17:00〜22:30（L.O.22:00）",
  regularHoliday: "月曜日（祝日の場合は翌日平日）",
  latestHoursNoticeDate: "2026-03-30",
} as const;
