import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/env";
import { applyRateLimit, mutationRateLimits } from "@/lib/rate-limit";
import { claimShareBonus, getAccessTokenFromRequest, toRouteError } from "@/lib/services/app-service";

export async function POST(request: Request) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  const rateLimit = applyRateLimit(request, "share-bonuses-post", mutationRateLimits.shareWrites);
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
    const result = await claimShareBonus(payload, getAccessTokenFromRequest(request));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
