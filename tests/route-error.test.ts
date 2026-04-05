import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { AppServiceError } from "@/lib/services/app-service-error";
import { toRouteError } from "@/lib/route-error";

test("toRouteError: AppServiceError はメッセージをそのまま（サニタイズ時も）", () => {
  const r = toRouteError(new AppServiceError(404, "見つかりません"), undefined, { sanitizeInternalErrors: true });
  assert.equal(r.status, 404);
  assert.equal(r.message, "見つかりません");
});

test("toRouteError: 素の Error は sanitize 時は汎用メッセージ", () => {
  const r = toRouteError(new Error("internal db detail"), undefined, { sanitizeInternalErrors: true });
  assert.equal(r.status, 500);
  assert.match(r.message, /サーバーでエラーが発生しました/);
});

test("toRouteError: 素の Error は非 sanitize では message を返す", () => {
  const r = toRouteError(new Error("debug visible"), undefined, { sanitizeInternalErrors: false });
  assert.equal(r.status, 500);
  assert.equal(r.message, "debug visible");
});

test("toRouteError: ZodError", () => {
  const err = z.object({ x: z.string() }).strict().safeParse({ y: 1 });
  assert.equal(err.success, false);
  const r = toRouteError(err.error);
  assert.equal(r.status, 400);
  assert.ok(r.message.length > 0);
});

test("toRouteError: SyntaxError は 400", () => {
  const r = toRouteError(new SyntaxError("bad json"));
  assert.equal(r.status, 400);
});
