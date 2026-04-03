import { jsonWithSecurityHeaders } from "@/lib/response";

import {
  HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE,
  HISTORY_SNAPSHOT_MAX_PAGE_SIZE,
  tryParseSnapshotScope,
} from "@/lib/domain/snapshot-scope";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { snapshotReadLimits } from "@/lib/rate-limit";
import {
  getAccessTokenFromRequest,
  getAppSnapshot,
  getVerifiedUserIdForRateLimit,
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
  const accessToken = getAccessTokenFromRequest(request);
  const rateLimit = await checkHttpRateLimit(request, "app-snapshot-get", snapshotReadLimits, {
    verifiedUserId: await getVerifiedUserIdForRateLimit(accessToken),
  });
  if (!rateLimit.ok) {
    return jsonWithSecurityHeaders(
      { error: "リクエストが多すぎます。時間をおいて再度お試しください。" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const url = new URL(request.url);
    const scopeParsed = tryParseSnapshotScope(url.searchParams.get("scope"));
    if (scopeParsed === null) {
      return jsonWithSecurityHeaders({ error: "無効な scope です。" }, { status: 400 });
    }

    const hasHistoryPaging =
      url.searchParams.has("history_visit_page") || url.searchParams.has("history_visit_page_size");
    if (hasHistoryPaging && scopeParsed !== "history") {
      return jsonWithSecurityHeaders(
        { error: "history_visit_page / history_visit_page_size は scope=history のときのみ指定できます。" },
        { status: 400 },
      );
    }

    let loadOptions: AppSnapshotLoadOptions | undefined;
    if (scopeParsed === "history") {
      const parsed = parseHistoryPagingParams(url);
      if ("error" in parsed) {
        return jsonWithSecurityHeaders({ error: parsed.error }, { status: 400 });
      }
      loadOptions = parsed;
    }

    const snapshot = await getAppSnapshot(accessToken, scopeParsed, loadOptions);
    return jsonWithSecurityHeaders(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = toRouteError(error);
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
