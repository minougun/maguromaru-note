import { jsonWithSecurityHeaders } from "@/lib/response";

import { setAnonLinkNonceCookie } from "@/lib/anonymous-link-cookie";
import { hasSupabaseServiceEnv, verifyCsrfOrigin } from "@/lib/env";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { mutationRateLimits } from "@/lib/rate-limit";
import { toRouteError } from "@/lib/route-error";
import { prepareAnonymousLinkNonce } from "@/lib/services/anonymous-link-service";
import { getAccessTokenFromRequest, getVerifiedUserIdForRateLimit } from "@/lib/services/app-service";

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return jsonWithSecurityHeaders({ error: "不正なリクエスト元です。" }, { status: 403 });
    }

    const token = getAccessTokenFromRequest(request);
    const rateLimit = await checkHttpRateLimit(request, "auth-anonymous-link-prepare-post", mutationRateLimits.authWrites, {
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

    const { nonce } = await prepareAnonymousLinkNonce(token);
    const res = jsonWithSecurityHeaders(
      { ok: true as const },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
    setAnonLinkNonceCookie(res, nonce);
    return res;
  } catch (error) {
    const routeError = toRouteError(error, "auth/anonymous-link/prepare");
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
