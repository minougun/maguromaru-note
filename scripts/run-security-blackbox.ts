import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

import { mutationRateLimits } from "@/lib/rate-limit";
import { SECURITY_HEADER_ENTRIES } from "@/lib/security-headers";

const require = createRequire(import.meta.url);

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = Number.parseInt(process.env.SECURITY_TEST_PORT ?? "3210", 10);
const REMOTE_BASE_URL = process.env.SECURITY_TEST_BASE_URL?.trim() || null;
const BASE_URL = REMOTE_BASE_URL ?? `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
const ALLOWED_ORIGIN = new URL(BASE_URL).origin;

function fakeJwt(sub: string) {
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `Bearer h.${payload}.s`;
}

function assertSecurityHeaders(response: Response) {
  for (const [name, value] of SECURITY_HEADER_ENTRIES) {
    assert.equal(response.headers.get(name), value, `missing security header ${name}`);
  }
}

async function request(path: string, init?: RequestInit) {
  return fetch(new URL(path, BASE_URL), {
    redirect: "manual",
    ...init,
    signal: AbortSignal.timeout(10_000),
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await request("/api/app-snapshot?scope=invalid");
      if (response.status > 0) {
        return;
      }
    } catch {
      // wait for boot
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${BASE_URL}`);
}

async function startLocalServer(): Promise<ChildProcess | null> {
  if (REMOTE_BASE_URL) {
    return null;
  }

  const child = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "start", "-H", DEFAULT_HOST, "-p", String(DEFAULT_PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: BASE_URL,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const prefix = "[security-blackbox server]";
  child.stdout?.on("data", (chunk) => process.stdout.write(`${prefix} ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`${prefix} ${chunk}`));
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`${prefix} exited with code ${code}\n`);
    }
  });

  await waitForServer();
  return child;
}

async function stopLocalServer(child: ChildProcess | null) {
  if (!child) {
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), delay(5_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

async function runChecks() {
  const invalidScope = await request("/api/app-snapshot?scope=invalid");
  assert.equal(invalidScope.status, 400);
  assertSecurityHeaders(invalidScope);

  const callback = await request("/auth/callback?error=access_denied&next=/mypage");
  assert.ok([302, 303, 307, 308].includes(callback.status), `unexpected callback status ${callback.status}`);
  const callbackLocation = callback.headers.get("location") ?? "";
  assert.ok(callbackLocation.startsWith("http://localhost:3210/") || callbackLocation.startsWith(`${ALLOWED_ORIGIN}/`));
  assert.match(callbackLocation, /\/mypage(?:$|\?)/);
  assertSecurityHeaders(callback);

  const missingOrigin = await request("/api/visit-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(missingOrigin.status, 403);
  assertSecurityHeaders(missingOrigin);

  const evilOrigin = await request("/api/visit-logs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://attacker.example",
    },
    body: "{}",
  });
  assert.equal(evilOrigin.status, 403);
  assertSecurityHeaders(evilOrigin);

  let latestStatus = 0;
  for (let i = 0; i <= mutationRateLimits.authWrites.maxRequests; i += 1) {
    const response = await request("/api/auth/anonymous-link/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: ALLOWED_ORIGIN,
        authorization: fakeJwt(`spoofed-user-${i}`),
        "x-forwarded-for": `198.51.100.${i}`,
      },
      body: "{}",
    });
    latestStatus = response.status;
    assertSecurityHeaders(response);
  }
  assert.equal(latestStatus, 429, `expected spoofed auth-link flood to hit rate limit, got ${latestStatus}`);

  const cron = await request("/api/cron/store-ai-blurb", {
    headers: {
      authorization: "Bearer wrong-secret",
    },
  });
  assert.equal(cron.status, 401);
  assertSecurityHeaders(cron);
}

async function main() {
  const child = await startLocalServer();
  try {
    await runChecks();
    process.stdout.write(`security blackbox checks passed against ${BASE_URL}\n`);
  } finally {
    await stopLocalServer(child);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
