import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchOsakaHonmachiWeatherSafe,
  fetchUiWeatherSnapshotSafe,
  getFallbackWeatherSnapshot,
  parseJmaForecastResponse,
  parseWeatherResponse,
} from "@/lib/weather";

test("parseWeatherResponse rejects malformed payloads", () => {
  assert.throws(() => parseWeatherResponse({ current: { temperature_2m: 18 } }), /形式が不正/);
});

test("parseJmaForecastResponse rejects malformed payloads", () => {
  assert.throws(() => parseJmaForecastResponse([]), /形式が不正/);
  assert.throws(
    () =>
      parseJmaForecastResponse([
        {
          timeSeries: [{ areas: [{ area: { code: "270000" }, weatherCodes: ["111"], weathers: ["晴れ"] }] }, {}, { areas: [] }],
        },
      ]),
    /形式が不正/,
  );
});

test("fetchOsakaHonmachiWeatherSafe uses JMA forecast when Open-Meteo fails", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = (async (input) => {
    callCount += 1;
    const url = String(input);
    if (url.includes("open-meteo")) {
      throw new Error("primary down");
    }
    return new Response(
      JSON.stringify([
        {
          timeSeries: [
            {
              areas: [
                {
                  area: { name: "大阪府", code: "270000" },
                  weatherCodes: ["111"],
                  weathers: ["晴れ　夜　くもり"],
                },
              ],
            },
            { areas: [] },
            {
              areas: [
                {
                  area: { name: "大阪", code: "62078" },
                  temps: ["21", "12"],
                },
              ],
            },
          ],
        },
      ]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const result = await fetchOsakaHonmachiWeatherSafe();
    assert.deepEqual(result, { temperature: 21, code: 1111, icon: "⛅", label: "晴れ時々くもり" });
    assert.equal(callCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchOsakaHonmachiWeatherSafe falls back when both weather providers fail", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  try {
    const result = await fetchOsakaHonmachiWeatherSafe();
    assert.deepEqual(result, getFallbackWeatherSnapshot());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchUiWeatherSnapshotSafe caches the API response for repeated reads", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = (async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        success: true,
        weather: { temperature: 22, code: 1, icon: "🌤️", label: "晴れ" },
        fetchedAt: "2026-04-02T00:00:00.000Z",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const first = await fetchUiWeatherSnapshotSafe();
    const second = await fetchUiWeatherSnapshotSafe();

    assert.deepEqual(first, { temperature: 22, code: 1, icon: "🌤️", label: "晴れ" });
    assert.deepEqual(second, first);
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
