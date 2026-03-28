import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { hasSupabaseEnv } from "@/lib/env";
import type {
  AppSnapshot,
  MenuStatusEntry,
  MyPageSummary,
  Part,
  PartId,
  Title,
  ViewerContext,
  VisitRecord,
} from "@/lib/domain/types";
import { recordVisitInputSchema, upsertMenuStatusInputSchema } from "@/lib/domain/schemas";
import { mockMasterData, createMockPhotoUrl, createMockViewerContext, readMockState, writeMockState } from "@/lib/mock/store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateVisitStreakWeeks, resolveCurrentTitle } from "@/lib/utils/date";

class AppServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildVisitRecords(parts: Part[], visitLogs: Database["public"]["Tables"]["visit_logs"]["Row"][], visitLogParts: Database["public"]["Tables"]["visit_log_parts"]["Row"][]) {
  const partMap = new Map(parts.map((part) => [part.id, part]));
  const partsByVisit = new Map<string, Part[]>();

  for (const entry of visitLogParts) {
    const part = partMap.get(entry.part_id);
    if (!part) {
      continue;
    }

    const existing = partsByVisit.get(entry.visit_log_id) ?? [];
    existing.push(part);
    partsByVisit.set(entry.visit_log_id, existing.sort((left, right) => left.sort_order - right.sort_order));
  }

  return visitLogs.map<VisitRecord>((visitLog) => ({
    id: visitLog.id,
    visitedAt: visitLog.visited_at,
    memo: visitLog.memo,
    photoUrl: visitLog.photo_url,
    createdAt: visitLog.created_at,
    parts: partsByVisit.get(visitLog.id) ?? [],
  }));
}

function buildMenuStatusEntries(menuItems: Database["public"]["Tables"]["menu_items"]["Row"][], statusRows: Database["public"]["Tables"]["menu_status"]["Row"][]) {
  const statusMap = new Map(statusRows.map((row) => [row.menu_item_id, row]));

  return menuItems.map<MenuStatusEntry>((menuItem) => {
    const statusRow = statusMap.get(menuItem.id);

    return {
      menuItem,
      status: statusRow?.status ?? "available",
      updatedAt: statusRow?.updated_at ?? new Date().toISOString(),
    };
  });
}

function buildMyPageSummary(titles: Title[], visitLogs: Database["public"]["Tables"]["visit_logs"]["Row"][], collectedPartIds: PartId[]): MyPageSummary {
  const visitCount = visitLogs.length;
  const currentTitle = resolveCurrentTitle(titles, visitCount);

  return {
    visitCount,
    collectedCount: collectedPartIds.length,
    streakWeeks: calculateVisitStreakWeeks(visitLogs),
    currentTitle,
    titles: titles.map((title) => ({
      ...title,
      unlocked: visitCount >= title.required_visits,
      current: title.id === currentTitle.id,
    })),
  };
}

async function getSupabaseViewer(client: SupabaseClient<Database>): Promise<ViewerContext> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new AppServiceError(401, "ログインが必要です。");
  }

  const role = user.app_metadata?.role === "staff" ? "staff" : "user";

  return {
    userId: user.id,
    role,
    isMock: false,
  };
}

async function ensureSupabaseProfile(client: SupabaseClient<Database>, user: User) {
  const payload = {
    id: user.id,
    display_name: user.user_metadata.display_name ?? "匿名のまぐろ好き",
    avatar_url: user.user_metadata.avatar_url ?? null,
  };

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    throw new AppServiceError(500, error.message);
  }
}

async function getSupabaseContext() {
  const client = await createServerSupabaseClient();
  const viewer = await getSupabaseViewer(client);
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    await ensureSupabaseProfile(client, user);
  }

  return { client, viewer };
}

async function listMasterData(client?: SupabaseClient<Database>) {
  if (!client) {
    return mockMasterData;
  }

  const [{ data: parts, error: partsError }, { data: titles, error: titlesError }, { data: menuItems, error: menuItemsError }] = await Promise.all([
    client.from("parts").select("*").order("sort_order"),
    client.from("titles").select("*").order("sort_order"),
    client.from("menu_items").select("*").order("sort_order"),
  ]);

  if (partsError || titlesError || menuItemsError || !parts || !titles || !menuItems) {
    throw new AppServiceError(500, partsError?.message ?? titlesError?.message ?? menuItemsError?.message ?? "マスターデータの取得に失敗しました。");
  }

  return {
    parts: parts as Part[],
    titles: titles as Title[],
    menuItems: menuItems as Database["public"]["Tables"]["menu_items"]["Row"][],
  };
}

export async function getViewerContext() {
  if (!hasSupabaseEnv()) {
    return createMockViewerContext();
  }

  const { viewer } = await getSupabaseContext();
  return viewer;
}

export async function getAppSnapshot(): Promise<AppSnapshot> {
  if (!hasSupabaseEnv()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const { parts, titles, menuItems } = mockMasterData;
    const visitLogs = state.visitLogs
      .filter((visitLog) => visitLog.user_id === viewer.userId)
      .sort((left, right) => right.visited_at.localeCompare(left.visited_at));
    const visitLogParts = state.visitLogParts.filter((entry) =>
      visitLogs.some((visitLog) => visitLog.id === entry.visit_log_id),
    );
    const visitRecords = buildVisitRecords(parts, visitLogs, visitLogParts);
    const collectedPartIds = [...new Set(visitLogParts.map((entry) => entry.part_id as PartId))];

    return {
      parts,
      titles,
      menuItems,
      home: {
        recentLogs: visitRecords.slice(0, 5),
        menuStatus: buildMenuStatusEntries(menuItems, state.menuStatus),
      },
      zukan: {
        collectedCount: collectedPartIds.length,
        totalCount: parts.length,
        collectedPartIds,
      },
      myPage: buildMyPageSummary(titles, visitLogs, collectedPartIds),
    };
  }

  const { client, viewer } = await getSupabaseContext();
  const { parts, titles, menuItems } = await listMasterData(client);
  const { data: visitLogs, error: visitLogsError } = await client
    .from("visit_logs")
    .select("*")
    .eq("user_id", viewer.userId)
    .order("visited_at", { ascending: false });
  const { data: menuStatusRows, error: menuStatusError } = await client.from("menu_status").select("*");

  if (visitLogsError || menuStatusError || !visitLogs || !menuStatusRows) {
    throw new AppServiceError(500, visitLogsError?.message ?? menuStatusError?.message ?? "データ取得に失敗しました。");
  }

  const typedVisitLogs = visitLogs as Database["public"]["Tables"]["visit_logs"]["Row"][];
  const visitLogIds = typedVisitLogs.map((entry) => entry.id);
  const { data: visitLogPartsData, error: visitLogPartsError } = visitLogIds.length
    ? await client.from("visit_log_parts").select("*").in("visit_log_id", visitLogIds)
    : { data: [] as Database["public"]["Tables"]["visit_log_parts"]["Row"][], error: null };

  if (visitLogPartsError || !visitLogPartsData) {
    throw new AppServiceError(500, visitLogPartsError?.message ?? "部位情報の取得に失敗しました。");
  }

  const typedVisitLogParts = visitLogPartsData as Database["public"]["Tables"]["visit_log_parts"]["Row"][];
  const visitRecords = buildVisitRecords(parts, typedVisitLogs, typedVisitLogParts);
  const collectedPartIds = [...new Set(typedVisitLogParts.map((entry) => entry.part_id as PartId))];

  return {
    parts,
    titles,
    menuItems,
    home: {
      recentLogs: visitRecords.slice(0, 5),
      menuStatus: buildMenuStatusEntries(menuItems, menuStatusRows as Database["public"]["Tables"]["menu_status"]["Row"][]),
    },
    zukan: {
      collectedCount: collectedPartIds.length,
      totalCount: parts.length,
      collectedPartIds,
    },
    myPage: buildMyPageSummary(titles, typedVisitLogs, collectedPartIds),
  };
}

function decodeDataUrl(dataUrl: string) {
  const [header, payload] = dataUrl.split(",", 2);
  if (!header || !payload) {
    throw new AppServiceError(400, "画像データが不正です。");
  }

  const match = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
  if (!match) {
    throw new AppServiceError(400, "画像形式が不正です。");
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(payload, "base64"),
  };
}

async function uploadPhotoToSupabase(client: SupabaseClient<Database>, userId: string, logId: string, photoDataUrl: string) {
  const { buffer, contentType } = decodeDataUrl(photoDataUrl);
  const ext = contentType === "image/png" ? "png" : "jpg";
  const filePath = `${userId}/${logId}.${ext}`;
  const { error } = await client.storage
    .from("don-photos")
    .upload(filePath, buffer, { contentType, upsert: true });

  if (error) {
    throw new AppServiceError(500, error.message);
  }

  const { data } = client.storage.from("don-photos").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function recordVisit(input: unknown) {
  const parsed = recordVisitInputSchema.parse(input);
  const visitId = randomUUID();

  if (!hasSupabaseEnv()) {
    const viewer = createMockViewerContext();
    const state = await readMockState();
    const createdAt = new Date().toISOString();
    state.visitLogs.unshift({
      id: visitId,
      user_id: viewer.userId,
      visited_at: parsed.visitedAt,
      photo_url: parsed.photoDataUrl ? createMockPhotoUrl() : null,
      memo: parsed.memo ?? null,
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
    return { id: visitId };
  }

  const { client, viewer } = await getSupabaseContext();
  let photoUrl: string | null = null;
  if (parsed.photoDataUrl) {
    photoUrl = await uploadPhotoToSupabase(client, viewer.userId, visitId, parsed.photoDataUrl);
  }

  const visitPayload: Database["public"]["Tables"]["visit_logs"]["Insert"] = {
    id: visitId,
    user_id: viewer.userId,
    visited_at: parsed.visitedAt,
    memo: parsed.memo ?? null,
    photo_url: photoUrl,
  };

  const { error: visitError } = await client.from("visit_logs").insert(visitPayload);
  if (visitError) {
    throw new AppServiceError(500, visitError.message);
  }

  const partPayloads: Database["public"]["Tables"]["visit_log_parts"]["Insert"][] = parsed.partIds.map((partId) => ({
    id: randomUUID(),
    visit_log_id: visitId,
    part_id: partId,
  }));
  const { error: partsError } = await client.from("visit_log_parts").insert(partPayloads);
  if (partsError) {
    throw new AppServiceError(500, partsError.message);
  }

  return { id: visitId };
}

export async function upsertMenuStatus(input: unknown) {
  const parsed = upsertMenuStatusInputSchema.parse(input);

  if (!hasSupabaseEnv()) {
    const viewer = createMockViewerContext();
    if (viewer.role !== "staff") {
      throw new AppServiceError(403, "スタッフのみ更新できます。");
    }

    const state = await readMockState();
    const existing = state.menuStatus.find((entry) => entry.menu_item_id === parsed.menuItemId);
    const updatedAt = new Date().toISOString();
    if (existing) {
      existing.status = parsed.status;
      existing.updated_at = updatedAt;
      existing.updated_by = viewer.userId;
    } else {
      state.menuStatus.push({
        id: randomUUID(),
        menu_item_id: parsed.menuItemId,
        status: parsed.status,
        updated_at: updatedAt,
        updated_by: viewer.userId,
      });
    }
    await writeMockState(state);
    return { ok: true };
  }

  const { client, viewer } = await getSupabaseContext();
  if (viewer.role !== "staff") {
    throw new AppServiceError(403, "スタッフのみ更新できます。");
  }

  const payload: Database["public"]["Tables"]["menu_status"]["Insert"] = {
    menu_item_id: parsed.menuItemId,
    status: parsed.status,
    updated_by: viewer.userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("menu_status").upsert(payload, { onConflict: "menu_item_id" });
  if (error) {
    throw new AppServiceError(500, error.message);
  }

  return { ok: true };
}

export function toRouteError(error: unknown) {
  if (error instanceof AppServiceError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "予期しないエラーが発生しました。" };
}
