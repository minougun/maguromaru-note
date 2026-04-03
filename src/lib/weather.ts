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

interface JmaForecastArea {
  area?: {
    name?: string;
    code?: string;
  };
  weatherCodes?: string[];
  weathers?: string[];
  temps?: string[];
}

interface JmaForecastTimeSeries {
  areas?: JmaForecastArea[];
}

type JmaForecastResponse = Array<{
  timeSeries?: JmaForecastTimeSeries[];
}>;

const weatherEndpoint =
  "https://api.open-meteo.com/v1/forecast?latitude=34.6851&longitude=135.5006&current=temperature_2m,weather_code&timezone=Asia/Tokyo";
const jmaForecastEndpoint = "https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json";
const jmaOsakaAreaCode = "270000";
const jmaOsakaCityCode = "62078";
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

function normalizeJmaWeatherText(raw: string) {
  return raw.replace(/　+/g, " ").replace(/\s+/g, " ").trim();
}

function weatherLabelFromJmaText(raw: string): { icon: string; label: string } {
  const text = normalizeJmaWeatherText(raw);

  if (text.includes("雷") && text.includes("雨")) {
    return { icon: "⛈️", label: "雷雨" };
  }
  if (text.includes("雪")) {
    return { icon: "🌨️", label: "雪" };
  }
  if (text.includes("雨")) {
    return { icon: "🌧️", label: text.includes("くもり") ? "くもり時々雨" : "雨" };
  }
  if (text.includes("霧")) {
    return { icon: "🌫️", label: "霧" };
  }
  if (text.includes("晴") && text.includes("くもり")) {
    return { icon: "⛅", label: "晴れ時々くもり" };
  }
  if (text.includes("晴")) {
    return { icon: "☀️", label: "晴れ" };
  }
  if (text.includes("くもり")) {
    return { icon: "⛅", label: "くもり" };
  }

  return { icon: "🌤️", label: text || "天気" };
}

export function parseJmaForecastResponse(data: JmaForecastResponse): WeatherSnapshot {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("気象庁天気情報の形式が不正です。");
  }

  const primary = data[0];
  const weatherSeries = primary?.timeSeries?.[0];
  const tempSeries = primary?.timeSeries?.[2];

  const weatherArea = weatherSeries?.areas?.find((area) => area.area?.code === jmaOsakaAreaCode);
  const rawWeatherCode = weatherArea?.weatherCodes?.[0];
  const rawWeatherText = weatherArea?.weathers?.[0];
  const tempArea = tempSeries?.areas?.find((area) => area.area?.code === jmaOsakaCityCode);
  const rawTemp = tempArea?.temps?.find((value) => /^-?\d+(?:\.\d+)?$/.test(value));

  const code = Number(rawWeatherCode);
  const temperature = rawTemp == null ? Number.NaN : Number(rawTemp);

  if (!Number.isFinite(code) || !Number.isFinite(temperature) || typeof rawWeatherText !== "string") {
    throw new Error("気象庁天気情報の形式が不正です。");
  }

  const label = weatherLabelFromJmaText(rawWeatherText);
  return {
    temperature,
    code: 1000 + code,
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

async function fetchOsakaHonmachiWeatherFromJma(): Promise<WeatherSnapshot> {
  const timeout = createTimeoutSignal(weatherTimeoutMs);

  try {
    const response = await fetch(jmaForecastEndpoint, {
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new Error("気象庁天気情報の取得に失敗しました。");
    }

    const data = (await response.json()) as JmaForecastResponse;
    return parseJmaForecastResponse(data);
  } finally {
    timeout.clear();
  }
}

export async function fetchOsakaHonmachiWeatherSafe(): Promise<WeatherSnapshot> {
  try {
    return await fetchOsakaHonmachiWeather();
  } catch {
    try {
      return await fetchOsakaHonmachiWeatherFromJma();
    } catch {
      return getFallbackWeatherSnapshot();
    }
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

export function isFallbackWeatherSnapshot(snapshot: WeatherSnapshot): boolean {
  return (
    snapshot.temperature === fallbackWeather.temperature &&
    snapshot.code === fallbackWeather.code &&
    snapshot.icon === fallbackWeather.icon &&
    snapshot.label === fallbackWeather.label
  );
}
