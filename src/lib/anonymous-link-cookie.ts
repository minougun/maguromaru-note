import type { NextResponse } from "next/server";

/** 匿名→OAuth 連携用 nonce。HttpOnly で `/auth/callback` まで保持し、クライアント JS からは読めない。 */
export const ANON_LINK_NONCE_COOKIE = "maguro_anon_link_nonce";

const MAX_AGE_SEC = 15 * 60;

function secureInProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

const BASE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/auth/callback",
};

export function setAnonLinkNonceCookie(res: NextResponse, nonce: string) {
  res.cookies.set(ANON_LINK_NONCE_COOKIE, nonce, {
    ...BASE_OPTS,
    maxAge: MAX_AGE_SEC,
    secure: secureInProduction(),
  });
}

export function clearAnonLinkNonceCookie(res: NextResponse) {
  res.cookies.set(ANON_LINK_NONCE_COOKIE, "", {
    ...BASE_OPTS,
    maxAge: 0,
    secure: secureInProduction(),
  });
}
