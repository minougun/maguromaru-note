import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/env";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { mutationRateLimits } from "@/lib/rate-limit";
import {
  deleteVisit,
  getAccessTokenFromRequest,
  getVerifiedUserIdForRateLimit,
  toRouteError,
} from "@/lib/services/app-service";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  const accessToken = getAccessTokenFromRequest(request);
  const rateLimit = await checkHttpRateLimit(request, "visit-logs-delete", mutationRateLimits.visitWrites, {
    verifiedUserId: await getVerifiedUserIdForRateLimit(accessToken),
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
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
    const { id } = await context.params;
    const result = await deleteVisit(id, accessToken);
    return NextResponse.json(result);
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
