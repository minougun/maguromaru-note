import { readDailyTriviaRecord } from "@/lib/daily-trivia";
import type { HomeSideDataSnapshot } from "@/lib/domain/types";
import {
  fetchOsakaHonmachiWeatherSafe,
  getFallbackWeatherSnapshot,
  isFallbackWeatherSnapshot,
} from "@/lib/weather";

export const HOME_SIDE_CACHE_SECONDS = 10 * 60;

const homeSideServerCache: {
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

export function readFallbackHomeSideDataServer(): HomeSideDataSnapshot {
  return {
    weather: getFallbackWeatherSnapshot(),
    trivia: readDailyTriviaRecord(),
    fetchedAt: new Date().toISOString(),
  };
}

export function resetHomeSideDataServerCacheForTest() {
  homeSideServerCache.value = null;
  homeSideServerCache.expiresAt = 0;
  homeSideServerCache.inflight = null;
}

export function homeSideDataTtlSeconds(snapshot: HomeSideDataSnapshot): number {
  return isFallbackWeatherSnapshot(snapshot.weather) ? 30 : HOME_SIDE_CACHE_SECONDS;
}

export async function readCachedHomeSideDataServer(): Promise<HomeSideDataSnapshot> {
  const now = Date.now();
  if (homeSideServerCache.value && homeSideServerCache.expiresAt > now) {
    return cloneHomeSideData(homeSideServerCache.value);
  }

  if (!homeSideServerCache.inflight) {
    homeSideServerCache.inflight = (async () => {
      const snapshot: HomeSideDataSnapshot = {
        weather: await fetchOsakaHonmachiWeatherSafe(),
        trivia: readDailyTriviaRecord(),
        fetchedAt: new Date().toISOString(),
      };
      homeSideServerCache.value = cloneHomeSideData(snapshot);
      homeSideServerCache.expiresAt = Date.now() + homeSideDataTtlSeconds(snapshot) * 1000;
      return snapshot;
    })();
  }

  try {
    return cloneHomeSideData(await homeSideServerCache.inflight);
  } finally {
    homeSideServerCache.inflight = null;
  }
}
