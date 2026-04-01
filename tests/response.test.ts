import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { setRedirectLocation } from "@/lib/response";
import { ANON_LINK_NONCE_COOKIE, setAnonLinkNonceCookie } from "@/lib/anonymous-link-cookie";

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


test("setAnonLinkNonceCookie scopes the nonce cookie to auth callback", () => {
  const response = NextResponse.json({ ok: true });
  setAnonLinkNonceCookie(response, "nonce-value");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`${ANON_LINK_NONCE_COOKIE}=nonce-value`));
  assert.match(setCookie, /Path=\/auth\/callback/);
  assert.match(setCookie, /HttpOnly/i);
});
