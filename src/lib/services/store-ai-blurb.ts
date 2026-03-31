import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { menuStockLabels, type MenuStockStatus } from "@/lib/domain/constants";
import {
  calendarDateJst,
  isWithinStoreBusinessHoursJst,
  minutesFromMidnightJst,
} from "@/lib/domain/store-business-hours";
import type { HomeAiStoreBlurb, MenuItem, MenuItemId, StoreStatus } from "@/lib/domain/types";
import { getSupabaseServiceEnv, hasSupabaseServiceEnv } from "@/lib/env";

export type StoreAiBlurbKind = "intraday" | "closing_summary";

export type StoreAiBlurbRow = Database["public"]["Tables"]["store_ai_blurbs"]["Row"];

const OPEN_MINUTES_JST = 11 * 60;
const CLOSE_MINUTES_JST = 21 * 60;

export function addCalendarDaysJst(ymd: string, deltaDays: number): string {
  const anchor = new Date(`${ymd}T12:00:00+09:00`);
  anchor.setUTCDate(anchor.getUTCDate() + deltaDays);
  return calendarDateJst(anchor);
}

/**
 * 締め「まとめ 1 行」を紐づける営業日（JST）。
 * - 21:00〜23:59 … 当日の営業終了後
 * - 0:00〜10:59 … 直前に終わったのは前日の営業日
 */
export function closingBlurbJstDate(now: Date): string {
  const today = calendarDateJst(now);
  const mins = minutesFromMidnightJst(now);
  if (mins < OPEN_MINUTES_JST) {
    return addCalendarDaysJst(today, -1);
  }
  if (mins >= CLOSE_MINUTES_JST) {
    return today;
  }
  return today;
}

export type StockSnapshotForAi = {
  store: Pick<StoreStatus, "status" | "status_note" | "recommendation" | "weather_comment" | "updated_at">;
  menuLines: { name: string; status: MenuStockStatus }[];
};

export function fingerprintStockSnapshot(snap: StockSnapshotForAi): string {
  const payload = {
    s: snap.store,
    m: snap.menuLines.map((row) => [row.name, row.status] as const),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildStockSnapshotForAi(
  store: Pick<StoreStatus, "status" | "status_note" | "recommendation" | "weather_comment" | "updated_at">,
  menuItems: MenuItem[],
  statuses: Record<MenuItemId, MenuStockStatus>,
): StockSnapshotForAi {
  const sortedItems = [...menuItems].sort((a, b) => a.sort_order - b.sort_order);
  return {
    store: {
      status: store.status,
      status_note: store.status_note,
      recommendation: store.recommendation,
      weather_comment: store.weather_comment,
      updated_at: store.updated_at,
    },
    menuLines: sortedItems.map((item) => ({
      name: item.name,
      status: statuses[item.id] ?? "unset",
    })),
  };
}

function storeStatusLabelJa(status: StoreStatus["status"]): string {
  switch (status) {
    case "open":
      return "営業中";
    case "busy":
      return "混雑中";
    case "closing_soon":
      return "まもなく終了";
    case "closed":
      return "本日終了";
    default:
      return "未設定";
  }
}

export function formatSnapshotForPrompt(snap: StockSnapshotForAi): string {
  const lines = [
    `営業表示: ${storeStatusLabelJa(snap.store.status)}`,
    snap.store.status_note ? `店舗メモ: ${snap.store.status_note}` : null,
    snap.store.recommendation ? `おすすめ: ${snap.store.recommendation}` : null,
    snap.store.weather_comment ? `天気コメント: ${snap.store.weather_comment}` : null,
    "丼の入荷状況:",
    ...snap.menuLines.map((row) => `  - ${row.name}: ${menuStockLabels[row.status].text}`),
  ].filter(Boolean);
  return lines.join("\n");
}

export function sanitizeAiBlurbBody(raw: string, maxLen: number): string | null {
  const oneLine = raw.replace(/\s+/g, " ").trim();
  if (!oneLine || oneLine.length > maxLen) {
    return null;
  }
  return oneLine;
}

export async function completeOpenAiChat(system: string, user: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (!key) {
    return null;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : null;
}

/* Supabase の .from 推論がテーブル追加直後に never になるため、実行時テーブル名は正しく store_ai_blurbs のまま */
function fromStoreAiBlurbs(client: SupabaseClient<Database>) {
  return (client as unknown as { from: (t: string) => ReturnType<SupabaseClient<Database>["from"]> }).from(
    "store_ai_blurbs",
  );
}

export async function fetchLatestIntradayBlurb(
  admin: SupabaseClient<Database>,
  jstDate: string,
): Promise<Pick<StoreAiBlurbRow, "source_fingerprint" | "created_at"> | null> {
  const { data, error } = await fromStoreAiBlurbs(admin)
    .select("source_fingerprint, created_at")
    .eq("kind", "intraday")
    .eq("jst_date", jstDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as Pick<StoreAiBlurbRow, "source_fingerprint" | "created_at"> | null;
}

export async function hasClosingSummary(admin: SupabaseClient<Database>, jstDate: string): Promise<boolean> {
  const { data, error } = await fromStoreAiBlurbs(admin)
    .select("id")
    .eq("kind", "closing_summary")
    .eq("jst_date", jstDate)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data != null;
}

export async function insertStoreAiBlurb(
  admin: SupabaseClient<Database>,
  row: Database["public"]["Tables"]["store_ai_blurbs"]["Insert"],
): Promise<void> {
  const { error } = await fromStoreAiBlurbs(admin).insert(row);
  if (error) {
    throw new Error(error.message);
  }
}

export function createServiceRoleSupabase(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseServiceEnv();
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function cronCanRunAiBlurb(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim()) && hasSupabaseServiceEnv();
}

/** ホーム表示用: 営業中は当日の実況最新、営業時間外は締めの 1 行（該当営業日） */
export async function fetchStoreAiBlurbForHome(
  client: SupabaseClient<Database> | undefined,
  now: Date,
): Promise<HomeAiStoreBlurb | null> {
  if (!client) {
    return null;
  }

  if (isWithinStoreBusinessHoursJst(now)) {
    const today = calendarDateJst(now);
    const { data, error } = await fromStoreAiBlurbs(client)
      .select("body, created_at, kind")
      .eq("kind", "intraday")
      .eq("jst_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    if (!data) {
      return null;
    }
    const row = data as Pick<StoreAiBlurbRow, "body" | "created_at" | "kind">;
    return { body: row.body, createdAt: row.created_at, kind: "intraday" };
  }

  const closingDate = closingBlurbJstDate(now);
  const { data, error } = await fromStoreAiBlurbs(client)
    .select("body, created_at, kind")
    .eq("kind", "closing_summary")
    .eq("jst_date", closingDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }
  if (!data) {
    return null;
  }
  const row = data as Pick<StoreAiBlurbRow, "body" | "created_at" | "kind">;
  return { body: row.body, createdAt: row.created_at, kind: "closing_summary" };
}

const INTRADAY_SYSTEM = `あなたは海鮮丼店「まぐろ丸」の公式アプリに表示する短い実況コメントを書く担当です。
ルール:
- 与えられたデータに書いてある事実だけを使う。数値・在庫状況を捏造しない。
- 1〜2文、合計 90 文字以内。口調は温かくフレンドリーな「店の仲間」。
- 絵文字は最大1個まで。敬体（です・ます）。
- 出力は本文のみ（引用符や「Bot」などのメタ文は禁止）。`;

const CLOSING_SYSTEM = `あなたは海鮮丼店「まぐろ丸」の公式アプリ用に、その日の営業を締める一言サマリーを書きます。
ルール:
- 与えられたデータの事実のみ。捏造禁止。
- 厳密に 1 行・70 文字以内。感謝や明日への期待を軽く含めてよい。
- 絵文字は使わない。敬体。
- 出力は本文のみ。`;

export async function generateIntradayCopy(snapshotText: string): Promise<string | null> {
  const raw = await completeOpenAiChat(
    INTRADAY_SYSTEM,
    `以下は現在の店舗・入荷状況です。実況風に短くまとめてください。\n\n${snapshotText}`,
  );
  return raw ? sanitizeAiBlurbBody(raw, 120) : null;
}

export async function generateClosingCopy(snapshotText: string): Promise<string | null> {
  const raw = await completeOpenAiChat(
    CLOSING_SYSTEM,
    `以下は締め時点の店舗・入荷状況です。本日のまとめを 1 行で。\n\n${snapshotText}`,
  );
  return raw ? sanitizeAiBlurbBody(raw, 70) : null;
}
