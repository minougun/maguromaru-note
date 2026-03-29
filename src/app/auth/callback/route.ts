import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { authNextPathSchema, emailOtpCallbackTypeSchema } from "@/lib/domain/schemas";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { setRedirectLocation } from "@/lib/response";

function resolveNextPath(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("next");
  const parsed = authNextPathSchema.safeParse(raw ?? "/");
  return parsed.success ? parsed.data : "/";
}

export async function GET(request: NextRequest) {
  const nextPath = resolveNextPath(request);
  const redirectUrl = new URL(nextPath, request.url);

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(redirectUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpTypeRaw = request.nextUrl.searchParams.get("type");
  const authError = request.nextUrl.searchParams.get("error");

  if (authError) {
    redirectUrl.searchParams.set("auth", "error");
    return NextResponse.redirect(redirectUrl);
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  let response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirectUrl.searchParams.set("auth", "error");
      response = NextResponse.redirect(redirectUrl);
      return response;
    }
  } else if (tokenHash && otpTypeRaw) {
    const parsedType = emailOtpCallbackTypeSchema.safeParse(otpTypeRaw);
    if (!parsedType.success) {
      redirectUrl.searchParams.set("auth", "error");
      return NextResponse.redirect(redirectUrl);
    }
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: parsedType.data,
    });
    if (error) {
      redirectUrl.searchParams.set("auth", "error");
      response = NextResponse.redirect(redirectUrl);
      return response;
    }
  } else {
    redirectUrl.searchParams.set("auth", "error");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("auth", "linked");
  return setRedirectLocation(response, redirectUrl);
}
