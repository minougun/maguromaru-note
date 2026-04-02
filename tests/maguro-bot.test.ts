import assert from "node:assert/strict";
import test from "node:test";

import { fetchDailyTriviaSafe } from "@/lib/maguro-bot";

test("fetchDailyTriviaSafe falls back safely when API payload is invalid", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, trivia: "", date: "bad-date" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    const result = await fetchDailyTriviaSafe();
    assert.match(result.trivia, /まぐろ/);
    assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
