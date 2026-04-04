import assert from "node:assert/strict";
import test from "node:test";

import { defaultMenuStockById } from "@/lib/domain/constants";
import { seededMenuItems, seededStoreStatus } from "@/lib/domain/seed";
import {
  addCalendarDaysJst,
  closingBlurbJstDate,
  fingerprintStockSnapshot,
  formatSnapshotForPrompt,
  buildStockSnapshotForAi,
} from "@/lib/services/store-ai-blurb";

test("closingBlurbJstDate: 21時台は当日の締め日付", () => {
  const d = new Date("2026-03-31T12:00:00.000Z"); // 21:00 JST
  assert.equal(closingBlurbJstDate(d), "2026-03-31");
});

test("closingBlurbJstDate: 朝は前日の営業日", () => {
  const d = new Date("2026-03-31T01:00:00.000Z"); // 10:00 JST
  assert.equal(closingBlurbJstDate(d), "2026-03-30");
});

test("addCalendarDaysJst は JST 暦で 1 日ずらす", () => {
  assert.equal(addCalendarDaysJst("2026-03-31", -1), "2026-03-30");
  assert.equal(addCalendarDaysJst("2026-03-01", -1), "2026-02-28");
});

test("fingerprintStockSnapshot は同一データで安定", () => {
  const snap = buildStockSnapshotForAi(seededStoreStatus, seededMenuItems, defaultMenuStockById);
  const a = fingerprintStockSnapshot(snap);
  const b = fingerprintStockSnapshot(snap);
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("formatSnapshotForPrompt に丼行が含まれる", () => {
  const snap = buildStockSnapshotForAi(seededStoreStatus, seededMenuItems, defaultMenuStockById);
  const text = formatSnapshotForPrompt(snap);
  assert.match(text, /丼の入荷状況/);
  assert.ok(text.includes(seededMenuItems[0].name));
});
