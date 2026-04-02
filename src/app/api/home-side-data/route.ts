import { NextResponse } from "next/server";

import { readDailyTriviaRecord } from "@/lib/daily-trivia";
import { type DailyTriviaSnapshot } from "@/lib/maguro-bot";
import { jsonWithSecurityHeaders } from "@/lib/response";
import { fetchOsakaHonmachiWeatherSafe, isFallbackWeatherSnapshot, type WeatherSnapshot } from "@/lib/weather";

interface HomeSideDataResponse {
  success: boolean;
  weather: WeatherSnapshot;
  trivia: DailyTriviaSnapshot;
  fetchedAt: string;
}

const HOME_SIDE_CACHE_SECONDS = 10 * 60;
const homeSideCache: {
  value: { weather: WeatherSnapshot; trivia: DailyTriviaSnapshot; fetchedAt: string } | null;
  expiresAt: number;
  inflight: Promise<{ weather: WeatherSnapshot; trivia: DailyTriviaSnapshot; fetchedAt: string }> | null;
} = {
  value: null,
  expiresAt: 0,
  inflight: null,
};

function cloneWeather(snapshot: WeatherSnapshot): WeatherSnapshot {
  return { ...snapshot };
}

function cloneTrivia(snapshot: DailyTriviaSnapshot): DailyTriviaSnapshot {
  return { ...snapshot };
}

async function readCachedHomeSideData() {
  const now = Date.now();
  if (homeSideCache.value && homeSideCache.expiresAt > now) {
    return {
      weather: cloneWeather(homeSideCache.value.weather),
      trivia: cloneTrivia(homeSideCache.value.trivia),
      fetchedAt: homeSideCache.value.fetchedAt,
    };
  }

  if (!homeSideCache.inflight) {
    homeSideCache.inflight = (async () => {
      const weather = await fetchOsakaHonmachiWeatherSafe();
      const trivia = readDailyTriviaRecord();
      const fetchedAt = new Date().toISOString();
      const snapshot = {
        weather: cloneWeather(weather),
        trivia: cloneTrivia(trivia),
        fetchedAt,
      };
      homeSideCache.value = snapshot;
      const ttlSeconds = isFallbackWeatherSnapshot(weather) ? 30 : HOME_SIDE_CACHE_SECONDS;
      homeSideCache.expiresAt = Date.now() + ttlSeconds * 1000;
      return snapshot;
    })();
  }

  try {
    const snapshot = await homeSideCache.inflight;
    return {
      weather: cloneWeather(snapshot.weather),
      trivia: cloneTrivia(snapshot.trivia),
      fetchedAt: snapshot.fetchedAt,
    };
  } finally {
    homeSideCache.inflight = null;
  }
}

export async function GET(): Promise<NextResponse<HomeSideDataResponse>> {
  const { weather, trivia, fetchedAt } = await readCachedHomeSideData();

  return jsonWithSecurityHeaders(
    {
      success: true,
      weather,
      trivia,
      fetchedAt,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${HOME_SIDE_CACHE_SECONDS}, stale-while-revalidate=${HOME_SIDE_CACHE_SECONDS * 6}`,
      },
    },
  );
}
