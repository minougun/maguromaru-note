import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { ANON_LINK_NONCE_COOKIE, clearAnonLinkNonceCookie } from "@/lib/anonymous-link-cookie";
import { authNextPathSchema, emailOtpCallbackTypeSchema } from "@/lib/domain/schemas";
import { applySecurityHeaders } from "@/lib/security-headers";
import { getSupabaseEnv, hasSupabaseEnv, hasSupabaseServiceEnv } from "@/lib/env";
import { setRedirectLocation } from "@/lib/response";
import { completeAnonymousLinkMigration } from "@/lib/services/anonymous-link-service";

function resolveNextPath(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("next");
  const parsed = authNextPathSchema.safeParse(raw ?? "/");
  return parsed.success ? parsed.data : "/";
}

function readAnonLinkNonceFromRequest(request: NextRequest): string | null {
  const raw = request.cookies.get(ANON_LINK_NONCE_COOKIE)?.value?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export async function GET(request: NextRequest) {
  const nextPath = resolveNextPath(request);
  const redirectUrl = new URL(nextPath, request.url);
  const anonLinkNonce = readAnonLinkNonceFromRequest(request);

  if (!hasSupabaseEnv()) {
    const res = NextResponse.redirect(redirectUrl);
    clearAnonLinkNonceCookie(res);
    applySecurityHeaders(res.headers);
    return setRedirectLocation(res, redirectUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpTypeRaw = request.nextUrl.searchParams.get("type");
  const authError = request.nextUrl.searchParams.get("error");

  if (authError) {
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("auth_err", "provider");
    const res = NextResponse.redirect(redirectUrl);
    clearAnonLinkNonceCookie(res);
    applySecurityHeaders(res.headers);
    return setRedirectLocation(res, redirectUrl);
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirectUrl.searchParams.set("auth", "error");
      redirectUrl.searchParams.set("auth_err", "session");
      response = NextResponse.redirect(redirectUrl);
      clearAnonLinkNonceCookie(response);
      applySecurityHeaders(response.headers);
      return setRedirectLocation(response, redirectUrl);
    }
    let session: Session | null = data.session;
    if (!session) {
      const {
        data: { session: fetched },
      } = await supabase.auth.getSession();
      session = fetched;
    }
    await runAnonLinkMigrationIfNeeded(redirectUrl, anonLinkNonce, session);
  } else if (tokenHash && otpTypeRaw) {
    const parsedType = emailOtpCallbackTypeSchema.safeParse(otpTypeRaw);
    if (!parsedType.success) {
      redirectUrl.searchParams.set("auth", "error");
      redirectUrl.searchParams.set("auth_err", "incomplete");
      const res = NextResponse.redirect(redirectUrl);
      clearAnonLinkNonceCookie(res);
      applySecurityHeaders(res.headers);
      return setRedirectLocation(res, redirectUrl);
    }
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: parsedType.data,
    });
    if (error) {
      redirectUrl.searchParams.set("auth", "error");
      redirectUrl.searchParams.set("auth_err", "email");
      response = NextResponse.redirect(redirectUrl);
      clearAnonLinkNonceCookie(response);
      applySecurityHeaders(response.headers);
      return setRedirectLocation(response, redirectUrl);
    }
    let session: Session | null = data.session;
    if (!session) {
      const {
        data: { session: fetched },
      } = await supabase.auth.getSession();
      session = fetched;
    }
    await runAnonLinkMigrationIfNeeded(redirectUrl, anonLinkNonce, session);
  } else {
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("auth_err", "incomplete");
    const res = NextResponse.redirect(redirectUrl);
    clearAnonLinkNonceCookie(res);
    applySecurityHeaders(res.headers);
    return setRedirectLocation(res, redirectUrl);
  }

  redirectUrl.searchParams.set("auth", "linked");
  clearAnonLinkNonceCookie(response);
  applySecurityHeaders(response.headers);
  return setRedirectLocation(response, redirectUrl);
}

async function runAnonLinkMigrationIfNeeded(
  redirectUrl: URL,
  nonce: string | null,
  session: { access_token: string; user: { is_anonymous?: boolean } } | null,
) {
  if (!nonce || !session?.access_token || session.user.is_anonymous) {
    return;
  }
  if (!hasSupabaseServiceEnv()) {
    return;
  }

  try {
    await completeAnonymousLinkMigration(session.access_token, { nonce });
  } catch {
    redirectUrl.searchParams.set("anon_link_warn", "migration_failed");
  }
}
