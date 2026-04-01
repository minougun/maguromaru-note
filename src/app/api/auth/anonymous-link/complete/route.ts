import { jsonWithSecurityHeaders } from "@/lib/response";

import { hasSupabaseServiceEnv, verifyCsrfOrigin } from "@/lib/env";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { mutationRateLimits } from "@/lib/rate-limit";
import { completeAnonymousLinkMigration } from "@/lib/services/anonymous-link-service";
import {
  getAccessTokenFromRequest,
  getVerifiedUserIdForRateLimit,
  toRouteError,
} from "@/lib/services/app-service";

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return jsonWithSecurityHeaders({ error: "不正なリクエスト元です。" }, { status: 403 });
    }

    const token = getAccessTokenFromRequest(request);
    const rateLimit = await checkHttpRateLimit(request, "auth-anonymous-link-complete-post", mutationRateLimits.authWrites, {
      verifiedUserId: await getVerifiedUserIdForRateLimit(token),
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

    if (!hasSupabaseServiceEnv()) {
      return jsonWithSecurityHeaders(
        { error: "サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。" },
        { status: 503 },
      );
    }

    const raw = await request.json();
    const result = await completeAnonymousLinkMigration(token, raw);
    return jsonWithSecurityHeaders(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = toRouteError(error);
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
