import assert from "node:assert/strict";
import test from "node:test";

import { getDefaultPartIdsForMenuItem } from "@/lib/domain/menu-part-defaults";

test("tekka and chutoro bowls default to their representative cuts", () => {
  assert.deepEqual(getDefaultPartIdsForMenuItem("maguro_don"), ["akami"]);
  assert.deepEqual(getDefaultPartIdsForMenuItem("maguro_don_mini"), ["chutoro", "akami"]);
});

test("premium bowl and signature roll default to richer tuna cuts", () => {
  assert.deepEqual(getDefaultPartIdsForMenuItem("tokujo_don"), ["noten", "hoho", "otoro", "meura", "akami"]);
  assert.deepEqual(getDefaultPartIdsForMenuItem("tokujo_don_mini"), ["akami", "chutoro", "otoro"]);
});
