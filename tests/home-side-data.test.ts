import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchHomeSideDataSafe,
  parseHomeSideDataResponse,
  readFallbackHomeSideData,
  resetHomeSideDataCacheForTest,
} from "@/lib/home-side-data";

test("parseHomeSideDataResponse rejects malformed payloads", () => {
  assert.throws(
    () => parseHomeSideDataResponse({ success: true, weather: { temperature: 20 }, trivia: null, fetchedAt: "x" }),
    /形式が不正/,
  );
});

test("fetchHomeSideDataSafe caches the combined API response for repeated reads", async () => {
  resetHomeSideDataCacheForTest();
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = (async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        success: true,
        weather: { temperature: 22, code: 1, icon: "🌤️", label: "晴れ" },
        trivia: { trivia: "まぐろは回遊魚です。", date: "2026-04-02" },
        fetchedAt: "2026-04-02T00:00:00.000Z",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const first = await fetchHomeSideDataSafe();
    const second = await fetchHomeSideDataSafe();

    assert.equal(first.weather.temperature, 22);
    assert.equal(first.trivia.date, "2026-04-02");
    assert.deepEqual(second, first);
    assert.equal(callCount, 1);
  } finally {
    resetHomeSideDataCacheForTest();
    globalThis.fetch = originalFetch;
  }
});

test("fetchHomeSideDataSafe falls back safely when API payload is invalid", async () => {
  resetHomeSideDataCacheForTest();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, weather: null, trivia: null, fetchedAt: "bad" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    const result = await fetchHomeSideDataSafe();
    const fallback = readFallbackHomeSideData();
    assert.equal(result.weather.label, fallback.weather.label);
    assert.match(result.trivia.trivia, /まぐろ/);
  } finally {
    resetHomeSideDataCacheForTest();
    globalThis.fetch = originalFetch;
  }
});
