export interface WeatherSnapshot {
  temperature: number;
  code: number;
  icon: string;
  label: string;
}

const weatherEndpoint =
  "https://api.open-meteo.com/v1/forecast?latitude=34.6851&longitude=135.5006&current=temperature_2m,weather_code&timezone=Asia/Tokyo";
const weatherTimeoutMs = 5000;
const fallbackWeather: WeatherSnapshot = {
  temperature: 0,
  code: 1,
  icon: "🌤️",
  label: "天気情報は準備中",
};

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
    return fallbackWeather;
  }
}

export function getFallbackWeatherSnapshot(): WeatherSnapshot {
  return {
    ...fallbackWeather,
  };
}
