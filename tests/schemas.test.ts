import assert from "node:assert/strict";
import test from "node:test";

import { recordVisitInputSchema, upsertMenuStatusInputSchema } from "@/lib/domain/schemas";

test("recordVisitInputSchema rejects invalid enum values", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        visitedAt: "2026-03-28",
        partIds: ["invalid_part"],
        memo: "x",
        photoDataUrl: null,
      }),
    /Invalid option/,
  );
});

test("recordVisitInputSchema rejects extra keys", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        memo: "x",
        photoDataUrl: null,
        role: "staff",
      }),
    /Unrecognized key/,
  );
});

test("recordVisitInputSchema rejects duplicate parts", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        visitedAt: "2026-03-28",
        partIds: ["akami", "akami"],
        memo: "x",
        photoDataUrl: null,
      }),
    /重複/,
  );
});

test("upsertMenuStatusInputSchema rejects invalid status", () => {
  assert.throws(
    () =>
      upsertMenuStatusInputSchema.parse({
        menuItemId: "maguro_don",
        status: "queued",
      }),
    /Invalid option/,
  );
});

test("upsertMenuStatusInputSchema rejects numeric coercion attempts", () => {
  assert.throws(
    () =>
      upsertMenuStatusInputSchema.parse({
        menuItemId: "maguro_don",
        status: 1,
      }),
    /expected one of/,
  );
});
