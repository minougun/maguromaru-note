import { NextResponse } from "next/server";

import { toRouteError, upsertMenuStatus } from "@/lib/services/app-service";

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const result = await upsertMenuStatus(payload);
    return NextResponse.json(result);
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
