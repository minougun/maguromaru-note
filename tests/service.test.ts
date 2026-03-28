import assert from "node:assert/strict";
import test from "node:test";

import { createMockViewerContext } from "@/lib/mock/store";
import { seededTitles } from "@/lib/domain/seed";
import { calculateVisitStreakWeeks, resolveCurrentTitle } from "@/lib/utils/date";
import { recordVisit, upsertMenuStatus } from "@/lib/services/app-service";

test("calculateVisitStreakWeeks counts consecutive ISO weeks only once per week", () => {
  const streak = calculateVisitStreakWeeks([
    { id: "1", user_id: "u", visited_at: "2026-03-28", photo_url: null, memo: null, created_at: "" },
    { id: "2", user_id: "u", visited_at: "2026-03-27", photo_url: null, memo: null, created_at: "" },
    { id: "3", user_id: "u", visited_at: "2026-03-20", photo_url: null, memo: null, created_at: "" },
    { id: "4", user_id: "u", visited_at: "2026-03-03", photo_url: null, memo: null, created_at: "" },
  ]);

  assert.equal(streak, 2);
});

test("resolveCurrentTitle picks the highest unlocked title", () => {
  const title = resolveCurrentTitle(seededTitles, 12);
  assert.equal(title.id, "hunter");
});

test("recordVisit rejects empty part selection", async () => {
  await assert.rejects(
    () =>
      recordVisit({
        visitedAt: "2026-03-28",
        partIds: [],
        memo: "x",
        photoDataUrl: null,
      }),
    /部位を1つ以上/,
  );
});

test("recordVisit rejects invalid extra key payload", async () => {
  await assert.rejects(
    () =>
      recordVisit({
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        memo: "x",
        photoDataUrl: null,
        extra: true,
      }),
    /Unrecognized key/,
  );
});

test("mock viewer is not staff by default", () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_STAFF;
  delete process.env.MAGUROMARU_ENABLE_MOCK_STAFF;

  try {
    assert.equal(createMockViewerContext().role, "user");
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_STAFF;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_STAFF = previous;
    }
  }
});

test("upsertMenuStatus rejects unauthorized mutation in mock mode by default", async () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_STAFF;
  delete process.env.MAGUROMARU_ENABLE_MOCK_STAFF;

  try {
    await assert.rejects(
      () =>
        upsertMenuStatus({
          menuItemId: "maguro_don",
          status: "few",
        }),
      /スタッフのみ更新できます/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_STAFF;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_STAFF = previous;
    }
  }
});

test("mock viewer becomes staff only when explicitly enabled", () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_STAFF;
  process.env.MAGUROMARU_ENABLE_MOCK_STAFF = "true";

  try {
    assert.equal(createMockViewerContext().role, "staff");
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_STAFF;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_STAFF = previous;
    }
  }
});
