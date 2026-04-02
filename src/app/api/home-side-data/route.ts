import { NextResponse } from "next/server";

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
const TRIVIA_LIST = [
  "本マグロ中トロは、脂がのって最も美味しい部位と言われています。水温が低い冬の時期が最高の旬です。",
  "マグロは時速100kmで泳ぐことができ、一日に数百km移動することもあります。",
  "マグロの寿司ネタ「大トロ」は、最も希少で高価な部位です。天然本マグロの大トロは特に貴重です。",
  "マグロは歯が丈夫で、獲物の小魚を素早く捕食します。その素早さはあっという間です。",
  "マグロの目玉は、昼間の光が強い海でも見える特殊な構造をしています。夜間でも視力が落ちません。",
  "本マグロは赤身が最も人気で、鉄分とタンパク質が豊富で栄養価が高い食材です。",
  "マグロの刺身は、新鮮なほど香りと甘みが際立ちます。当店は毎日新鮮なマグロを厳選しています。",
  "マグロの尾身（シッポ）は別名『ネギトロ』の原料で、脂と赤身のバランスが絶妙です。",
  "本マグロと南マグロは異なる種類で、味わいや食感が違います。食べ比べも楽しみです。",
  "マグロは世界中の海で漁獲されますが、特に日本の市場で高く評価されます。",
];

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

function todayInTokyoIsoDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function readDailyTriviaSnapshot(): DailyTriviaSnapshot {
  const date = todayInTokyoIsoDate();
  const dayKey = Number.parseInt(date.replaceAll("-", ""), 10);
  const index = Math.abs(dayKey) % TRIVIA_LIST.length;
  return {
    trivia: TRIVIA_LIST[index],
    date,
  };
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
      const trivia = readDailyTriviaSnapshot();
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
