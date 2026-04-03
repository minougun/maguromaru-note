/**
 * API 直叩き・CSRF・不正ボディの負のテスト。
 * `verifyCsrfOrigin` は `NEXT_PUBLIC_SITE_URL`（未設定時は localhost:3000）と Origin の完全一致。
 * package.json の test スクリプトで SITE_URL を固定している。
 */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { verifyCsrfOrigin } from "@/lib/env";
import { resetHttpRateLimitCachesForTests } from "@/lib/http-rate-limit";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";
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
import { mutationRateLimits } from "@/lib/rate-limit";

const allowedOrigin = "http://localhost:3000";
const api = (path: string) => `${allowedOrigin}${path}`;

beforeEach(() => {
  resetRateLimitStoreForTests();
  resetHttpRateLimitCachesForTests();
});

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
    true,
  );
  assert.equal(
    verifyCsrfOrigin(
      new Request("http://127.0.0.1:3000/api/x", { headers: { origin: "http://localhost:3000" } }),
    ),
    true,
  );
  assert.equal(
    verifyCsrfOrigin(
      new Request(api("/x"), { headers: { origin: "http://localhost:3000/" } }),
    ),
    true,
  );
  assert.equal(
    verifyCsrfOrigin(new Request(api("/x"), { headers: { origin: "null" } })),
    false,
  );
});

test("verifyCsrfOrigin: production では loopback alias を許可しない", () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.equal(
      verifyCsrfOrigin(
        new Request(api("/x"), { headers: { origin: "http://127.0.0.1:3000" } }),
      ),
      false,
    );
  } finally {
    process.env.NODE_ENV = original;
  }
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

test("GET /api/app-snapshot?scope=invalid: 400", async () => {
  const res = await appSnapshotGet(new Request(api("/api/app-snapshot?scope=invalid")));
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: string };
  assert.equal(body.error, "無効な scope です。");
});

test("GET /api/app-snapshot?scope=home: ハンドラが応答する（401 またはモック時 200）", async () => {
  const res = await appSnapshotGet(new Request(api("/api/app-snapshot?scope=home")));
  assert.ok(res.status === 401 || res.status === 200, `unexpected status ${res.status}`);
});

test("GET /api/app-snapshot: history のページ指定は scope=history のときのみ", async () => {
  const res = await appSnapshotGet(
    new Request(api("/api/app-snapshot?scope=home&history_visit_page=2")),
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: string };
  assert.match(body.error ?? "", /history_visit_page|scope=history/);
});

test("GET /api/app-snapshot: 不正な history_visit_page_size は 400", async () => {
  const res = await appSnapshotGet(
    new Request(api("/api/app-snapshot?scope=history&history_visit_page_size=99999")),
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: string };
  assert.match(body.error ?? "", /ページ指定|history_visit/);
});

test("GET /api/app-snapshot: 不正な Bearer は 401（モック時はセッション次第で 200 の可能性あり）", async () => {
  const res = await appSnapshotGet(
    new Request(api("/api/app-snapshot?scope=home"), {
      headers: { Authorization: "Bearer eyJhbGciOiJub25lIn0.e30." },
    }),
  );
  assert.ok(
    res.status === 401 || res.status === 200,
    `expected 401 invalid token or 200 mock; got ${res.status}`,
  );
});

test("POST /api/auth/anonymous-link/prepare: 連打すると 429", async () => {
  let last: Response | null = null;
  for (let i = 0; i <= mutationRateLimits.authWrites.maxRequests; i += 1) {
    last = await anonymousPreparePost(
      jsonPost("/api/auth/anonymous-link/prepare", { origin: allowedOrigin, body: "{}" }),
    );
  }

  assert.ok(last);
  assert.equal(last.status, 429);
});

test("POST /api/auth/anonymous-link/complete: 連打すると 429", async () => {
  let last: Response | null = null;
  for (let i = 0; i <= mutationRateLimits.authWrites.maxRequests; i += 1) {
    last = await anonymousCompletePost(
      jsonPost("/api/auth/anonymous-link/complete", { origin: allowedOrigin, body: "{}" }),
    );
  }

  assert.ok(last);
  assert.equal(last.status, 429);
});
