type RateLimitPolicy = {
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

export function readClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
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

export function applyRateLimit(request: Request, routeKey: string, policy: RateLimitPolicy) {
  const clientIp = readClientIp(request);
  return consumeRateLimit(`${routeKey}:${clientIp}`, policy);
}

export const mutationRateLimits = {
  visitWrites: { windowMs: 60_000, maxRequests: 20 },
  quizWrites: { windowMs: 60_000, maxRequests: 60 },
  shareWrites: { windowMs: 60_000, maxRequests: 20 },
  adminWrites: { windowMs: 60_000, maxRequests: 20 },
} as const;

export function resetRateLimitStoreForTests() {
  store.clear();
}
