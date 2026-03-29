import { NextResponse } from "next/server";

import { setAnonLinkNonceCookie } from "@/lib/anonymous-link-cookie";
import { hasSupabaseServiceEnv, verifyCsrfOrigin } from "@/lib/env";
import { prepareAnonymousLinkNonce } from "@/lib/services/anonymous-link-service";
import { getAccessTokenFromRequest, toRouteError } from "@/lib/services/app-service";

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
    }

    if (!hasSupabaseServiceEnv()) {
      return NextResponse.json(
        { error: "サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。" },
        { status: 503 },
      );
    }

    const token = getAccessTokenFromRequest(request);
    const { nonce } = await prepareAnonymousLinkNonce(token);
    const res = NextResponse.json(
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
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
