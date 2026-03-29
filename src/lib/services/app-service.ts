import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";

import type { Database } from "@/lib/database.types";
import {
  checkQuizAnswerInputSchema,
  claimShareBonusInputSchema,
  createQuizSessionInputSchema,
  recordVisitInputSchema,
  submitQuizSessionInputSchema,
  updateStoreStatusInputSchema,
  visitLogIdSchema,
} from "@/lib/domain/schemas";
import type {
  AppSnapshot,
  MenuItem,
  MenuItemId,
  MenuItemStatusRow,
  Part,
  PartId,
  QuizSessionRow,
  QuizStatsRow,
  QuizStatsSummary,
  ShareBonusEventRow,
  ShareBonusSummary,
  StoreStatus,
  ViewerContext,
  VisitRecord,
} from "@/lib/domain/types";
import { defaultMenuStockById, quizQuestionsPerStage, type MenuStockStatus } from "@/lib/domain/constants";
import { seededQuizStats, seededShareBonusEvents, seededStoreStatus } from "@/lib/domain/seed";
import type { SnapshotScope } from "@/lib/domain/snapshot-scope";
import { filterTrackedParts, isTrackedPartId } from "@/lib/domain/tracked-parts";
import { getAdminEmail, getSupabaseEnv, getSupabaseServiceEnv, hasSupabaseEnv, isMockAllowed } from "@/lib/env";
import { createMockPhotoUrl, createMockViewerContext, mockMasterData, readMockState, writeMockState } from "@/lib/mock/store";
import { QUIZ_SESSION_SIZE, createQuizSession, getStageNumberFromQuestionId, scoreQuizAnswers, toPublicQuizSession } from "@/lib/quiz";
import { createEmptyQuizStageProgress, isQuizStageUnlocked } from "@/lib/quiz-stages";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentTitle } from "@/lib/titles";

export class AppServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isMissingShareBonusSchemaError(message: string | undefined) {
  return Boolean(message && (message.includes("share_bonus_events") || message.includes("bonus_visit_tenths") || message.includes("bonus_correct_tenths")));
}

function isMissingQuizSessionScoreColumnError(message: string | undefined) {
  return Boolean(message && message.includes("score"));
}

function shouldUseMockBackend() {
  if (hasSupabaseEnv()) {
    return false;
  }

  if (!isMockAllowed()) {
    throw new AppServiceError(503, "Supabase環境変数が未設定です。本番環境ではmockは使用できません。");
  }

  return true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromAny(client: SupabaseClient<Database>, relation: string): any {
  return (client as unknown as { from(table: string): unknown }).from(relation) as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function todayIsoDate() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function decodeDataUrl(dataUrl: string) {
  const [header, payload] = dataUrl.split(",", 2);
  if (!header || !payload) {
    throw new AppServiceError(400, "画像データが不正です。");
  }

  const match = header.match(/^data:(image\/(?:jpeg|png|webp));base64$/);
  if (!match) {
    throw new AppServiceError(400, "画像形式が不正です。");
  }

  const buffer = Buffer.from(payload, "base64");
  if (buffer.length === 0) {
    throw new AppServiceError(400, "画像データが空です。");
  }

  if (buffer.length > 3 * 1024 * 1024) {
    throw new AppServiceError(400, "画像サイズが大きすぎます。");
  }

  return {
    contentType: match[1],
    buffer,
  };
}

function fileExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function toQuizStatsSummary(row: QuizStatsRow): QuizStatsSummary {
  return {
    totalCorrectAnswers: row.total_correct_answers,
    totalAnsweredQuestions: row.total_answered_questions,
    quizzesCompleted: row.quizzes_completed,
    bestScore: row.best_score,
    bestQuestionCount: row.best_question_count,
    accuracyRate:
      row.total_answered_questions > 0
        ? Math.round((row.total_correct_answers / row.total_answered_questions) * 100)
        : 0,
  };
}

function buildVisitRecords(
  parts: Part[],
  menuItems: MenuItem[],
  visitLogs: Database["public"]["Tables"]["visit_logs"]["Row"][],
  visitLogParts: Database["public"]["Tables"]["visit_log_parts"]["Row"][],
  sharedVisitLogIdSet = new Set<string>(),
) {
  const partMap = new Map(parts.map((part) => [part.id, part]));
  const menuMap = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));
  const partsByVisit = new Map<string, Part[]>();

  for (const entry of visitLogParts) {
    const part = partMap.get(entry.part_id);
    if (!part) {
      continue;
    }

    const list = partsByVisit.get(entry.visit_log_id) ?? [];
    list.push(part);
    partsByVisit.set(entry.visit_log_id, list);
  }

  for (const list of partsByVisit.values()) {
    list.sort((left, right) => left.sort_order - right.sort_order);
  }

  return visitLogs.flatMap<VisitRecord>((visitLog) => {
    const menuItem = menuMap.get(visitLog.menu_item_id);
    if (!menuItem) {
      return [];
    }

    return [
      {
        id: visitLog.id,
        visitedAt: visitLog.visited_at,
        createdAt: visitLog.created_at,
        memo: visitLog.memo,
        photoUrl: visitLog.photo_url,
        menuItem,
        parts: partsByVisit.get(visitLog.id) ?? [],
        shareBonusClaimed: sharedVisitLogIdSet.has(visitLog.id),
      },
    ];
  });
}

function tenthsToCount(value: number) {
  return value / 10;
}

function buildShareBonusSummary(rows: ShareBonusEventRow[]): ShareBonusSummary {
  const bonusVisitTenths = rows.reduce((sum, row) => sum + row.bonus_visit_tenths, 0);
  const bonusCorrectTenths = rows.reduce((sum, row) => sum + row.bonus_correct_tenths, 0);

  return {
    bonusVisitCount: tenthsToCount(bonusVisitTenths),
    bonusCorrectAnswers: tenthsToCount(bonusCorrectTenths),
    sharedVisitLogIds: rows.filter((row) => row.target_type === "visit_log").map((row) => row.target_id),
    sharedQuizSessionIds: rows.filter((row) => row.target_type === "quiz_session").map((row) => row.target_id),
  };
}

function buildCollectedPartIds(parts: Part[], visitLogParts: Database["public"]["Tables"]["visit_log_parts"]["Row"][]) {
  const orderMap = new Map(parts.map((part) => [part.id, part.sort_order]));
  const collectedPartIds = new Set<PartId>();

  for (const entry of visitLogParts) {
    collectedPartIds.add(entry.part_id as PartId);
  }

  return [...collectedPartIds].sort(
    (left, right) => (orderMap.get(left) ?? 999) - (orderMap.get(right) ?? 999),
  );
}

async function getSupabaseViewer(client: SupabaseClient<Database>): Promise<ViewerContext> {
  return getSupabaseViewerFromToken(client);
}

async function getSupabaseViewerFromToken(
  client: SupabaseClient<Database>,
  accessToken?: string,
): Promise<ViewerContext> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new AppServiceError(401, "ログインが必要です。");
  }

  const adminEmail = getAdminEmail();
  const email = user.email?.toLowerCase() ?? null;
  const role = adminEmail && email === adminEmail ? "admin" : "user";

  return {
    userId: user.id,
    email,
    role,
    isMock: false,
  };
}

async function getSupabaseContext() {
  const client = await createServerSupabaseClient();
  const viewer = await getSupabaseViewer(client);
  return { client, viewer };
}

function readBearerToken(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || undefined;
}

function createTokenSupabaseClient(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getSupabaseContextFromAccessToken(accessToken: string) {
  const client = createTokenSupabaseClient(accessToken);
  const viewer = await getSupabaseViewerFromToken(client, accessToken);
  return { client, viewer };
}

function assertAdminViewer(viewer: ViewerContext) {
  if (viewer.isMock) {
    if (viewer.role !== "admin") {
      throw new AppServiceError(403, "管理者のみ更新できます。");
    }
    return;
  }

  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    throw new AppServiceError(500, "ADMIN_EMAIL が設定されていません。");
  }

  if (viewer.role !== "admin" || viewer.email !== adminEmail) {
    throw new AppServiceError(403, "管理者のみ更新できます。");
  }
}

/** スコープに応じて `parts` / `menu_items` の取得を省略する（例: 図鑑は部位マスタのみでよい）。 */
async function listMasterDataPartial(
  client: SupabaseClient<Database> | undefined,
  needParts: boolean,
  needMenuItems: boolean,
): Promise<{ parts: Part[]; menuItems: MenuItem[] }> {
  if (!needParts && !needMenuItems) {
    return { parts: [], menuItems: [] };
  }

  if (!client) {
    return {
      parts: needParts ? mockMasterData.parts : [],
      menuItems: needMenuItems ? mockMasterData.menuItems : [],
    };
  }

  const [partsResult, menuItemsResult] = await Promise.all([
    needParts
      ? fromAny(client, "parts").select("*").order("sort_order")
      : Promise.resolve({ data: [] as Part[], error: null }),
    needMenuItems
      ? fromAny(client, "menu_items").select("*").order("sort_order")
      : Promise.resolve({ data: [] as MenuItem[], error: null }),
  ]);

  const partsError = needParts ? partsResult.error : null;
  const menuItemsError = needMenuItems ? menuItemsResult.error : null;
  const parts = (needParts ? partsResult.data : []) as Part[] | null;
  const menuItems = (needMenuItems ? menuItemsResult.data : []) as MenuItem[] | null;

  if (partsError || menuItemsError || (needParts && !parts) || (needMenuItems && !menuItems)) {
    throw new AppServiceError(500, partsError?.message ?? menuItemsError?.message ?? "マスターデータの取得に失敗しました。");
  }

  return {
    parts: parts ?? [],
    menuItems: menuItems ?? [],
  };
}

async function listMasterData(client?: SupabaseClient<Database>) {
  return listMasterDataPartial(client, true, true);
}

async function listVisitData(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { limit?: number },
) {
  let query = fromAny(client, "visit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  const { data: visitLogs, error: visitLogsError } = await query;

  if (visitLogsError || !visitLogs) {
    throw new AppServiceError(500, visitLogsError?.message ?? "来店記録の取得に失敗しました。");
  }

  const typedVisitLogs = visitLogs as Database["public"]["Tables"]["visit_logs"]["Row"][];
  const visitLogIds = typedVisitLogs.map((entry) => entry.id);
  if (visitLogIds.length === 0) {
    return {
      visitLogs: [] as Database["public"]["Tables"]["visit_logs"]["Row"][],
      visitLogParts: [] as Database["public"]["Tables"]["visit_log_parts"]["Row"][],
    };
  }

  const { data: visitLogParts, error: visitLogPartsError } = await fromAny(client, "visit_log_parts")
    .select("*")
    .in("visit_log_id", visitLogIds);

  if (visitLogPartsError || !visitLogParts) {
    throw new AppServiceError(500, visitLogPartsError?.message ?? "部位記録の取得に失敗しました。");
  }

  return {
    visitLogs: typedVisitLogs,
    visitLogParts: visitLogParts as Database["public"]["Tables"]["visit_log_parts"]["Row"][],
  };
}

async function getStoreStatus(client?: SupabaseClient<Database>) {
  if (!client) {
    const state = await readMockState();
    return state.storeStatus;
  }

  const { data, error } = await fromAny(client, "store_status").select("*").eq("id", 1).maybeSingle();
  if (error) {
    throw new AppServiceError(500, error.message);
  }

  return (data as StoreStatus | null) ?? seededStoreStatus;
}

function buildMenuItemStatuses(rows: MenuItemStatusRow[]) {
  const statuses = { ...defaultMenuStockById } as Record<MenuItemId, MenuStockStatus>;

  for (const row of rows) {
    statuses[row.menu_item_id as MenuItemId] = row.status;
  }

  return statuses;
}

function maxIsoTimestamp(values: string[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((best, cur) => (cur > best ? cur : best), values[0]);
}

async function getMenuItemStatuses(client?: SupabaseClient<Database>): Promise<{
  statuses: Record<MenuItemId, MenuStockStatus>;
  lastUpdatedAt: string | null;
}> {
  if (!client) {
    const state = await readMockState();
    const rows = state.menuItemStatuses;
    return {
      statuses: buildMenuItemStatuses(rows),
      lastUpdatedAt: maxIsoTimestamp(rows.map((row) => row.updated_at)),
    };
  }

  const { data, error } = await fromAny(client, "menu_item_statuses").select("*");
  if (error) {
    throw new AppServiceError(500, error.message);
  }

  const rows = (data as MenuItemStatusRow[] | null) ?? [];
  return {
    statuses: buildMenuItemStatuses(rows),
    lastUpdatedAt: maxIsoTimestamp(rows.map((row) => row.updated_at)),
  };
}

function createEmptyQuizStats(userId: string): QuizStatsRow {
  return {
    ...seededQuizStats,
    user_id: userId,
    total_correct_answers: 0,
    total_answered_questions: 0,
    quizzes_completed: 0,
    best_score: 0,
    best_question_count: 0,
  };
}

type SnapshotFetchPlan = {
  /** `parts` テーブル（図鑑・記録・来店ログの部位解決など） */
  masterParts: boolean;
  /** `menu_items`（来店ログの丼名解決・ホーム在庫一覧など）。図鑑スコープでは不要のため省略 */
  masterMenuItems: boolean;
  menuBundle: boolean;
  store: boolean;
  quizStats: boolean;
  quizSessions: boolean;
  shareBonus: boolean;
  visits: boolean;
  /** ホーム「最近の記録」など、先頭 N 件だけでよいとき DB 側で LIMIT */
  visitFetchLimit?: number;
};

const SNAPSHOT_FETCH_PLANS: Record<SnapshotScope, SnapshotFetchPlan> = {
  full: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: true,
    store: true,
    quizStats: true,
    quizSessions: true,
    shareBonus: true,
    visits: true,
  },
  home: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: true,
    store: true,
    quizStats: false,
    quizSessions: false,
    shareBonus: true,
    visits: true,
    visitFetchLimit: 3,
  },
  admin: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: true,
    store: true,
    quizStats: false,
    quizSessions: false,
    shareBonus: false,
    visits: false,
  },
  history: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: false,
    store: false,
    quizStats: true,
    quizSessions: true,
    shareBonus: true,
    visits: true,
  },
  mypage: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: false,
    store: false,
    quizStats: true,
    quizSessions: true,
    shareBonus: true,
    visits: true,
  },
  zukan: {
    masterParts: true,
    masterMenuItems: false,
    menuBundle: false,
    store: false,
    quizStats: false,
    quizSessions: false,
    shareBonus: false,
    visits: true,
  },
  record: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: false,
    store: false,
    quizStats: false,
    quizSessions: false,
    shareBonus: false,
    visits: false,
  },
  quiz: {
    masterParts: true,
    masterMenuItems: true,
    menuBundle: false,
    store: false,
    quizStats: true,
    quizSessions: true,
    shareBonus: true,
    visits: true,
  },
};

function defaultMenuStatusesBundle(): {
  statuses: Record<MenuItemId, MenuStockStatus>;
  lastUpdatedAt: string | null;
} {
  return {
    statuses: { ...defaultMenuStockById } as Record<MenuItemId, MenuStockStatus>,
    lastUpdatedAt: null,
  };
}

function snapshotPlanNeedsServiceRole(plan: SnapshotFetchPlan) {
  return plan.quizSessions || plan.shareBonus;
}

async function getQuizStats(client: SupabaseClient<Database> | undefined, userId: string) {
  if (!client) {
    const state = await readMockState();
    return state.quizStats.find((entry) => entry.user_id === userId) ?? seededQuizStats;
  }

  const { data, error } = await fromAny(client, "quiz_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppServiceError(500, error.message);
  }

  return (data as QuizStatsRow | null) ?? createEmptyQuizStats(userId);
}

async function getShareBonusEvents(client: SupabaseClient<Database> | undefined, userId: string) {
  if (!client) {
    const state = await readMockState();
    return state.shareBonusEvents.filter((entry) => entry.user_id === userId);
  }

  const { data, error } = await fromAny(client, "share_bonus_events")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    if (isMissingShareBonusSchemaError(error.message)) {
      return [];
    }
    throw new AppServiceError(500, error.message);
  }

  return (data as ShareBonusEventRow[] | null) ?? seededShareBonusEvents;
}

async function listQuizSessionsForUser(client: SupabaseClient<Database> | undefined, userId: string) {
  if (!client) {
    const state = await readMockState();
    return state.quizSessions.filter((entry) => entry.user_id === userId);
  }

  const { data, error } = await fromAny(client, "quiz_sessions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new AppServiceError(500, error.message);
  }

  return (data as QuizSessionRow[] | null) ?? [];
}

/**
 * ステージ解放用の進捗。セッションごとの正解数の最大値（同じ問題を何度解いても、最良の1回分のみが効く）。
 * シェアボーナスによる加算はここには含めない（解放条件は「その回の10問の内訳」に一致させる）。
 */
function buildQuizStageProgressSummary(quizSessions: QuizSessionRow[]) {
  const correctByStage = createEmptyQuizStageProgress();

  for (const session of quizSessions) {
    if (!session.submitted_at) {
      continue;
    }

    const questionIds = parseQuestionIds(session.question_ids);
    const inferredStageNumber =
      getStageNumberFromQuestionId(questionIds[0] ?? "") ??
      Math.max(1, Math.ceil(session.question_count / quizQuestionsPerStage));
    const sessionScore = session.score ?? 0;
    const prev = correctByStage[inferredStageNumber] ?? 0;
    correctByStage[inferredStageNumber] = Math.max(prev, sessionScore);
  }

  return {
    correctByStage,
  };
}

function buildSnapshotFromRecords(
  viewer: ViewerContext,
  parts: Part[],
  menuItems: MenuItem[],
  menuItemStatuses: Record<MenuItemId, MenuStockStatus>,
  menuStockUpdatedAt: string | null,
  storeStatus: StoreStatus,
  quizStatsRow: QuizStatsRow,
  quizSessions: QuizSessionRow[],
  shareBonusEvents: ShareBonusEventRow[],
  visitLogs: Database["public"]["Tables"]["visit_logs"]["Row"][],
  visitLogParts: Database["public"]["Tables"]["visit_log_parts"]["Row"][],
): AppSnapshot {
  const shareBonus = buildShareBonusSummary(shareBonusEvents);
  const quizStageProgress = buildQuizStageProgressSummary(quizSessions);
  const visitRecords = buildVisitRecords(
    parts,
    menuItems,
    visitLogs,
    visitLogParts,
    new Set(shareBonus.sharedVisitLogIds),
  );
  const trackedParts = filterTrackedParts(parts);
  const collectedPartIds = buildCollectedPartIds(
    trackedParts,
    visitLogParts.filter((entry) => isTrackedPartId(entry.part_id)),
  );
  const baseQuizStats = toQuizStatsSummary(quizStatsRow);
  const quizStats = {
    ...baseQuizStats,
    totalCorrectAnswers: baseQuizStats.totalCorrectAnswers + shareBonus.bonusCorrectAnswers,
  };
  const boostedVisitCount = visitRecords.length + shareBonus.bonusVisitCount;
  const currentTitle = getCurrentTitle(
    boostedVisitCount,
    collectedPartIds.length,
    quizStats.totalCorrectAnswers,
  );

  return {
    viewer,
    parts: trackedParts,
    menuItems,
    home: {
      menuItemStatuses,
      menuStockUpdatedAt,
      storeStatus,
      recentLogs: visitRecords.slice(0, 3),
    },
    history: {
      visitCount: boostedVisitCount,
      quizStats,
      quizStageProgress,
      currentTitle,
      logs: visitRecords,
      shareBonus,
    },
    zukan: {
      collectedPartIds,
      collectedCount: collectedPartIds.length,
      totalCount: trackedParts.length,
      isComplete: collectedPartIds.length === trackedParts.length,
    },
    canManageAdmin: viewer.role === "admin",
  };
}

function buildStoragePath(userId: string, visitId: string, ext: string) {
  return `${userId}/${visitId}.${ext}`;
}

function extractStoragePathFromPublicUrl(photoUrl: string | null) {
  if (!photoUrl) {
    return null;
  }

  const marker = "/don-photos/";
  const index = photoUrl.indexOf(marker);
  if (index < 0) {
    return null;
  }

  return decodeURIComponent(photoUrl.slice(index + marker.length));
}

async function removePhotoIfNeeded(client: SupabaseClient<Database>, photoUrl: string | null) {
  const path = extractStoragePathFromPublicUrl(photoUrl);
  if (!path) {
    return;
  }

  await client.storage.from("don-photos").remove([path]);
}

async function buildRecordedVisit(
  parts: Part[],
  menuItems: MenuItem[],
  input: {
    id: string;
    visitedAt: string;
    createdAt: string;
    memo: string | null;
    photoUrl: string | null;
    menuItemId: string;
    partIds: readonly string[];
    shareBonusClaimed?: boolean;
  },
) {
  const menuItem = menuItems.find((entry) => entry.id === input.menuItemId);
  if (!menuItem) {
    throw new AppServiceError(500, "メニュー情報の解決に失敗しました。");
  }

  const selectedPartIds = new Set(input.partIds);
  const selectedParts = parts
    .filter((part) => selectedPartIds.has(part.id))
    .sort((left, right) => left.sort_order - right.sort_order);

  return {
    id: input.id,
    visitedAt: input.visitedAt,
    createdAt: input.createdAt,
    memo: input.memo,
    photoUrl: input.photoUrl,
    menuItem,
    parts: selectedParts,
    shareBonusClaimed: input.shareBonusClaimed ?? false,
  } satisfies VisitRecord;
}

export async function getViewerContext() {
  if (shouldUseMockBackend()) {
    return createMockViewerContext();
  }

  const { viewer } = await getSupabaseContext();
  return viewer;
}

export async function getViewerContextSafe(): Promise<ViewerContext | null> {
  if (shouldUseMockBackend()) {
    return createMockViewerContext();
  }

  try {
    const { viewer } = await getSupabaseContext();
    return viewer;
  } catch {
    return null;
  }
}

export async function getAppSnapshot(accessToken?: string, scope: SnapshotScope = "full"): Promise<AppSnapshot> {
  const plan = SNAPSHOT_FETCH_PLANS[scope];

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const { parts, menuItems } = await listMasterDataPartial(undefined, plan.masterParts, plan.masterMenuItems);
    const quizStatsRow = plan.quizStats
      ? (state.quizStats.find((entry) => entry.user_id === viewer.userId) ?? seededQuizStats)
      : createEmptyQuizStats(viewer.userId);
    const quizSessions = plan.quizSessions ? state.quizSessions.filter((entry) => entry.user_id === viewer.userId) : [];
    const shareBonusEvents = plan.shareBonus
      ? state.shareBonusEvents.filter((entry) => entry.user_id === viewer.userId)
      : [];
    let visitLogs = plan.visits
      ? state.visitLogs
          .filter((visitLog) => visitLog.user_id === viewer.userId)
          .sort((left, right) => {
            const byDate = right.visited_at.localeCompare(left.visited_at);
            return byDate !== 0 ? byDate : right.created_at.localeCompare(left.created_at);
          })
      : [];
    if (plan.visitFetchLimit != null && visitLogs.length > plan.visitFetchLimit) {
      visitLogs = visitLogs.slice(0, plan.visitFetchLimit);
    }
    const visitLogIds = new Set(visitLogs.map((entry) => entry.id));
    const visitLogParts = plan.visits ? state.visitLogParts.filter((entry) => visitLogIds.has(entry.visit_log_id)) : [];
    const menuBundle = plan.menuBundle ? await getMenuItemStatuses(undefined) : defaultMenuStatusesBundle();
    const storeStatus = plan.store ? state.storeStatus : seededStoreStatus;
    return buildSnapshotFromRecords(
      viewer,
      parts,
      menuItems,
      menuBundle.statuses,
      menuBundle.lastUpdatedAt,
      storeStatus,
      quizStatsRow,
      quizSessions,
      shareBonusEvents,
      visitLogs,
      visitLogParts,
    );
  }

  const { client, viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const serviceRoleClient = snapshotPlanNeedsServiceRole(plan) ? createServiceRoleClient() : null;

  const emptyVisits = {
    visitLogs: [] as Database["public"]["Tables"]["visit_logs"]["Row"][],
    visitLogParts: [] as Database["public"]["Tables"]["visit_log_parts"]["Row"][],
  };

  const [{ parts, menuItems }, menuBundle, storeStatus, quizStatsRow, quizSessions, shareBonusEvents, { visitLogs, visitLogParts }] =
    await Promise.all([
      listMasterDataPartial(client, plan.masterParts, plan.masterMenuItems),
      plan.menuBundle ? getMenuItemStatuses(client) : Promise.resolve(defaultMenuStatusesBundle()),
      plan.store ? getStoreStatus(client) : Promise.resolve(seededStoreStatus),
      plan.quizStats ? getQuizStats(client, viewer.userId) : Promise.resolve(createEmptyQuizStats(viewer.userId)),
      plan.quizSessions && serviceRoleClient
        ? listQuizSessionsForUser(serviceRoleClient, viewer.userId)
        : Promise.resolve([] as QuizSessionRow[]),
      plan.shareBonus && serviceRoleClient
        ? getShareBonusEvents(serviceRoleClient, viewer.userId)
        : Promise.resolve([] as ShareBonusEventRow[]),
      plan.visits
        ? listVisitData(
            client,
            viewer.userId,
            plan.visitFetchLimit != null ? { limit: plan.visitFetchLimit } : undefined,
          )
        : Promise.resolve(emptyVisits),
    ]);

  return buildSnapshotFromRecords(
    viewer,
    parts,
    menuItems,
    menuBundle.statuses,
    menuBundle.lastUpdatedAt,
    storeStatus,
    quizStatsRow,
    quizSessions,
    shareBonusEvents,
    visitLogs,
    visitLogParts,
  );
}

export async function recordVisit(input: unknown, accessToken?: string) {
  const parsed = recordVisitInputSchema.parse(input);
  const visitId = randomUUID();
  const createdAt = new Date().toISOString();
  const visitedAt = parsed.visitedAt ?? todayIsoDate();

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const photoUrl = parsed.photoDataUrl ? createMockPhotoUrl() : null;

    state.visitLogs.unshift({
      id: visitId,
      user_id: viewer.userId,
      menu_item_id: parsed.menuItemId,
      visited_at: visitedAt,
      memo: parsed.memo ?? null,
      photo_url: photoUrl,
      created_at: createdAt,
    });

    for (const partId of parsed.partIds) {
      state.visitLogParts.push({
        id: randomUUID(),
        visit_log_id: visitId,
        part_id: partId,
      });
    }

    await writeMockState(state);
    const { parts, menuItems } = mockMasterData;
    const record = await buildRecordedVisit(parts, menuItems, {
      id: visitId,
      visitedAt,
      createdAt,
      memo: parsed.memo ?? null,
      photoUrl,
      menuItemId: parsed.menuItemId,
      partIds: parsed.partIds,
    });
    return { id: visitId, record };
  }

  const { client, viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const { parts, menuItems } = await listMasterData(client);

  let photoUrl: string | null = null;
  let uploadedFilePath: string | null = null;

  if (parsed.photoDataUrl) {
    const { buffer, contentType } = decodeDataUrl(parsed.photoDataUrl);
    uploadedFilePath = buildStoragePath(viewer.userId, visitId, fileExtension(contentType));
    const { error: uploadError } = await client.storage
      .from("don-photos")
      .upload(uploadedFilePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      throw new AppServiceError(500, uploadError.message);
    }

    const { data } = client.storage.from("don-photos").getPublicUrl(uploadedFilePath);
    photoUrl = data.publicUrl;
  }

  const visitPayload: Database["public"]["Tables"]["visit_logs"]["Insert"] = {
    id: visitId,
    user_id: viewer.userId,
    menu_item_id: parsed.menuItemId,
    visited_at: visitedAt,
    memo: parsed.memo ?? null,
    photo_url: photoUrl,
    created_at: createdAt,
  };

  const { error: visitError } = await fromAny(client, "visit_logs").insert(visitPayload);
  if (visitError) {
    if (uploadedFilePath) {
      await client.storage.from("don-photos").remove([uploadedFilePath]);
    }
    throw new AppServiceError(500, visitError.message);
  }

  if (parsed.partIds.length > 0) {
    const partPayloads: Database["public"]["Tables"]["visit_log_parts"]["Insert"][] = parsed.partIds.map((partId) => ({
      id: randomUUID(),
      visit_log_id: visitId,
      part_id: partId,
    }));

    const { error: partsError } = await fromAny(client, "visit_log_parts").insert(partPayloads);
    if (partsError) {
      await fromAny(client, "visit_logs").delete().eq("id", visitId);
      if (uploadedFilePath) {
        await client.storage.from("don-photos").remove([uploadedFilePath]);
      }
      throw new AppServiceError(500, partsError.message);
    }
  }

  const record = await buildRecordedVisit(parts, menuItems, {
    id: visitId,
    visitedAt,
    createdAt,
    memo: parsed.memo ?? null,
    photoUrl,
    menuItemId: parsed.menuItemId,
    partIds: parsed.partIds,
  });

  return { id: visitId, record };
}

export async function deleteVisit(visitLogId: unknown, accessToken?: string) {
  const id = visitLogIdSchema.parse(visitLogId);

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const target = state.visitLogs.find((entry) => entry.id === id && entry.user_id === viewer.userId);
    if (!target) {
      throw new AppServiceError(404, "記録が見つかりません。");
    }

    state.visitLogs = state.visitLogs.filter((entry) => entry.id !== id);
    state.visitLogParts = state.visitLogParts.filter((entry) => entry.visit_log_id !== id);
    state.shareBonusEvents = state.shareBonusEvents.filter(
      (entry) => !(entry.target_type === "visit_log" && entry.target_id === id && entry.user_id === viewer.userId),
    );
    await writeMockState(state);
    return { ok: true };
  }

  const { client, viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const { data: target, error: targetError } = await fromAny(client, "visit_logs")
    .select("id, photo_url")
    .eq("id", id)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  if (targetError) {
    throw new AppServiceError(500, targetError.message);
  }

  if (!target) {
    throw new AppServiceError(404, "記録が見つかりません。");
  }

  const { error } = await fromAny(client, "visit_logs").delete().eq("id", id).eq("user_id", viewer.userId);
  if (error) {
    throw new AppServiceError(500, error.message);
  }

  await removePhotoIfNeeded(client, target.photo_url);
  await fromAny(client, "share_bonus_events")
    .delete()
    .eq("user_id", viewer.userId)
    .eq("target_type", "visit_log")
    .eq("target_id", id);
  return { ok: true };
}

function createServiceRoleClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseServiceEnv();
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createQuizSessionSeed() {
  return Math.floor(Math.random() * 2_147_483_647) || 1;
}

function createQuizSessionExpiry() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

type QuizAnswerProofPayload = {
  v: 1;
  sessionId: string;
  questionId: string;
  expiresAt: string;
};

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new AppServiceError(400, "回答の判定トークンが不正です。");
  }
  return decoded;
}

function getQuizAnswerProofKey() {
  const configured = process.env.QUIZ_ANSWER_PROOF_SECRET?.trim();
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const secret = configured || fallback || "mock-quiz-answer-proof-secret";
  return createHash("sha256").update(secret).digest();
}

function createQuizAnswerProof(payload: QuizAnswerProofPayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getQuizAnswerProofKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(ciphertext)}`;
}

function parseQuizAnswerProof(proof: string): QuizAnswerProofPayload {
  const [ivText, tagText, ciphertextText] = proof.split(".");
  if (!ivText || !tagText || !ciphertextText) {
    throw new AppServiceError(400, "回答の判定トークンが不正です。");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", getQuizAnswerProofKey(), fromBase64Url(ivText));
    decipher.setAuthTag(fromBase64Url(tagText));
    const plaintext = Buffer.concat([
      decipher.update(fromBase64Url(ciphertextText)),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as Partial<QuizAnswerProofPayload>;

    if (
      parsed.v !== 1 ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.questionId !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      throw new AppServiceError(400, "回答の判定トークンが不正です。");
    }

    return {
      v: 1,
      sessionId: parsed.sessionId,
      questionId: parsed.questionId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    throw new AppServiceError(400, "回答の判定トークンが不正です。");
  }
}

function buildQuizAnswerCheckQuestions(
  session: ReturnType<typeof createQuizSession>,
  sessionId: string,
  expiresAt: string,
) {
  return toPublicQuizSession(session).map((question) => ({
    ...question,
    answerProof: createQuizAnswerProof({
      v: 1,
      sessionId,
      questionId: question.id,
      expiresAt,
    }),
  }));
}

function buildQuizStatsUpsert(existing: QuizStatsRow, questionCount: number, correctCount: number) {
  return {
    user_id: existing.user_id,
    total_correct_answers: existing.total_correct_answers + correctCount,
    total_answered_questions: existing.total_answered_questions + questionCount,
    quizzes_completed: existing.quizzes_completed + 1,
    best_score: correctCount > existing.best_score ? correctCount : existing.best_score,
    best_question_count: correctCount > existing.best_score ? questionCount : existing.best_question_count,
    updated_at: new Date().toISOString(),
  } satisfies Database["public"]["Tables"]["quiz_stats"]["Insert"];
}

function parseQuestionIds(value: unknown) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new AppServiceError(500, "クイズセッションの形式が不正です。");
  }

  return value;
}

function collectRecentQuizQuestionIds(
  rows: Array<Pick<QuizSessionRow, "question_ids" | "created_at">>,
  maxSessionCount = 5,
) {
  const recentRows = [...rows]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, maxSessionCount);

  return [...new Set(recentRows.flatMap((row) => parseQuestionIds(row.question_ids)))];
}

function assertQuizSessionAvailable(session: QuizSessionRow) {
  if (session.submitted_at) {
    throw new AppServiceError(409, "このクイズ結果はすでに保存済みです。");
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new AppServiceError(410, "クイズセッションの有効期限が切れました。");
  }
}

export async function createQuizSessionForViewer(input: unknown, accessToken?: string) {
  const parsed = createQuizSessionInputSchema.parse(input);
  const seed = createQuizSessionSeed();
  const expiresAt = createQuizSessionExpiry();

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const quizStageProgress = buildQuizStageProgressSummary(
      state.quizSessions.filter((entry) => entry.user_id === viewer.userId),
    );
    if (
      !isQuizStageUnlocked(parsed.stageNumber, {
        correctByStage: quizStageProgress.correctByStage,
      })
    ) {
      throw new AppServiceError(
        403,
        "前のステージを10問すべて正解していないため、このステージはまだ開放されていません。",
      );
    }
    const recentQuestionIds = collectRecentQuizQuestionIds(
      state.quizSessions.filter((entry) => entry.user_id === viewer.userId),
    );
    const session = createQuizSession(parsed.stageNumber, seed, recentQuestionIds);
    const questionIds = session.map((question) => question.id);
    const record: QuizSessionRow = {
      id: randomUUID(),
      user_id: viewer.userId,
      question_count: QUIZ_SESSION_SIZE,
      question_ids: questionIds,
      score: 0,
      submitted_at: null,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    };
    state.quizSessions = [...state.quizSessions, record];
    await writeMockState(state);

    return {
      sessionId: record.id,
      stageNumber: parsed.stageNumber,
      questionCount: record.question_count,
      questions: buildQuizAnswerCheckQuestions(session, record.id, record.expires_at),
      expiresAt: record.expires_at,
    };
  }

  const { viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const client = createServiceRoleClient();
  const quizSessions = await listQuizSessionsForUser(client, viewer.userId);
  const quizStageProgress = buildQuizStageProgressSummary(quizSessions);
  if (
    !isQuizStageUnlocked(parsed.stageNumber, {
      correctByStage: quizStageProgress.correctByStage,
    })
  ) {
    throw new AppServiceError(
      403,
      "前のステージを10問すべて正解していないため、このステージはまだ開放されていません。",
    );
  }
  const { data: recentSessionRows, error: recentSessionError } = await fromAny(client, "quiz_sessions")
    .select("question_ids, created_at")
    .eq("user_id", viewer.userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (recentSessionError) {
    throw new AppServiceError(500, recentSessionError.message);
  }
  const recentQuestionIds = collectRecentQuizQuestionIds(
    ((recentSessionRows as Array<Pick<QuizSessionRow, "question_ids" | "created_at">> | null) ?? []),
  );
  const session = createQuizSession(parsed.stageNumber, seed, recentQuestionIds);
  const questionIds = session.map((question) => question.id);
  const payload: Database["public"]["Tables"]["quiz_sessions"]["Insert"] = {
    user_id: viewer.userId,
    question_count: QUIZ_SESSION_SIZE,
    question_ids: questionIds,
    score: 0,
    submitted_at: null,
    expires_at: expiresAt,
  };

  let insertResult = await fromAny(client, "quiz_sessions").insert(payload).select("*").single();
  if (insertResult.error && isMissingQuizSessionScoreColumnError(insertResult.error.message)) {
    const { score: _score, ...legacyPayload } = payload;
    insertResult = await fromAny(client, "quiz_sessions").insert(legacyPayload).select("*").single();
  }
  const { data, error } = insertResult;
  if (error || !data) {
    throw new AppServiceError(500, error?.message ?? "クイズセッションの作成に失敗しました。");
  }

  return {
    sessionId: (data as QuizSessionRow).id,
    stageNumber: parsed.stageNumber,
    questionCount: QUIZ_SESSION_SIZE,
    questions: buildQuizAnswerCheckQuestions(session, (data as QuizSessionRow).id, expiresAt),
    expiresAt,
  };
}

export async function submitQuizSession(input: unknown, accessToken?: string) {
  const parsed = submitQuizSessionInputSchema.parse(input);

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const session = state.quizSessions.find((entry) => entry.id === parsed.sessionId && entry.user_id === viewer.userId);
    if (!session) {
      throw new AppServiceError(404, "クイズセッションが見つかりません。");
    }
    assertQuizSessionAvailable(session);
    if (parsed.answers.length !== session.question_count) {
      throw new AppServiceError(400, "回答数が問題数と一致しません。");
    }

    const questionIds = parseQuestionIds(session.question_ids);
    const results = scoreQuizAnswers(questionIds, parsed.answers);
    const correctCount = results.filter((entry) => entry.correct).length;
    const existing =
      state.quizStats.find((entry) => entry.user_id === viewer.userId) ?? createEmptyQuizStats(viewer.userId);
    const updatedQuizStats: QuizStatsRow = {
      ...buildQuizStatsUpsert(existing, session.question_count, correctCount),
    };
    session.submitted_at = new Date().toISOString();
    session.score = correctCount;
    state.quizStats = [...state.quizStats.filter((entry) => entry.user_id !== viewer.userId), updatedQuizStats];
    state.quizSessions = state.quizSessions.map((entry) => (entry.id === session.id ? session : entry));
    await writeMockState(state);

    return {
      ok: true,
      score: correctCount,
      questionCount: session.question_count,
      quizStats: toQuizStatsSummary(updatedQuizStats),
      results,
    };
  }

  const { viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const client = createServiceRoleClient();
  const { data: sessionData, error: sessionError } = await fromAny(client, "quiz_sessions")
    .select("*")
    .eq("id", parsed.sessionId)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  if (sessionError) {
    throw new AppServiceError(500, sessionError.message);
  }
  if (!sessionData) {
    throw new AppServiceError(404, "クイズセッションが見つかりません。");
  }

  const session = sessionData as QuizSessionRow;
  assertQuizSessionAvailable(session);
  if (parsed.answers.length !== session.question_count) {
    throw new AppServiceError(400, "回答数が問題数と一致しません。");
  }

  const questionIds = parseQuestionIds(session.question_ids);
  const results = scoreQuizAnswers(questionIds, parsed.answers);
  const correctCount = results.filter((entry) => entry.correct).length;

  let submitResult = await fromAny(client, "quiz_sessions")
    .update({ submitted_at: new Date().toISOString(), score: correctCount })
    .eq("id", session.id)
    .eq("user_id", viewer.userId)
    .is("submitted_at", null)
    .select("id");

  if (submitResult.error && isMissingQuizSessionScoreColumnError(submitResult.error.message)) {
    submitResult = await fromAny(client, "quiz_sessions")
      .update({ submitted_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("user_id", viewer.userId)
      .is("submitted_at", null)
      .select("id");
  }

  const { data: submittedRows, error: submitError } = submitResult;

  if (submitError) {
    throw new AppServiceError(500, submitError.message);
  }
  if (!submittedRows || submittedRows.length === 0) {
    throw new AppServiceError(409, "このクイズ結果はすでに保存済みです。");
  }

  const existing = await getQuizStats(client, viewer.userId);
  const statsPayload = buildQuizStatsUpsert(existing, session.question_count, correctCount);
  const { data: quizStatsData, error: quizStatsError } = await fromAny(client, "quiz_stats")
    .upsert(statsPayload)
    .select("*")
    .single();

  if (quizStatsError || !quizStatsData) {
    throw new AppServiceError(500, quizStatsError?.message ?? "クイズ結果の保存に失敗しました。");
  }

  return {
    ok: true,
    score: correctCount,
    questionCount: session.question_count,
    quizStats: toQuizStatsSummary(quizStatsData as QuizStatsRow),
    results,
  };
}

export async function claimShareBonus(input: unknown, accessToken?: string) {
  const parsed = claimShareBonusInputSchema.parse(input);

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const existingEvent = state.shareBonusEvents.find(
      (entry) =>
        entry.user_id === viewer.userId &&
        entry.target_type === parsed.targetType &&
        entry.target_id === parsed.targetId,
    );
    if (existingEvent) {
      return {
        ok: true,
        alreadyClaimed: true,
        bonusVisitCount: tenthsToCount(existingEvent.bonus_visit_tenths),
        bonusCorrectAnswers: tenthsToCount(existingEvent.bonus_correct_tenths),
      };
    }

    let event: ShareBonusEventRow;
    if (parsed.targetType === "visit_log") {
      const log = state.visitLogs.find((entry) => entry.id === parsed.targetId && entry.user_id === viewer.userId);
      if (!log) {
        throw new AppServiceError(404, "シェア対象の記録が見つかりません。");
      }
      event = {
        id: randomUUID(),
        user_id: viewer.userId,
        target_type: "visit_log",
        target_id: log.id,
        channel: parsed.channel,
        bonus_visit_tenths: 2,
        bonus_correct_tenths: 0,
        created_at: new Date().toISOString(),
      };
    } else {
      const session = state.quizSessions.find((entry) => entry.id === parsed.targetId && entry.user_id === viewer.userId);
      if (!session || !session.submitted_at) {
        throw new AppServiceError(404, "シェア対象のクイズ結果が見つかりません。");
      }
      event = {
        id: randomUUID(),
        user_id: viewer.userId,
        target_type: "quiz_session",
        target_id: session.id,
        channel: parsed.channel,
        bonus_visit_tenths: 0,
        bonus_correct_tenths: session.score * 2,
        created_at: new Date().toISOString(),
      };
    }

    state.shareBonusEvents.push(event);
    await writeMockState(state);
    return {
      ok: true,
      alreadyClaimed: false,
      bonusVisitCount: tenthsToCount(event.bonus_visit_tenths),
      bonusCorrectAnswers: tenthsToCount(event.bonus_correct_tenths),
    };
  }

  const { viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const client = createServiceRoleClient();
  const { data: existingEventRows, error: existingEventError } = await fromAny(client, "share_bonus_events")
    .select("*")
    .eq("user_id", viewer.userId)
    .eq("target_type", parsed.targetType)
    .eq("target_id", parsed.targetId)
    .limit(1);

  if (existingEventError) {
    if (isMissingShareBonusSchemaError(existingEventError.message)) {
      throw new AppServiceError(503, "本番DBのシェアボーナス migration が未適用です。");
    }
    throw new AppServiceError(500, existingEventError.message);
  }

  const existingEvent = (existingEventRows as ShareBonusEventRow[] | null)?.[0];
  if (existingEvent) {
    return {
      ok: true,
      alreadyClaimed: true,
      bonusVisitCount: tenthsToCount(existingEvent.bonus_visit_tenths),
      bonusCorrectAnswers: tenthsToCount(existingEvent.bonus_correct_tenths),
    };
  }

  let payload: Database["public"]["Tables"]["share_bonus_events"]["Insert"];
  if (parsed.targetType === "visit_log") {
    const { data: visitLogData, error: visitLogError } = await fromAny(client, "visit_logs")
      .select("id")
      .eq("id", parsed.targetId)
      .eq("user_id", viewer.userId)
      .maybeSingle();
    if (visitLogError) {
      throw new AppServiceError(500, visitLogError.message);
    }
    if (!visitLogData) {
      throw new AppServiceError(404, "シェア対象の記録が見つかりません。");
    }

    payload = {
      user_id: viewer.userId,
      target_type: "visit_log",
      target_id: parsed.targetId,
      channel: parsed.channel,
      bonus_visit_tenths: 2,
      bonus_correct_tenths: 0,
    };
  } else {
    let quizSessionResult = await fromAny(client, "quiz_sessions")
      .select("id, submitted_at, score")
      .eq("id", parsed.targetId)
      .eq("user_id", viewer.userId)
      .maybeSingle();
    if (quizSessionResult.error && isMissingQuizSessionScoreColumnError(quizSessionResult.error.message)) {
      throw new AppServiceError(503, "本番DBのクイズ共有ボーナス migration が未適用です。");
    }
    const { data: quizSessionData, error: quizSessionError } = quizSessionResult;
    if (quizSessionError) {
      throw new AppServiceError(500, quizSessionError.message);
    }
    if (!quizSessionData || !(quizSessionData as Pick<QuizSessionRow, "submitted_at">).submitted_at) {
      throw new AppServiceError(404, "シェア対象のクイズ結果が見つかりません。");
    }

    payload = {
      user_id: viewer.userId,
      target_type: "quiz_session",
      target_id: parsed.targetId,
      channel: parsed.channel,
      bonus_visit_tenths: 0,
      bonus_correct_tenths: ((quizSessionData as Pick<QuizSessionRow, "score">).score ?? 0) * 2,
    };
  }

  const { data, error } = await fromAny(client, "share_bonus_events").insert(payload).select("*").single();
  if (error || !data) {
    if (isMissingShareBonusSchemaError(error?.message)) {
      throw new AppServiceError(503, "本番DBのシェアボーナス migration が未適用です。");
    }
    throw new AppServiceError(500, error?.message ?? "シェアボーナスの記録に失敗しました。");
  }

  return {
    ok: true,
    alreadyClaimed: false,
    bonusVisitCount: tenthsToCount((data as ShareBonusEventRow).bonus_visit_tenths),
    bonusCorrectAnswers: tenthsToCount((data as ShareBonusEventRow).bonus_correct_tenths),
  };
}

export async function checkQuizAnswer(input: unknown, accessToken?: string) {
  const parsed = checkQuizAnswerInputSchema.parse(input);

  if (parsed.answerProof) {
    const proof = parseQuizAnswerProof(parsed.answerProof);
    if (proof.sessionId !== parsed.sessionId || proof.questionId !== parsed.questionId) {
      throw new AppServiceError(400, "問題の照合に失敗しました。");
    }
    if (new Date(proof.expiresAt).getTime() < Date.now()) {
      throw new AppServiceError(410, "クイズセッションの有効期限が切れました。");
    }

    const [result] = scoreQuizAnswers([parsed.questionId], [parsed.answerIndexes]);
    return {
      ok: true,
      result,
    };
  }

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const session = state.quizSessions.find((entry) => entry.id === parsed.sessionId && entry.user_id === viewer.userId);
    if (!session) {
      throw new AppServiceError(404, "クイズセッションが見つかりません。");
    }
    assertQuizSessionAvailable(session);

    const questionIds = parseQuestionIds(session.question_ids);
    if (!questionIds.includes(parsed.questionId)) {
      throw new AppServiceError(400, "この問題はクイズセッションに含まれていません。");
    }

    const [result] = scoreQuizAnswers([parsed.questionId], [parsed.answerIndexes]);
    return {
      ok: true,
      result,
    };
  }

  const { viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  const client = createServiceRoleClient();
  const { data: sessionData, error: sessionError } = await fromAny(client, "quiz_sessions")
    .select("*")
    .eq("id", parsed.sessionId)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  if (sessionError) {
    throw new AppServiceError(500, sessionError.message);
  }
  if (!sessionData) {
    throw new AppServiceError(404, "クイズセッションが見つかりません。");
  }

  const session = sessionData as QuizSessionRow;
  assertQuizSessionAvailable(session);

  const questionIds = parseQuestionIds(session.question_ids);
  if (!questionIds.includes(parsed.questionId)) {
    throw new AppServiceError(400, "この問題はクイズセッションに含まれていません。");
  }

  const [result] = scoreQuizAnswers([parsed.questionId], [parsed.answerIndexes]);
  return {
    ok: true,
    result,
  };
}

export async function updateStoreStatus(input: unknown, accessToken?: string) {
  const parsed = updateStoreStatusInputSchema.parse(input);

  if (shouldUseMockBackend()) {
    const viewer = createMockViewerContext();
    assertAdminViewer(viewer);

    const state = await readMockState();
    state.storeStatus = {
      id: 1,
      recommendation: parsed.recommendation,
      status: parsed.status,
      status_note: parsed.statusNote,
      weather_comment: parsed.weatherComment,
      updated_at: new Date().toISOString(),
    };
    state.menuItemStatuses = Object.entries(parsed.menuStocks).map(([menuItemId, status]) => ({
      menu_item_id: menuItemId,
      status,
      updated_at: state.storeStatus.updated_at,
    })) as MenuItemStatusRow[];
    await writeMockState(state);
    return {
      ok: true,
      storeStatus: state.storeStatus,
      menuItemStatuses: buildMenuItemStatuses(state.menuItemStatuses),
    };
  }

  const { viewer } = accessToken
    ? await getSupabaseContextFromAccessToken(accessToken)
    : await getSupabaseContext();
  assertAdminViewer(viewer);
  const client = createServiceRoleClient();
  const payload: Database["public"]["Tables"]["store_status"]["Insert"] = {
    id: 1,
    recommendation: parsed.recommendation,
    status: parsed.status,
    status_note: parsed.statusNote,
    weather_comment: parsed.weatherComment,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await fromAny(client, "store_status").upsert(payload).select("*").single();
  if (error || !data) {
    throw new AppServiceError(500, error?.message ?? "店舗ステータスの更新に失敗しました。");
  }

  const menuStatusPayloads = Object.entries(parsed.menuStocks).map(([menuItemId, status]) => ({
    menu_item_id: menuItemId,
    status,
    updated_at: payload.updated_at!,
  })) satisfies Database["public"]["Tables"]["menu_item_statuses"]["Insert"][];

  const { data: menuStatusRows, error: menuStatusError } = await fromAny(client, "menu_item_statuses")
    .upsert(menuStatusPayloads)
    .select("*");

  if (menuStatusError || !menuStatusRows) {
    throw new AppServiceError(500, menuStatusError?.message ?? "メニュー在庫の更新に失敗しました。");
  }

  return {
    ok: true,
    storeStatus: data as StoreStatus,
    menuItemStatuses: buildMenuItemStatuses(menuStatusRows as MenuItemStatusRow[]),
  };
}

export function getAccessTokenFromRequest(request: Request) {
  return readBearerToken(request.headers.get("authorization"));
}

export function toRouteError(error: unknown) {
  if (error instanceof AppServiceError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof ZodError) {
    return { status: 400, message: error.issues[0]?.message ?? "入力が不正です。" };
  }

  if (error instanceof SyntaxError) {
    return { status: 400, message: "リクエスト本文の形式が不正です。" };
  }

  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "予期しないエラーが発生しました。" };
}
