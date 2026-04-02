import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchOsakaHonmachiWeatherSafe,
  fetchUiWeatherSnapshotSafe,
  getFallbackWeatherSnapshot,
  parseWeatherResponse,
} from "@/lib/weather";

test("parseWeatherResponse rejects malformed payloads", () => {
  assert.throws(() => parseWeatherResponse({ current: { temperature_2m: 18 } }), /形式が不正/);
});

test("fetchOsakaHonmachiWeatherSafe falls back when fetch fails", async () => {
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
