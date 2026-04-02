import { withAppBasePath } from "@/lib/public-path";

export interface WeatherSnapshot {
  temperature: number;
  code: number;
  icon: string;
  label: string;
}

interface WeatherRouteResponse {
  success: boolean;
  weather: WeatherSnapshot;
  fetchedAt: string;
}

const weatherEndpoint =
  "https://api.open-meteo.com/v1/forecast?latitude=34.6851&longitude=135.5006&current=temperature_2m,weather_code&timezone=Asia/Tokyo";
const weatherTimeoutMs = 5000;
const uiWeatherCacheMs = 10 * 60 * 1000;
const fallbackWeather: WeatherSnapshot = {
  temperature: 0,
  code: 1,
  icon: "🌤️",
  label: "天気情報は準備中",
};

const weatherUiCache: { value: WeatherSnapshot | null; expiresAt: number; inflight: Promise<WeatherSnapshot> | null } = {
  value: null,
  expiresAt: 0,
  inflight: null,
};

function cloneWeatherSnapshot(snapshot: WeatherSnapshot): WeatherSnapshot {
  return { ...snapshot };
}

export function weatherLabel(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "快晴" };
  if (code <= 3) return { icon: "⛅", label: "曇り" };
  if (code <= 49) return { icon: "🌫️", label: "霧" };
  if (code <= 69) return { icon: "🌧️", label: "雨" };
  if (code <= 79) return { icon: "🌨️", label: "雪" };
  if (code <= 99) return { icon: "⛈️", label: "雷雨" };
  return { icon: "🌤️", label: "晴れ" };
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeoutId);
    },
  };
}

export function parseWeatherResponse(data: {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
}): WeatherSnapshot {
  const temperature = data.current?.temperature_2m;
  const code = data.current?.weather_code;

  if (typeof temperature !== "number" || typeof code !== "number") {
    throw new Error("天気情報の形式が不正です。");
  }

  const label = weatherLabel(code);
  return {
    temperature,
    code,
    icon: label.icon,
    label: label.label,
  };
}

function parseWeatherRouteResponse(payload: unknown): WeatherSnapshot {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("天気 API の形式が不正です。");
  }

  const body = payload as WeatherRouteResponse;
  if (body.success !== true) {
    throw new Error("天気 API の形式が不正です。");
  }

  const weather = body.weather;
  if (!weather || typeof weather !== "object" || Array.isArray(weather)) {
    throw new Error("天気 API の形式が不正です。");
  }

  if (typeof weather.temperature !== "number" || typeof weather.code !== "number") {
    throw new Error("天気 API の形式が不正です。");
  }

  if (typeof weather.icon !== "string" || typeof weather.label !== "string") {
    throw new Error("天気 API の形式が不正です。");
  }

  return cloneWeatherSnapshot(weather);
}

export async function fetchOsakaHonmachiWeather(): Promise<WeatherSnapshot> {
  const timeout = createTimeoutSignal(weatherTimeoutMs);

  try {
    const response = await fetch(weatherEndpoint, {
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new Error("天気情報の取得に失敗しました。");
    }

    const data = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
      };
    };

    return parseWeatherResponse(data);
  } finally {
    timeout.clear();
  }
}

export async function fetchOsakaHonmachiWeatherSafe(): Promise<WeatherSnapshot> {
  try {
    return await fetchOsakaHonmachiWeather();
  } catch {
    return getFallbackWeatherSnapshot();
  }
}

async function fetchUiWeatherSnapshot(): Promise<WeatherSnapshot> {
  const response = await fetch(withAppBasePath("/api/weather/current"), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("天気 API の取得に失敗しました。");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  return parseWeatherRouteResponse(payload);
}

export async function fetchUiWeatherSnapshotSafe(): Promise<WeatherSnapshot> {
  const now = Date.now();
  if (weatherUiCache.value && weatherUiCache.expiresAt > now) {
    return cloneWeatherSnapshot(weatherUiCache.value);
  }

  if (!weatherUiCache.inflight) {
    weatherUiCache.inflight = (async () => {
      try {
        const weather = await fetchUiWeatherSnapshot();
        weatherUiCache.value = cloneWeatherSnapshot(weather);
        weatherUiCache.expiresAt = Date.now() + uiWeatherCacheMs;
        return weather;
      } catch {
        return getFallbackWeatherSnapshot();
      }
    })();
  }

  try {
    return cloneWeatherSnapshot(await weatherUiCache.inflight);
  } finally {
    weatherUiCache.inflight = null;
  }
}

export function getFallbackWeatherSnapshot(): WeatherSnapshot {
  return {
    ...fallbackWeather,
  };
}
