import assert from "node:assert/strict";
import test from "node:test";

import { readBearerToken, tryJwtSubFromAuthHeader } from "@/lib/auth-bearer";

test("readBearerToken extracts token", () => {
  assert.equal(readBearerToken("Bearer abc.def"), "abc.def");
  assert.equal(readBearerToken("bearer  tok "), "tok");
  assert.equal(readBearerToken(null), undefined);
});

test("tryJwtSubFromAuthHeader reads sub from JWT payload", () => {
  const payload = Buffer.from(JSON.stringify({ sub: "user-uuid-1" })).toString("base64url");
  const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
  assert.equal(tryJwtSubFromAuthHeader(`Bearer ${token}`), "user-uuid-1");
});

test("tryJwtSubFromAuthHeader returns null for malformed token", () => {
  assert.equal(tryJwtSubFromAuthHeader("Bearer not-a-jwt"), null);
  assert.equal(tryJwtSubFromAuthHeader(null), null);
});
