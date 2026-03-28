import type { MenuItem, Part, QuizStatsRow, StoreStatus, VisitLog, VisitLogPart } from "@/lib/domain/types";

export const MOCK_USER_ID = "00000000-0000-4000-8000-000000000001";
export const MOCK_ADMIN_EMAIL = "admin@example.com";

export const seededParts: Part[] = [
  { id: "otoro", name: "大トロ", area: "腹部", rarity: 3, description: "最高級の脂のり", color: "#ff6b6b", sort_order: 1 },
  { id: "chutoro", name: "中トロ", area: "腹部", rarity: 2, description: "脂と赤身のバランス", color: "#e85555", sort_order: 2 },
  { id: "akami", name: "赤身", area: "背部", rarity: 1, description: "旨味の王道", color: "#cc3333", sort_order: 3 },
  { id: "noten", name: "脳天", area: "頭部", rarity: 3, description: "大トロ級のとろける食感", color: "#ff8585", sort_order: 4 },
  { id: "hoho", name: "ほほ肉", area: "頭部", rarity: 3, description: "肉のような弾力と濃厚な旨味", color: "#d94444", sort_order: 5 },
  { id: "kama", name: "カマ", area: "胸部", rarity: 2, description: "脂がのった希少部位", color: "#f07070", sort_order: 6 },
  { id: "haramo", name: "ハラモ", area: "腹部", rarity: 2, description: "腹の大トロに近い部分", color: "#e06060", sort_order: 7 },
  { id: "senaka", name: "背トロ", area: "背部", rarity: 2, description: "赤身に近い上品な脂", color: "#d35050", sort_order: 8 },
];

export const seededMenuItems: MenuItem[] = [
  { id: "maguro_don", name: "まぐろ丼", price: 2000, sort_order: 1 },
  { id: "maguro_don_mini", name: "まぐろ丼ミニ", price: 1500, sort_order: 2 },
  { id: "tokujo_don", name: "特上まぐろ丼（大トロ入り）", price: 3000, sort_order: 3 },
  { id: "tokujo_don_mini", name: "特上まぐろ丼ミニ", price: 2500, sort_order: 4 },
];

export const seededStoreStatus: StoreStatus = {
  id: 1,
  recommendation: "今日はまぐろ丼の赤身の状態がかなり良いです。",
  status: "open",
  status_note: "赤身たっぷりで営業中",
  weather_comment: "本町で営業中",
  updated_at: "2026-03-28T12:34:00.000Z",
};

export const seededQuizStats: QuizStatsRow = {
  user_id: MOCK_USER_ID,
  total_correct_answers: 18,
  total_answered_questions: 30,
  quizzes_completed: 1,
  best_score: 18,
  best_question_count: 30,
  updated_at: "2026-03-28T12:34:00.000Z",
};

export const seededVisitLogs: VisitLog[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: MOCK_USER_ID,
    menu_item_id: "maguro_don",
    visited_at: "2026-03-28",
    memo: "脳天とろけた！",
    photo_url: null,
    created_at: "2026-03-28T12:34:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    user_id: MOCK_USER_ID,
    menu_item_id: "maguro_don",
    visited_at: "2026-03-22",
    memo: "脂のバランス最高",
    photo_url: null,
    created_at: "2026-03-22T11:12:00.000Z",
  },
];

export const seededVisitLogParts: VisitLogPart[] = [
  { id: "20000000-0000-4000-8000-000000000001", visit_log_id: "10000000-0000-4000-8000-000000000001", part_id: "otoro" },
  { id: "20000000-0000-4000-8000-000000000002", visit_log_id: "10000000-0000-4000-8000-000000000001", part_id: "noten" },
  { id: "20000000-0000-4000-8000-000000000003", visit_log_id: "10000000-0000-4000-8000-000000000001", part_id: "chutoro" },
  { id: "20000000-0000-4000-8000-000000000004", visit_log_id: "10000000-0000-4000-8000-000000000002", part_id: "akami" },
  { id: "20000000-0000-4000-8000-000000000005", visit_log_id: "10000000-0000-4000-8000-000000000002", part_id: "kama" },
];
