import { jsonWithSecurityHeaders } from "@/lib/response";

import { verifyCsrfOrigin } from "@/lib/env";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { toRouteError } from "@/lib/route-error";
import { mutationRateLimits } from "@/lib/rate-limit";
import {
  getAccessTokenFromRequest,
  getVerifiedUserIdForRateLimit,
  submitQuizSession,
} from "@/lib/services/app-service";

export async function POST(request: Request) {
  if (!verifyCsrfOrigin(request)) {
    return jsonWithSecurityHeaders({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  const accessToken = getAccessTokenFromRequest(request);
  const rateLimit = await checkHttpRateLimit(request, "quiz-results-post", mutationRateLimits.quizWrites, {
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
    const payload = await request.json();
    const result = await submitQuizSession(payload, accessToken);
    return jsonWithSecurityHeaders(result, { status: 201 });
  } catch (error) {
    const routeError = toRouteError(error, "quiz-results");
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
