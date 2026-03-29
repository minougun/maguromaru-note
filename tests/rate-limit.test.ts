import assert from "node:assert/strict";
import test from "node:test";

import { consumeRateLimit, resetRateLimitStoreForTests } from "@/lib/rate-limit";

test("consumeRateLimit blocks requests after the configured threshold", () => {
  resetRateLimitStoreForTests();

  const first = consumeRateLimit("visit:127.0.0.1", { windowMs: 60_000, maxRequests: 2 });
  const second = consumeRateLimit("visit:127.0.0.1", { windowMs: 60_000, maxRequests: 2 });
  const third = consumeRateLimit("visit:127.0.0.1", { windowMs: 60_000, maxRequests: 2 });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
  assert.ok(third.retryAfterSeconds >= 1);
});
