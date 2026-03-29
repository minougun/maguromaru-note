import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { checkHttpRateLimit, resetHttpRateLimitCachesForTests } from "@/lib/http-rate-limit";
import { resetRateLimitStoreForTests, snapshotReadLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitStoreForTests();
  resetHttpRateLimitCachesForTests();
});

test("checkHttpRateLimit (memory): blocks after snapshotReadLimits.maxRequests for same identity", async () => {
  const payload = Buffer.from(JSON.stringify({ sub: "rate-test-user" })).toString("base64url");
  const jwt = `h.${payload}.s`;
  const req = new Request("http://localhost/api/app-snapshot", {
    headers: { authorization: `Bearer ${jwt}` },
  });

  for (let i = 0; i < snapshotReadLimits.maxRequests; i += 1) {
    const r = await checkHttpRateLimit(req, "app-snapshot-get", snapshotReadLimits);
    assert.equal(r.ok, true, `expected ok at ${i}`);
  }

  const blocked = await checkHttpRateLimit(req, "app-snapshot-get", snapshotReadLimits);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});
