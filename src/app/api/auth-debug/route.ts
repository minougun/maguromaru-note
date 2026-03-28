import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessTokenFromRequest } from "@/lib/services/app-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  const hasEnv = hasSupabaseEnv();

  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    hasSupabaseEnv: hasEnv,
    hasBearerToken: Boolean(accessToken),
    bearerTokenLength: accessToken?.length ?? 0,
    envUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    envKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    nodeEnv: process.env.NODE_ENV,
  };

  if (hasEnv && accessToken) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const { data, error } = await client.auth.getUser(accessToken);
      debug.getUserResult = error
        ? { error: error.message, status: error.status }
        : { userId: data.user?.id, isAnonymous: data.user?.is_anonymous, role: data.user?.role };
    } catch (err) {
      debug.getUserResult = { error: err instanceof Error ? err.message : "unknown" };
    }
  }

  if (hasEnv && !accessToken) {
    try {
      const client = await createServerSupabaseClient();
      const { data, error } = await client.auth.getUser();
      debug.cookieAuthResult = error
        ? { error: error.message, status: error.status }
        : { userId: data.user?.id, isAnonymous: data.user?.is_anonymous };
    } catch (err) {
      debug.cookieAuthResult = { error: err instanceof Error ? err.message : "unknown" };
    }
  }

  return NextResponse.json(debug, {
    headers: { "Cache-Control": "no-store" },
  });
}
