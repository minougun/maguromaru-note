import assert from "node:assert/strict";
import test from "node:test";

import { fetchDailyTriviaSafe } from "@/lib/maguro-bot";
import { dailyTriviaCount, pickDailyTrivia, readDailyTriviaRecord } from "@/lib/daily-trivia";

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


test("daily trivia stock is large enough and stable per date", () => {
  assert.ok(dailyTriviaCount() >= 365);

  const allTrivia = new Set(Array.from({ length: dailyTriviaCount() }, (_, index) => pickDailyTrivia(`2026-04-${String((index % 30) + 1).padStart(2, "0")}`)));

  assert.ok(allTrivia.size >= 25);

  const april3 = pickDailyTrivia("2026-04-03");
  const april3Again = pickDailyTrivia("2026-04-03");
  const april4 = pickDailyTrivia("2026-04-04");

  assert.equal(april3Again, april3);
  assert.notEqual(april4, "");
  assert.match(april3, /マグロ|まぐろ|本マグロ|中トロ|大トロ/);
});

test("readDailyTriviaRecord returns a dated daily random trivia", () => {
  const record = readDailyTriviaRecord("2026-04-03");
  assert.equal(record.date, "2026-04-03");
  assert.match(record.trivia, /マグロ|まぐろ|本マグロ|中トロ|大トロ/);
});
