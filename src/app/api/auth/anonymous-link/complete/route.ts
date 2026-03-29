import { NextResponse } from "next/server";

import { hasSupabaseServiceEnv } from "@/lib/env";
import { completeAnonymousLinkMigration } from "@/lib/services/anonymous-link-service";
import { getAccessTokenFromRequest, toRouteError } from "@/lib/services/app-service";

export async function POST(request: Request) {
  try {
    if (!hasSupabaseServiceEnv()) {
      return NextResponse.json(
        { error: "サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。" },
        { status: 503 },
      );
    }

    const raw = await request.json();
    const token = getAccessTokenFromRequest(request);
    const result = await completeAnonymousLinkMigration(token, raw);
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
