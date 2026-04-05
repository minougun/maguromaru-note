import { jsonWithSecurityHeaders } from "@/lib/response";

import {
  historyPagingQueryAppSnapshot,
  parseHistoryVisitPagingParams,
} from "@/lib/api/history-visit-paging";
import { tryParseSnapshotScope, type AppSnapshotLoadOptions } from "@/lib/domain/snapshot-scope";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { toRouteError } from "@/lib/route-error";
import { snapshotReadLimits } from "@/lib/rate-limit";
import {
  getAccessTokenFromRequest,
  getAppSnapshot,
  getVerifiedUserIdForRateLimit,
} from "@/lib/services/app-service";

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
      const parsed = parseHistoryVisitPagingParams(url.searchParams, historyPagingQueryAppSnapshot);
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
    const routeError = toRouteError(error, "app-snapshot");
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
