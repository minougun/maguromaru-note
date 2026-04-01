import { NextResponse } from "next/server";
import type { NextResponse as NextResponseType } from "next/server";

import { applySecurityHeaders } from "@/lib/security-headers";

export function setRedirectLocation<T extends NextResponseType>(response: T, url: URL | string) {
  response.headers.set("Location", typeof url === "string" ? url : url.toString());
  return response;
}

export function withSecurityHeaders<T extends { headers: Headers }>(response: T) {
  applySecurityHeaders(response.headers);
  return response;
}

export function jsonWithSecurityHeaders<T>(body: T, init?: ResponseInit) {
  return withSecurityHeaders(NextResponse.json(body, init) as NextResponse<T>);
}
