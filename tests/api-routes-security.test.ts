/**
 * API 直叩き・CSRF・不正ボディの負のテスト。
 * `verifyCsrfOrigin` は `NEXT_PUBLIC_SITE_URL`（未設定時は localhost:3000）と Origin の完全一致。
 * package.json の test スクリプトで SITE_URL を固定している。
 */
import assert from "node:assert/strict";
import test from "node:test";

import { verifyCsrfOrigin } from "@/lib/env";
import { POST as adminStatusPost } from "@/app/api/admin/status/route";
import { GET as appSnapshotGet } from "@/app/api/app-snapshot/route";
import { POST as anonymousCompletePost } from "@/app/api/auth/anonymous-link/complete/route";
import { POST as anonymousPreparePost } from "@/app/api/auth/anonymous-link/prepare/route";
import { POST as quizAnswerCheckPost } from "@/app/api/quiz-answer-check/route";
import { POST as quizResultsPost } from "@/app/api/quiz-results/route";
import { POST as quizSessionsPost } from "@/app/api/quiz-sessions/route";
import { POST as shareBonusesPost } from "@/app/api/share-bonuses/route";
import { DELETE as visitLogDelete } from "@/app/api/visit-logs/[id]/route";
import { POST as visitLogsPost } from "@/app/api/visit-logs/route";

const allowedOrigin = "http://localhost:3000";
const api = (path: string) => `${allowedOrigin}${path}`;

function jsonPost(path: string, init: { origin?: string | null; body?: string; headers?: Record<string, string> }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...init.headers,
  };
  if (init.origin !== null && init.origin !== undefined) {
    headers.origin = init.origin;
  }
  return new Request(api(path), {
    method: "POST",
    headers,
    body: init.body ?? "{}",
  });
}

async function readErrorJson(res: Response) {
  const data = (await res.json()) as { error?: string };
  return data.error ?? "";
}

test("verifyCsrfOrigin: 許可オリジンのみ true", () => {
  assert.equal(
    verifyCsrfOrigin(
      new Request(api("/x"), { headers: { origin: allowedOrigin } }),
    ),
    true,
  );
  assert.equal(
    verifyCsrfOrigin(
      new Request(api("/x"), { headers: { origin: "https://evil.example" } }),
    ),
    false,
  );
  assert.equal(verifyCsrfOrigin(new Request(api("/x"))), false);
  assert.equal(
    verifyCsrfOrigin(
      new Request(api("/x"), { headers: { origin: "http://127.0.0.1:3000" } }),
    ),
    false,
  );
});

const mutationPosts: { name: string; post: (req: Request) => Promise<Response> }[] = [
  { name: "visit-logs", post: visitLogsPost },
  { name: "quiz-sessions", post: quizSessionsPost },
  { name: "quiz-answer-check", post: quizAnswerCheckPost },
  { name: "quiz-results", post: quizResultsPost },
  { name: "share-bonuses", post: shareBonusesPost },
  { name: "admin/status", post: adminStatusPost },
  { name: "auth/anonymous-link/prepare", post: anonymousPreparePost },
  { name: "auth/anonymous-link/complete", post: anonymousCompletePost },
];

for (const { name, post } of mutationPosts) {
  test(`POST /api/${name}: Origin なしは 403`, async () => {
    const res = await post(jsonPost(`/api/${name}`, { origin: null }));
    assert.equal(res.status, 403);
    assert.match(await readErrorJson(res), /リクエスト元/);
  });

  test(`POST /api/${name}: 異なる Origin は 403`, async () => {
    const res = await post(
      jsonPost(`/api/${name}`, { origin: "https://attacker.example", body: "{}" }),
    );
    assert.equal(res.status, 403);
  });
}

test("POST /api/visit-logs: 正規 Origin でも JSON 壊れは 400", async () => {
  const res = await visitLogsPost(
    new Request(api("/api/visit-logs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: allowedOrigin,
      },
      body: "{not json",
    }),
  );
  assert.equal(res.status, 400);
});

test("POST /api/visit-logs: 正規 Origin + 空オブジェクトは Zod で 400", async () => {
  const res = await visitLogsPost(jsonPost("/api/visit-logs", { origin: allowedOrigin, body: "{}" }));
  assert.equal(res.status, 400);
});

test("POST /api/visit-logs: 正規 Origin + 余計なキーは 400", async () => {
  const res = await visitLogsPost(
    jsonPost("/api/visit-logs", {
      origin: allowedOrigin,
      body: JSON.stringify({
        menuItemId: "maguro_don",
        partIds: [],
        photoDataUrl: null,
        evil: true,
      }),
    }),
  );
  assert.equal(res.status, 400);
});

test("DELETE /api/visit-logs/:id: Origin なしは 403", async () => {
  const res = await visitLogDelete(
    new Request(api("/api/visit-logs/00000000-0000-4000-8000-000000000001"), {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }) },
  );
  assert.equal(res.status, 403);
});

test("GET /api/app-snapshot: ハンドラが応答する（401 またはモック時 200）", async () => {
  const res = await appSnapshotGet(new Request(api("/api/app-snapshot")));
  assert.ok(res.status === 401 || res.status === 200, `unexpected status ${res.status}`);
});
