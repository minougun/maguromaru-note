import { NextResponse } from "next/server";

import { readDailyTriviaRecord } from "@/lib/daily-trivia";
import { jsonWithSecurityHeaders } from "@/lib/response";

interface DailyTriviaResponse {
  success: boolean;
  trivia: string;
  date: string;
}

export async function GET(): Promise<NextResponse<DailyTriviaResponse>> {
  const { trivia, date } = readDailyTriviaRecord();
  
  return jsonWithSecurityHeaders(
    {
      success: true,
      trivia,
      date,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
      },
    }
  );
}
