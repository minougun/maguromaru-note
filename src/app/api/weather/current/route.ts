import { NextResponse } from "next/server";

import { jsonWithSecurityHeaders } from "@/lib/response";
import { fetchOsakaHonmachiWeatherSafe, type WeatherSnapshot } from "@/lib/weather";

interface WeatherRouteResponse {
  success: boolean;
  weather: WeatherSnapshot;
  fetchedAt: string;
}

const WEATHER_CACHE_SECONDS = 10 * 60;

const weatherCache: { value: WeatherSnapshot | null; fetchedAt: string | null; expiresAt: number; inflight: Promise<WeatherSnapshot> | null } = {
  value: null,
  fetchedAt: null,
  expiresAt: 0,
  inflight: null,
};

function cloneWeatherSnapshot(snapshot: WeatherSnapshot): WeatherSnapshot {
  return { ...snapshot };
}

async function readCachedWeather(): Promise<{ weather: WeatherSnapshot; fetchedAt: string }> {
  const now = Date.now();
  if (weatherCache.value && weatherCache.fetchedAt && weatherCache.expiresAt > now) {
    return {
      weather: cloneWeatherSnapshot(weatherCache.value),
      fetchedAt: weatherCache.fetchedAt,
    };
  }

  if (!weatherCache.inflight) {
    weatherCache.inflight = fetchOsakaHonmachiWeatherSafe();
  }

  try {
    const weather = cloneWeatherSnapshot(await weatherCache.inflight);
    const fetchedAt = new Date().toISOString();
    weatherCache.value = cloneWeatherSnapshot(weather);
    weatherCache.fetchedAt = fetchedAt;
    weatherCache.expiresAt = Date.now() + WEATHER_CACHE_SECONDS * 1000;
    return { weather, fetchedAt };
  } finally {
    weatherCache.inflight = null;
  }
}

export async function GET(): Promise<NextResponse<WeatherRouteResponse>> {
  const { weather, fetchedAt } = await readCachedWeather();

  return jsonWithSecurityHeaders(
    {
      success: true,
      weather,
      fetchedAt,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${WEATHER_CACHE_SECONDS}, stale-while-revalidate=${WEATHER_CACHE_SECONDS * 6}`,
      },
    },
  );
}
