import { NextResponse, type NextRequest } from "next/server";

import { applySecurityHeaders } from "@/lib/security-headers";
import { updateSession } from "@/lib/supabase/middleware";

function nextWithSecurityHeaders(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  applySecurityHeaders(response.headers);
  return response;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return nextWithSecurityHeaders(request);
  }

  return updateSession(request);
}

/** `/api` は Route Handler 側で認証する。middleware では認証を重ねず、共通セキュリティヘッダだけ付与する。 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
