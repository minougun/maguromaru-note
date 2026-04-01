import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { checkHttpRateLimit, resetHttpRateLimitCachesForTests } from "@/lib/http-rate-limit";
import { resetRateLimitStoreForTests, snapshotReadLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitStoreForTests();
  resetHttpRateLimitCachesForTests();
});

test("checkHttpRateLimit (memory): blocks after snapshotReadLimits.maxRequests for same trusted IP", async () => {
  const req = new Request("http://localhost/api/app-snapshot", {
    headers: { "x-real-ip": "203.0.113.10" },
  });

  for (let i = 0; i < snapshotReadLimits.maxRequests; i += 1) {
    const r = await checkHttpRateLimit(req, "app-snapshot-get", snapshotReadLimits);
    assert.equal(r.ok, true, `expected ok at ${i}`);
  }

  const blocked = await checkHttpRateLimit(req, "app-snapshot-get", snapshotReadLimits);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("checkHttpRateLimit ignores spoofed x-forwarded-for rotation", async () => {
  for (let i = 0; i < snapshotReadLimits.maxRequests; i += 1) {
    const req = new Request("http://localhost/api/app-snapshot", {
      headers: { "x-forwarded-for": `198.51.100.${i}` },
    });
    const result = await checkHttpRateLimit(req, "app-snapshot-get", snapshotReadLimits);
    assert.equal(result.ok, true, `expected ok at ${i}`);
  }

  const blocked = await checkHttpRateLimit(
    new Request("http://localhost/api/app-snapshot", {
      headers: { "x-forwarded-for": "198.51.100.250" },
    }),
    "app-snapshot-get",
    snapshotReadLimits,
  );
  assert.equal(blocked.ok, false);
});

test("checkHttpRateLimit ignores unverified bearer sub rotation", async () => {
  for (let i = 0; i < snapshotReadLimits.maxRequests; i += 1) {
    const payload = Buffer.from(JSON.stringify({ sub: `attacker-${i}` })).toString("base64url");
    const req = new Request("http://localhost/api/app-snapshot", {
      headers: { authorization: `Bearer h.${payload}.s` },
    });
    const result = await checkHttpRateLimit(req, "app-snapshot-get", snapshotReadLimits);
    assert.equal(result.ok, true, `expected ok at ${i}`);
  }

  const blocked = await checkHttpRateLimit(
    new Request("http://localhost/api/app-snapshot", {
      headers: { authorization: `Bearer h.${Buffer.from(JSON.stringify({ sub: "attacker-last" })).toString("base64url")}.s` },
    }),
    "app-snapshot-get",
    snapshotReadLimits,
  );
  assert.equal(blocked.ok, false);
});

test("checkHttpRateLimit uses verified user id when provided", async () => {
  for (let i = 0; i < snapshotReadLimits.maxRequests; i += 1) {
    const result = await checkHttpRateLimit(
      new Request("http://localhost/api/app-snapshot"),
      "app-snapshot-get",
      snapshotReadLimits,
      { verifiedUserId: "user-1" },
    );
    assert.equal(result.ok, true, `expected ok at ${i}`);
  }

  const blocked = await checkHttpRateLimit(
    new Request("http://localhost/api/app-snapshot"),
    "app-snapshot-get",
    snapshotReadLimits,
    { verifiedUserId: "user-1" },
  );
  assert.equal(blocked.ok, false);
});
