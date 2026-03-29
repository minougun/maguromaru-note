import type { NextResponse } from "next/server";

export function setRedirectLocation<T extends NextResponse>(response: T, url: URL | string) {
  response.headers.set("Location", typeof url === "string" ? url : url.toString());
  return response;
}
