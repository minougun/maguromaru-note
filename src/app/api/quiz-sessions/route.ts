import { jsonWithSecurityHeaders } from "@/lib/response";

import { verifyCsrfOrigin } from "@/lib/env";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { toRouteError } from "@/lib/route-error";
import { mutationRateLimits } from "@/lib/rate-limit";
import {
  createQuizSessionForViewer,
  getAccessTokenFromRequest,
  getVerifiedUserIdForRateLimit,
} from "@/lib/services/app-service";

export async function POST(request: Request) {
  if (!verifyCsrfOrigin(request)) {
    return jsonWithSecurityHeaders({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  const accessToken = getAccessTokenFromRequest(request);
  const rateLimit = await checkHttpRateLimit(request, "quiz-sessions-post", mutationRateLimits.quizWrites, {
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
    const result = await createQuizSessionForViewer(payload, accessToken);
    return jsonWithSecurityHeaders(result, { status: 201 });
  } catch (error) {
    const routeError = toRouteError(error, "quiz-sessions");
    return jsonWithSecurityHeaders({ error: routeError.message }, { status: routeError.status });
  }
}
