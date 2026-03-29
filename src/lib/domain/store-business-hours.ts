import { menuItemIds } from "@/lib/domain/constants";
import type { MenuStockStatus } from "@/lib/domain/constants";
import type { MenuItemId, StoreStatus } from "@/lib/domain/types";

/** 店舗案内の営業時間（`STORE_INFO.hours`）に合わせ、東京時間 10:00〜24:00 を営業中とみなす */
const OPEN_MINUTES_FROM_MIDNIGHT_JST = 10 * 60;
const CLOSE_MINUTES_FROM_MIDNIGHT_JST = 24 * 60;

/**
 * 東京日付 YYYY-MM-DD（集計・日替わり判定用）
 */
export function calendarDateJst(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
}

/**
 * 案内営業時間内か（東京 10:00 以上 24:00 未満＝翌0:00まで）
 */
export function isWithinStoreBusinessHoursJst(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const mins = hour * 60 + minute;
  return mins >= OPEN_MINUTES_FROM_MIDNIGHT_JST && mins < CLOSE_MINUTES_FROM_MIDNIGHT_JST;
}

function latestTouchIso(storeUpdatedAt: string, menuStockUpdatedAt: string | null): string {
  if (!menuStockUpdatedAt) {
    return storeUpdatedAt;
  }
  return storeUpdatedAt >= menuStockUpdatedAt ? storeUpdatedAt : menuStockUpdatedAt;
}

function allMenuUnset(): Record<MenuItemId, MenuStockStatus> {
  return Object.fromEntries(menuItemIds.map((id) => [id, "unset" as const])) as Record<MenuItemId, MenuStockStatus>;
}

function allMenuAvailable(): Record<MenuItemId, MenuStockStatus> {
  return Object.fromEntries(menuItemIds.map((id) => [id, "available" as const])) as Record<MenuItemId, MenuStockStatus>;
}

function clearedStoreStatus(base: StoreStatus): StoreStatus {
  return {
    ...base,
    status: "unset",
    status_note: "",
    recommendation: "",
    weather_comment: "",
  };
}

/** 案内営業時間外のホーム「営業状況」用（`closed` → UI は「本日終了」バッジ） */
function afterHoursStoreDisplay(base: StoreStatus): StoreStatus {
  return {
    ...base,
    status: "closed",
    status_note: "",
    recommendation: "",
    weather_comment: "",
  };
}

/**
 * 一般ユーザー向けホーム表示用に、案内営業時間外は営業状況を本日終了（closed）・入荷は未設定へ、
 * 営業時間内かつ本日未更新なら入荷を ◎ あり相当へ寄せる。
 * 管理画面用はマスクしない（`viewer.role === "admin"` のときスキップ）。
 */
export function applyCustomerFacingStoreAndStock(
  storeStatus: StoreStatus,
  menuItemStatuses: Record<MenuItemId, MenuStockStatus>,
  menuStockUpdatedAt: string | null,
  now: Date,
): {
  storeStatus: StoreStatus;
  menuItemStatuses: Record<MenuItemId, MenuStockStatus>;
  menuStockUpdatedAt: string | null;
} {
  if (!isWithinStoreBusinessHoursJst(now)) {
    return {
      storeStatus: afterHoursStoreDisplay(storeStatus),
      menuItemStatuses: allMenuUnset(),
      menuStockUpdatedAt: null,
    };
  }

  const today = calendarDateJst(now);
  const lastTouch = latestTouchIso(storeStatus.updated_at, menuStockUpdatedAt);
  const lastDay = calendarDateJst(lastTouch);

  if (lastDay !== today) {
    return {
      storeStatus: clearedStoreStatus(storeStatus),
      menuItemStatuses: allMenuAvailable(),
      menuStockUpdatedAt: null,
    };
  }

  return { storeStatus, menuItemStatuses, menuStockUpdatedAt };
}
