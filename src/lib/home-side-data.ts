import { readFallbackDailyTrivia, type DailyTriviaSnapshot } from "@/lib/maguro-bot";
import { withAppBasePath } from "@/lib/public-path";
import { getFallbackWeatherSnapshot, isFallbackWeatherSnapshot, type WeatherSnapshot } from "@/lib/weather";

export interface HomeSideDataSnapshot {
  weather: WeatherSnapshot;
  trivia: DailyTriviaSnapshot;
  fetchedAt: string;
}

interface HomeSideDataRouteResponse extends HomeSideDataSnapshot {
  success: boolean;
}

const HOME_SIDE_DATA_CACHE_MS = 10 * 60 * 1000;

const homeSideDataCache: {
  value: HomeSideDataSnapshot | null;
  expiresAt: number;
  inflight: Promise<HomeSideDataSnapshot> | null;
} = {
  value: null,
  expiresAt: 0,
  inflight: null,
};

function cloneHomeSideData(snapshot: HomeSideDataSnapshot): HomeSideDataSnapshot {
  return {
    weather: { ...snapshot.weather },
    trivia: { ...snapshot.trivia },
    fetchedAt: snapshot.fetchedAt,
  };
}

export function resetHomeSideDataCacheForTest() {
  homeSideDataCache.value = null;
  homeSideDataCache.expiresAt = 0;
  homeSideDataCache.inflight = null;
}

export function readFallbackHomeSideData(): HomeSideDataSnapshot {
  return {
    weather: getFallbackWeatherSnapshot(),
    trivia: readFallbackDailyTrivia(),
    fetchedAt: new Date().toISOString(),
  };
}

export function parseHomeSideDataResponse(payload: unknown): HomeSideDataSnapshot {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("home-side API の形式が不正です。");
  }

  const body = payload as HomeSideDataRouteResponse;
  if (body.success !== true || typeof body.fetchedAt !== "string") {
    throw new Error("home-side API の形式が不正です。");
  }

  const weather = body.weather;
  const trivia = body.trivia;
  if (!weather || typeof weather !== "object" || Array.isArray(weather)) {
    throw new Error("home-side API の形式が不正です。");
  }
  if (!trivia || typeof trivia !== "object" || Array.isArray(trivia)) {
    throw new Error("home-side API の形式が不正です。");
  }

  if (
    typeof weather.temperature !== "number" ||
    typeof weather.code !== "number" ||
    typeof weather.icon !== "string" ||
    typeof weather.label !== "string"
  ) {
    throw new Error("home-side API の形式が不正です。");
  }

  if (typeof trivia.trivia !== "string" || typeof trivia.date !== "string") {
    throw new Error("home-side API の形式が不正です。");
  }

  if (!trivia.trivia.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(trivia.date)) {
    throw new Error("home-side API の形式が不正です。");
  }

  return {
    weather: { ...weather },
    trivia: { ...trivia },
    fetchedAt: body.fetchedAt,
  };
}

async function fetchHomeSideData(): Promise<HomeSideDataSnapshot> {
  const response = await fetch(withAppBasePath("/api/home-side-data"), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("home-side API の取得に失敗しました。");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  return parseHomeSideDataResponse(payload);
}

export async function fetchHomeSideDataSafe(): Promise<HomeSideDataSnapshot> {
  const now = Date.now();
  if (homeSideDataCache.value && homeSideDataCache.expiresAt > now) {
    return cloneHomeSideData(homeSideDataCache.value);
  }

  if (!homeSideDataCache.inflight) {
    homeSideDataCache.inflight = (async () => {
      try {
        const snapshot = await fetchHomeSideData();
        homeSideDataCache.value = cloneHomeSideData(snapshot);
        const ttlMs = isFallbackWeatherSnapshot(snapshot.weather) ? 30_000 : HOME_SIDE_DATA_CACHE_MS;
        homeSideDataCache.expiresAt = Date.now() + ttlMs;
        return snapshot;
      } catch {
        const fallback = readFallbackHomeSideData();
        homeSideDataCache.value = cloneHomeSideData(fallback);
        homeSideDataCache.expiresAt = Date.now() + 30_000;
        return fallback;
      }
    })();
  }

  try {
    return cloneHomeSideData(await homeSideDataCache.inflight);
  } finally {
    homeSideDataCache.inflight = null;
  }
}
