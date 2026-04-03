import { jsonWithSecurityHeaders } from "@/lib/response";

import {
  HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE,
  HISTORY_SNAPSHOT_MAX_PAGE_SIZE,
} from "@/lib/domain/snapshot-scope";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { snapshotReadLimits } from "@/lib/rate-limit";
import {
  getAccessTokenFromRequest,
  getHistoryVisitLogsPage,
  getVerifiedUserIdForRateLimit,
  toRouteError,
  type AppSnapshotLoadOptions,
} from "@/lib/services/app-service";

function parseHistoryPagingParams(url: URL): AppSnapshotLoadOptions | { error: string } {
  const pageRaw = url.searchParams.get("page");
  const sizeRaw = url.searchParams.get("page_size");

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
    return { error: "履歴のページ指定（page / page_size）が不正です。" };
  }

  return {
    historyVisitPage: page,
    historyVisitPageSize: size,
  };
}

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  const rateLimit = await checkHttpRateLimit(request, "history-logs-get", snapshotReadLimits, {
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
    const parsed = parseHistoryPagingParams(url);
    if ("error" in parsed) {
      return jsonWithSecurityHeaders({ error: parsed.error }, { status: 400 });
    }

    const payload = await getHistoryVisitLogsPage(accessToken, parsed);
    return jsonWithSecurityHeaders(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = toRouteError(error);
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
