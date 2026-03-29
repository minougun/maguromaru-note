import { NextResponse } from "next/server";

import { hasSupabaseServiceEnv } from "@/lib/env";
import { prepareAnonymousLinkNonce } from "@/lib/services/anonymous-link-service";
import { getAccessTokenFromRequest, toRouteError } from "@/lib/services/app-service";

export async function POST(request: Request) {
  try {
    if (!hasSupabaseServiceEnv()) {
      return NextResponse.json(
        { error: "サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。" },
        { status: 503 },
      );
    }

    const token = getAccessTokenFromRequest(request);
    const result = await prepareAnonymousLinkNonce(token);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
