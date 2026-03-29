import assert from "node:assert/strict";
import test from "node:test";

import { getDefaultPartIdsForMenuItem } from "@/lib/domain/menu-part-defaults";

test("standard maguro bowls default to akami, chutoro, and hoho", () => {
  assert.deepEqual(getDefaultPartIdsForMenuItem("maguro_don"), ["akami", "chutoro", "hoho"]);
  assert.deepEqual(getDefaultPartIdsForMenuItem("maguro_don_mini"), ["akami", "chutoro", "hoho"]);
});

test("premium bowls default to the premium tuna cuts only", () => {
  assert.deepEqual(getDefaultPartIdsForMenuItem("tokujo_don"), ["noten", "hoho", "otoro", "meura", "akami"]);
  assert.deepEqual(getDefaultPartIdsForMenuItem("tokujo_don_mini"), ["noten", "hoho", "otoro", "meura", "akami"]);
});
