import type { Database } from "@/lib/database.types";
import type { MenuStockStatus, TITLES } from "@/lib/domain/constants";

export type Part = Database["public"]["Tables"]["parts"]["Row"];
export type PartId = Part["id"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuItemId = MenuItem["id"];
export type VisitLog = Database["public"]["Tables"]["visit_logs"]["Row"];
export type VisitLogPart = Database["public"]["Tables"]["visit_log_parts"]["Row"];
export type StoreStatus = Database["public"]["Tables"]["store_status"]["Row"];
export type StoreStatusValue = StoreStatus["status"];
export type MenuItemStatusRow = Database["public"]["Tables"]["menu_item_statuses"]["Row"];
export type QuizStatsRow = Database["public"]["Tables"]["quiz_stats"]["Row"];
export type QuizSessionRow = Database["public"]["Tables"]["quiz_sessions"]["Row"];
export type ShareBonusEventRow = Database["public"]["Tables"]["share_bonus_events"]["Row"];

export type Title = (typeof TITLES)[number];

export interface ViewerContext {
  userId: string;
  email: string | null;
  role: "user" | "admin";
  isMock: boolean;
}

export interface VisitRecord {
  id: string;
  visitedAt: string;
  createdAt: string;
  memo: string | null;
  photoUrl: string | null;
  menuItem: MenuItem;
  parts: Part[];
  shareBonusClaimed: boolean;
}

export interface WeatherSnapshot {
  temperature: number;
  code: number;
  icon: string;
  label: string;
}

export interface DailyTriviaSnapshot {
  trivia: string;
  date: string;
}

export interface HomeSideDataSnapshot {
  weather: WeatherSnapshot;
  trivia: DailyTriviaSnapshot;
  fetchedAt: string;
}

export interface QuizStatsSummary {
  totalCorrectAnswers: number;
  totalAnsweredQuestions: number;
  quizzesCompleted: number;
  bestScore: number;
  bestQuestionCount: number;
  accuracyRate: number;
}

export interface ShareBonusSummary {
  bonusVisitCount: number;
  bonusCorrectAnswers: number;
  sharedVisitLogIds: string[];
  sharedQuizSessionIds: string[];
}

export interface QuizStageProgressSummary {
  /** ステージごとの正解済みの問題数（設問 ID のユニーク数。同一問題は1問分） */
  correctByStage: Record<number, number>;
}

/** ホームの AI 一言（営業中は当日実況、時間外は締めまとめ） */
export interface HomeAiStoreBlurb {
  body: string;
  createdAt: string;
  kind: "intraday" | "closing_summary";
}

export interface HomeData {
  menuItemStatuses: Record<MenuItemId, MenuStockStatus>;
  /** `menu_item_statuses` に行があるとき、そのうち最新の `updated_at`。未登録は null */
  menuStockUpdatedAt: string | null;
  storeStatus: StoreStatus;
  /** 案内営業時間外のマスク時など、スタッフの最終更新時刻を UI に出さない */
  showStaffUpdateTimestamps: boolean;
  /** OpenAI 生成。未設定・テーブル未適用時は null */
  aiStoreBlurb: HomeAiStoreBlurb | null;
  /** ホーム初期表示で使う天気＋日替わり豆知識。別 fetch を避けるため snapshot に同梱 */
  sideData: HomeSideDataSnapshot;
  recentLogs: VisitRecord[];
}

/** 履歴スコープのページネーション（他スコープでは未設定） */
export interface HistoryVisitLogsPage {
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface HistoryData {
  visitCount: number;
  quizStats: QuizStatsSummary;
  quizStageProgress: QuizStageProgressSummary;
  currentTitle: Title | null;
  logs: VisitRecord[];
  shareBonus: ShareBonusSummary;
  visitLogsPage?: HistoryVisitLogsPage;
}

export interface PartMenuAppearanceStat {
  menuItemId: MenuItemId;
  menuItemName: string;
  appearances: number;
  totalMenuVisits: number;
  appearanceRate: number;
}

export interface PartMenuInsight {
  partId: PartId;
  totalAppearances: number;
  menuStats: PartMenuAppearanceStat[];
}

export interface PartDetailProfile {
  partId: PartId;
  rarityLabel: string;
  rarityMemo: string;
  textureMemo: string;
  fatMemo: string;
  firstCollectedAt: string | null;
}

export interface ZukanData {
  collectedPartIds: PartId[];
  collectedCount: number;
  totalCount: number;
  isComplete: boolean;
  partInsights: Record<PartId, PartMenuInsight | undefined>;
  partProfiles: Record<PartId, PartDetailProfile | undefined>;
}

export interface AppSnapshot {
  viewer: ViewerContext;
  parts: Part[];
  menuItems: MenuItem[];
  home: HomeData;
  history: HistoryData;
  zukan: ZukanData;
  canManageAdmin: boolean;
}
