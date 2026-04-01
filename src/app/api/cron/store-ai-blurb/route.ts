import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import type { MenuItemStatusRow } from "@/lib/domain/types";
import { calendarDateJst, isWithinStoreBusinessHoursJst } from "@/lib/domain/store-business-hours";
import {
  buildStockSnapshotForAi,
  closingBlurbJstDate,
  createServiceRoleSupabase,
  cronCanRunAiBlurb,
  fetchLatestIntradayBlurb,
  fingerprintStockSnapshot,
  formatSnapshotForPrompt,
  generateClosingCopy,
  generateIntradayCopy,
  hasClosingSummary,
  insertStoreAiBlurb,
} from "@/lib/services/store-ai-blurb";
import { menuItemIds, type MenuStockStatus } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

const MENU_ITEM_STATUS_COLUMNS = "menu_item_id, status, updated_at" as const;

function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim();
  if (!secret || !auth) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(auth);
  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function buildMenuStatuses(rows: MenuItemStatusRow[]): Record<(typeof menuItemIds)[number], MenuStockStatus> {
  const allowed = new Set<string>(menuItemIds);
  const base = Object.fromEntries(menuItemIds.map((id) => [id, "unset" as const])) as Record<
    (typeof menuItemIds)[number],
    MenuStockStatus
  >;
  for (const row of rows) {
    if (allowed.has(row.menu_item_id)) {
      base[row.menu_item_id as (typeof menuItemIds)[number]] = row.status;
    }
  }
  return base;
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!cronCanRunAiBlurb()) {
    return NextResponse.json({ ok: true, skipped: "missing_openai_or_supabase_service" });
  }

  const admin = createServiceRoleSupabase();
  const now = new Date();

  const [{ data: storeRow, error: storeError }, { data: menuRows, error: menuError }, { data: items, error: itemsError }] =
    await Promise.all([
      admin.from("store_status").select("status, status_note, recommendation, weather_comment, updated_at").eq("id", 1).maybeSingle(),
      admin.from("menu_item_statuses").select(MENU_ITEM_STATUS_COLUMNS),
      admin.from("menu_items").select("id, name, price, sort_order").order("sort_order", { ascending: true }),
    ]);

  if (storeError || !storeRow) {
    return NextResponse.json({ error: storeError?.message ?? "store_status missing" }, { status: 500 });
  }
  if (menuError || itemsError || !items?.length) {
    return NextResponse.json({ error: menuError?.message ?? itemsError?.message ?? "menu load failed" }, { status: 500 });
  }

  const statuses = buildMenuStatuses((menuRows as MenuItemStatusRow[] | null) ?? []);
  const snap = buildStockSnapshotForAi(storeRow as Parameters<typeof buildStockSnapshotForAi>[0], items, statuses);
  const fp = fingerprintStockSnapshot(snap);
  const snapshotText = formatSnapshotForPrompt(snap);

  try {
    if (isWithinStoreBusinessHoursJst(now)) {
      const today = calendarDateJst(now);
      const latest = await fetchLatestIntradayBlurb(admin, today);
      if (latest?.source_fingerprint === fp) {
        return NextResponse.json({ ok: true, skipped: "no_diff_intraday", jstDate: today });
      }

      const body = await generateIntradayCopy(snapshotText);
      if (!body) {
        return NextResponse.json({ ok: true, skipped: "openai_empty" });
      }

      await insertStoreAiBlurb(admin, {
        body,
        kind: "intraday",
        jst_date: today,
        source_fingerprint: fp,
      });

      return NextResponse.json({ ok: true, posted: "intraday", jstDate: today });
    }

    const closingDate = closingBlurbJstDate(now);
    if (await hasClosingSummary(admin, closingDate)) {
      return NextResponse.json({ ok: true, skipped: "closing_exists", jstDate: closingDate });
    }

    const body = await generateClosingCopy(snapshotText);
    if (!body) {
      return NextResponse.json({ ok: true, skipped: "openai_empty_closing" });
    }

    try {
      await insertStoreAiBlurb(admin, {
        body,
        kind: "closing_summary",
        jst_date: closingDate,
        source_fingerprint: fp,
      });
    } catch (insertErr) {
      const msg = insertErr instanceof Error ? insertErr.message : "";
      if (msg.includes("23505") || msg.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ ok: true, skipped: "closing_race", jstDate: closingDate });
      }
      throw insertErr;
    }

    return NextResponse.json({ ok: true, posted: "closing_summary", jstDate: closingDate });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
