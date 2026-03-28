import { NextResponse } from "next/server";

import { recordVisit, toRouteError } from "@/lib/services/app-service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await recordVisit(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const routeError = toRouteError(error);
    return NextResponse.json({ error: routeError.message }, { status: routeError.status });
  }
}
