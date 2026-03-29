import { NextResponse } from "next/server";

import {
  HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE,
  HISTORY_SNAPSHOT_MAX_PAGE_SIZE,
  tryParseSnapshotScope,
} from "@/lib/domain/snapshot-scope";
import {
  getAccessTokenFromRequest,
  getAppSnapshot,
  toRouteError,
  type AppSnapshotLoadOptions,
} from "@/lib/services/app-service";

function parseHistoryPagingParams(url: URL): AppSnapshotLoadOptions | { error: string } {
  const pageRaw = url.searchParams.get("history_visit_page");
  const sizeRaw = url.searchParams.get("history_visit_page_size");

  const parsePositiveInt = (raw: string | null, fallback: number, max?: number): number | null => {
    if (raw === null || raw === "") {
      return fallback;
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return null;
    }
    if (max !== undefined && n > max) {
      return null;
    }
    return n;
  };

  const page = parsePositiveInt(pageRaw, 1);
  const size = parsePositiveInt(sizeRaw, HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE, HISTORY_SNAPSHOT_MAX_PAGE_SIZE);
  if (page === null || size === null) {
    return { error: "履歴のページ指定（history_visit_page / history_visit_page_size）が不正です。" };
  }

  return {
    historyVisitPage: page,
    historyVisitPageSize: size,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scopeParsed = tryParseSnapshotScope(url.searchParams.get("scope"));
    if (scopeParsed === null) {
      return NextResponse.json({ error: "無効な scope です。" }, { status: 400 });
    }

    const hasHistoryPaging =
      url.searchParams.has("history_visit_page") || url.searchParams.has("history_visit_page_size");
    if (hasHistoryPaging && scopeParsed !== "history") {
      return NextResponse.json(
        { error: "history_visit_page / history_visit_page_size は scope=history のときのみ指定できます。" },
        { status: 400 },
      );
    }

    let loadOptions: AppSnapshotLoadOptions | undefined;
    if (scopeParsed === "history") {
      const parsed = parseHistoryPagingParams(url);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      loadOptions = parsed;
    }

    const snapshot = await getAppSnapshot(getAccessTokenFromRequest(request), scopeParsed, loadOptions);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
