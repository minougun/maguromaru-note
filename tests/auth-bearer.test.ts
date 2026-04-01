import assert from "node:assert/strict";
import test from "node:test";

import { readBearerToken } from "@/lib/auth-bearer";

test("readBearerToken extracts token", () => {
  assert.equal(readBearerToken("Bearer abc.def"), "abc.def");
  assert.equal(readBearerToken("bearer  tok "), "tok");
  assert.equal(readBearerToken(null), undefined);
});
