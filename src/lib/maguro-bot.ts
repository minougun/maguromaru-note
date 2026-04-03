import { withAppBasePath } from "@/lib/public-path";
import type { DailyTriviaSnapshot } from "@/lib/domain/types";

interface DailyTriviaRouteResponse extends DailyTriviaSnapshot {
  success: boolean;
}

const fallbackTrivia = "まぐろは止まらず泳ぎ続ける回遊魚です。今日の一杯もじっくり味わってみてください。";

const triviaCache: { value: DailyTriviaSnapshot | null; expiresAt: number; inflight: Promise<DailyTriviaSnapshot> | null } = {
  value: null,
  expiresAt: 0,
  inflight: null,
};

function todayInTokyoIsoDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nextTokyoMidnightEpochMs() {
  const now = new Date();
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  tokyoNow.setHours(24, 0, 0, 0);
  const diffMs = tokyoNow.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getTime();
  return Date.now() + Math.max(diffMs, 60_000);
}

function cloneDailyTrivia(snapshot: DailyTriviaSnapshot): DailyTriviaSnapshot {
  return { ...snapshot };
}

function getFallbackDailyTrivia(): DailyTriviaSnapshot {
  return {
    trivia: fallbackTrivia,
    date: todayInTokyoIsoDate(),
  };
}

export function readFallbackDailyTrivia(): DailyTriviaSnapshot {
  return getFallbackDailyTrivia();
}

function parseDailyTriviaResponse(payload: unknown): DailyTriviaSnapshot {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("豆知識 API の形式が不正です。");
  }

  const body = payload as DailyTriviaRouteResponse;
  if (body.success !== true || typeof body.trivia !== "string" || typeof body.date !== "string") {
    throw new Error("豆知識 API の形式が不正です。");
  }

  if (!body.trivia.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    throw new Error("豆知識 API の形式が不正です。");
  }

  return {
    trivia: body.trivia,
    date: body.date,
  };
}

async function fetchDailyTrivia(): Promise<DailyTriviaSnapshot> {
  const response = await fetch(withAppBasePath("/api/maguro-bot/daily-trivia"), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("豆知識の取得に失敗しました。");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  return parseDailyTriviaResponse(payload);
}

export async function fetchDailyTriviaSafe(): Promise<DailyTriviaSnapshot> {
  const now = Date.now();
  if (triviaCache.value && triviaCache.expiresAt > now && triviaCache.value.date === todayInTokyoIsoDate()) {
    return cloneDailyTrivia(triviaCache.value);
  }

  if (!triviaCache.inflight) {
    triviaCache.inflight = (async () => {
      try {
        const trivia = await fetchDailyTrivia();
        triviaCache.value = cloneDailyTrivia(trivia);
        triviaCache.expiresAt = nextTokyoMidnightEpochMs();
        return trivia;
      } catch {
        const fallback = getFallbackDailyTrivia();
        triviaCache.value = cloneDailyTrivia(fallback);
        triviaCache.expiresAt = nextTokyoMidnightEpochMs();
        return fallback;
      }
    })();
  }

  try {
    return cloneDailyTrivia(await triviaCache.inflight);
  } finally {
    triviaCache.inflight = null;
  }
}
