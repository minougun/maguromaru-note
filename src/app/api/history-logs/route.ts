import { jsonWithSecurityHeaders } from "@/lib/response";

import {
  historyPagingQueryHistoryLogs,
  parseHistoryVisitPagingParams,
} from "@/lib/api/history-visit-paging";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { toRouteError } from "@/lib/route-error";
import { snapshotReadLimits } from "@/lib/rate-limit";
import {
  getAccessTokenFromRequest,
  getHistoryVisitLogsPage,
  getVerifiedUserIdForRateLimit,
} from "@/lib/services/app-service";

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
    const parsed = parseHistoryVisitPagingParams(url.searchParams, historyPagingQueryHistoryLogs);
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
    const routeError = toRouteError(error, "history-logs");
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
