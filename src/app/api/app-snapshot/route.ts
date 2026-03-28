import { NextResponse } from "next/server";

import { getAppSnapshot, toRouteError } from "@/lib/services/app-service";

export async function GET() {
  try {
    const snapshot = await getAppSnapshot();
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
