import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

/** `/api` は Route Handler 側で認証する。ここで毎回 getUser すると同一リクエストで二重に認証が走る。 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
