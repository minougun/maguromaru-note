import assert from "node:assert/strict";
import test from "node:test";

import { fetchOsakaHonmachiWeatherSafe, getFallbackWeatherSnapshot, parseWeatherResponse } from "@/lib/weather";

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
