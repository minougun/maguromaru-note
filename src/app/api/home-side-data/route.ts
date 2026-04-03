import { NextResponse } from "next/server";

import type { HomeSideDataSnapshot } from "@/lib/domain/types";
import {
  HOME_SIDE_CACHE_SECONDS,
  homeSideDataTtlSeconds,
  readCachedHomeSideDataServer,
} from "@/lib/home-side-data-server";
import { jsonWithSecurityHeaders } from "@/lib/response";

interface HomeSideDataResponse extends HomeSideDataSnapshot {
  success: boolean;
}

export async function GET(): Promise<NextResponse<HomeSideDataResponse>> {
  const snapshot = await readCachedHomeSideDataServer();
  const ttlSeconds = homeSideDataTtlSeconds(snapshot);

  return jsonWithSecurityHeaders(
    {
      success: true,
      ...snapshot,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${HOME_SIDE_CACHE_SECONDS * 6}`,
      },
    },
  );
}
