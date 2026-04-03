import assert from "node:assert/strict";
import test from "node:test";

import { resolveEmailLinkStrategy } from "@/lib/supabase/browser";

test("resolveEmailLinkStrategy uses magic link flow for anonymous sessions", () => {
  assert.equal(
    resolveEmailLinkStrategy({
      access_token: "token",
      user: { is_anonymous: true },
    }),
    "anonymous_magic_link",
  );
});

test("resolveEmailLinkStrategy uses attach flow for normal sessions", () => {
  assert.equal(
    resolveEmailLinkStrategy({
      access_token: "token",
      user: { is_anonymous: false },
    }),
    "attach_email",
  );
});

test("resolveEmailLinkStrategy uses attach flow when session is missing", () => {
  assert.equal(resolveEmailLinkStrategy(null), "attach_email");
});
