import { NextResponse } from "next/server";

import { tryParseSnapshotScope } from "@/lib/domain/snapshot-scope";
import { getAccessTokenFromRequest, getAppSnapshot, toRouteError } from "@/lib/services/app-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scopeParsed = tryParseSnapshotScope(url.searchParams.get("scope"));
    if (scopeParsed === null) {
      return NextResponse.json({ error: "無効な scope です。" }, { status: 400 });
    }
    const snapshot = await getAppSnapshot(getAccessTokenFromRequest(request), scopeParsed);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
