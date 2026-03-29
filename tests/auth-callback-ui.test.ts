import assert from "node:assert/strict";
import test from "node:test";

import { readAuthCallbackErrorMessage } from "@/lib/auth-callback-ui";

test("readAuthCallbackErrorMessage maps auth_err session", () => {
  const params = new URLSearchParams("auth=error&auth_err=session");
  assert.ok(readAuthCallbackErrorMessage(params)?.includes("同じブラウザ"));
});

test("readAuthCallbackErrorMessage maps auth_err email", () => {
  const params = new URLSearchParams("auth=error&auth_err=email");
  assert.ok(readAuthCallbackErrorMessage(params)?.includes("メール確認"));
});

test("readAuthCallbackErrorMessage returns null for linked", () => {
  const params = new URLSearchParams("auth=linked");
  assert.equal(readAuthCallbackErrorMessage(params), null);
});

test("readAuthCallbackErrorMessage decodes OAuth error_description", () => {
  const params = new URLSearchParams();
  params.set("error", "server_error");
  params.set("error_description", "Something+went+wrong");
  const msg = readAuthCallbackErrorMessage(params);
  assert.ok(msg?.includes("Something went wrong"));
});
