import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/env";
import { checkHttpRateLimit } from "@/lib/http-rate-limit";
import { mutationRateLimits } from "@/lib/rate-limit";
import {
  claimShareBonus,
  getAccessTokenFromRequest,
  getVerifiedUserIdForRateLimit,
  toRouteError,
} from "@/lib/services/app-service";

export async function POST(request: Request) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  const accessToken = getAccessTokenFromRequest(request);
  const rateLimit = await checkHttpRateLimit(request, "share-bonuses-post", mutationRateLimits.shareWrites, {
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
    const payload = await request.json();
    const result = await claimShareBonus(payload, accessToken);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
