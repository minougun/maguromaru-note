import assert from "node:assert/strict";
import test from "node:test";

import { defaultMenuStockById } from "@/lib/domain/constants";
import {
  applyCustomerFacingStoreAndStock,
  calendarDateJst,
  isWithinOneHourBeforeCloseJst,
  isWithinStoreBusinessHoursJst,
} from "@/lib/domain/store-business-hours";
import { seededStoreStatus } from "@/lib/domain/seed";
import type { StoreStatus } from "@/lib/domain/types";

const storeBusyToday: StoreStatus = {
  ...seededStoreStatus,
  status: "busy",
  status_note: "混雑",
  recommendation: "おすすめ",
  weather_comment: "天気",
  updated_at: "2026-03-30T02:00:00.000Z",
};

test("calendarDateJst returns Tokyo calendar date", () => {
  assert.equal(calendarDateJst("2026-03-29T15:00:00.000Z"), "2026-03-30");
});

test("isWithinStoreBusinessHoursJst: 16:00 JST is closed", () => {
  assert.equal(isWithinStoreBusinessHoursJst(new Date("2026-03-30T16:00:00+09:00")), false);
});

test("isWithinStoreBusinessHoursJst: 16:59 JST is closed, 17:00 JST is open, 22:30 JST is closed", () => {
  assert.equal(isWithinStoreBusinessHoursJst(new Date("2026-03-30T16:59:00+09:00")), false);
  assert.equal(isWithinStoreBusinessHoursJst(new Date("2026-03-30T17:00:00+09:00")), true);
  assert.equal(isWithinStoreBusinessHoursJst(new Date("2026-03-30T22:30:00+09:00")), false);
});

test("isWithinOneHourBeforeCloseJst: 21:29 JST false, 21:30–22:29 true, 22:30 false", () => {
  assert.equal(isWithinOneHourBeforeCloseJst(new Date("2026-03-30T21:29:00+09:00")), false);
  assert.equal(isWithinOneHourBeforeCloseJst(new Date("2026-03-30T21:30:00+09:00")), true);
  assert.equal(isWithinOneHourBeforeCloseJst(new Date("2026-03-30T22:29:00+09:00")), true);
  assert.equal(isWithinOneHourBeforeCloseJst(new Date("2026-03-30T22:30:00+09:00")), false);
});

test("applyCustomerFacingStoreAndStock: after hours shows closed store and unset menu", () => {
  const now = new Date("2026-03-30T16:00:00+09:00");
  const out = applyCustomerFacingStoreAndStock(storeBusyToday, defaultMenuStockById, "2026-03-30T02:00:00.000Z", now);
  assert.equal(out.storeStatus.status, "closed");
  assert.equal(out.storeStatus.status_note, "");
  assert.equal(out.menuItemStatuses.maguro_don, "unset");
  assert.equal(out.menuStockUpdatedAt, null);
  assert.equal(out.showStaffUpdateTimestamps, false);
});

test("applyCustomerFacingStoreAndStock: open hours but stale JST date uses available menu and unset store", () => {
  const now = new Date("2026-03-30T18:00:00+09:00");
  const staleStore: StoreStatus = {
    ...seededStoreStatus,
    status: "busy",
    status_note: "昨日",
    updated_at: "2026-03-28T15:00:00.000Z",
  };
  const out = applyCustomerFacingStoreAndStock(
    staleStore,
    { ...defaultMenuStockById, maguro_don: "soldout" },
    "2026-03-28T15:00:00.000Z",
    now,
  );
  assert.equal(out.storeStatus.status, "unset");
  assert.equal(out.menuItemStatuses.maguro_don, "available");
  assert.equal(out.menuItemStatuses.tokujo_don_mini, "available");
  assert.equal(out.showStaffUpdateTimestamps, true);
});

test("applyCustomerFacingStoreAndStock: open hours and touched today preserves DB view", () => {
  const now = new Date("2026-03-30T18:00:00+09:00");
  const out = applyCustomerFacingStoreAndStock(storeBusyToday, defaultMenuStockById, "2026-03-30T02:00:00.000Z", now);
  assert.equal(out.storeStatus.status, "busy");
  assert.equal(out.menuItemStatuses.maguro_don, "available");
  assert.equal(out.showStaffUpdateTimestamps, true);
});

test("applyCustomerFacingStoreAndStock: one hour before close forces closing_soon when fresh today", () => {
  const now = new Date("2026-03-30T21:45:00+09:00");
  const out = applyCustomerFacingStoreAndStock(storeBusyToday, defaultMenuStockById, "2026-03-30T02:00:00.000Z", now);
  assert.equal(out.storeStatus.status, "closing_soon");
  assert.equal(out.storeStatus.status_note, "混雑");
  assert.equal(out.menuItemStatuses.maguro_don, "available");
  assert.equal(out.showStaffUpdateTimestamps, true);
});

test("applyCustomerFacingStoreAndStock: one hour before close when stale uses closing_soon and available menu", () => {
  const now = new Date("2026-03-30T21:45:00+09:00");
  const staleStore: StoreStatus = {
    ...seededStoreStatus,
    status: "busy",
    status_note: "昨日",
    updated_at: "2026-03-28T15:00:00.000Z",
  };
  const out = applyCustomerFacingStoreAndStock(
    staleStore,
    { ...defaultMenuStockById, maguro_don: "soldout" },
    "2026-03-28T15:00:00.000Z",
    now,
  );
  assert.equal(out.storeStatus.status, "closing_soon");
  assert.equal(out.storeStatus.status_note, "");
  assert.equal(out.menuItemStatuses.maguro_don, "available");
  assert.equal(out.showStaffUpdateTimestamps, true);
});
