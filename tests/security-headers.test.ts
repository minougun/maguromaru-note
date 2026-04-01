import assert from "node:assert/strict";
import test from "node:test";

import { applySecurityHeaders, SECURITY_HEADER_ENTRIES } from "@/lib/security-headers";

test("applySecurityHeaders sets every configured header", () => {
  const headers = new Headers();
  applySecurityHeaders(headers);

  for (const [name, value] of SECURITY_HEADER_ENTRIES) {
    assert.equal(headers.get(name), value);
  }
});

test("SECURITY_HEADER_ENTRIES does not contain duplicate header names", () => {
  const names = SECURITY_HEADER_ENTRIES.map(([name]) => name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});
