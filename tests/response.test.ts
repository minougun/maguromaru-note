import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { setRedirectLocation } from "@/lib/response";

test("setRedirectLocation preserves existing cookies on redirect responses", () => {
  const response = NextResponse.redirect("https://example.com/account");
  response.cookies.set("sb-access-token", "token", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  setRedirectLocation(response, "https://example.com/account?auth=linked");

  assert.equal(response.headers.get("location"), "https://example.com/account?auth=linked");
  assert.match(response.headers.get("set-cookie") ?? "", /sb-access-token=token/);
});
