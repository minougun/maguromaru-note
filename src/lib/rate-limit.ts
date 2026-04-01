import { isIP } from "node:net";

export type RateLimitPolicy = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

function nowMs() {
  return Date.now();
}

const TRUSTED_IP_HEADER_NAMES = [
  "cf-connecting-ip",
  "fly-client-ip",
  "fastly-client-ip",
  "true-client-ip",
  "x-real-ip",
  "x-vercel-forwarded-for",
] as const;

function normalizeTrustedIpCandidate(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes(",")) {
    return null;
  }

  const bracketed = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
  const unwrapped = bracketed?.[1] ?? trimmed;
  const withoutPort = /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(unwrapped)
    ? unwrapped.replace(/:\d+$/, "")
    : unwrapped;

  return isIP(withoutPort) ? withoutPort : null;
}

export function readClientIp(request: Request) {
  for (const headerName of TRUSTED_IP_HEADER_NAMES) {
    const candidate = normalizeTrustedIpCandidate(request.headers.get(headerName));
    if (candidate) {
      return candidate;
    }
  }

  return "unknown";
}

export function consumeRateLimit(key: string, policy: RateLimitPolicy): RateLimitResult {
  const currentTime = nowMs();
  const current = store.get(key);

  if (!current || current.resetAt <= currentTime) {
    store.set(key, {
      count: 1,
      resetAt: currentTime + policy.windowMs,
    });
    return {
      ok: true,
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
    };
  }

  if (current.count >= policy.maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    ok: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
  };
}

export const mutationRateLimits = {
  visitWrites: { windowMs: 60_000, maxRequests: 20 },
  quizWrites: { windowMs: 60_000, maxRequests: 60 },
  shareWrites: { windowMs: 60_000, maxRequests: 20 },
  authWrites: { windowMs: 60_000, maxRequests: 10 },
  adminWrites: { windowMs: 60_000, maxRequests: 20 },
} as const;

/** GET /api/app-snapshot 用（タブ切替・staleTime 前提の読み取り上限） */
export const snapshotReadLimits = { windowMs: 60_000, maxRequests: 90 } as const;

export function resetRateLimitStoreForTests() {
  store.clear();
}
