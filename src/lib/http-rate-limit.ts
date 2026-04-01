import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { consumeRateLimit, readClientIp, type RateLimitPolicy } from "@/lib/rate-limit";

let redisSingleton: Redis | null | undefined;
const limiterCache = new Map<string, Ratelimit>();

function getUpstashRedis(): Redis | null {
  if (redisSingleton !== undefined) {
    return redisSingleton;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }

  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

function getRatelimit(routeKey: string, maxRequests: number, windowMs: number): Ratelimit | null {
  const redis = getUpstashRedis();
  if (!redis) {
    return null;
  }

  const windowSec = Math.max(1, Math.round(windowMs / 1000));
  const cacheKey = `${routeKey}:${maxRequests}:${windowSec}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
      prefix: `maguromaru:rl:${routeKey}`,
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
  }

  return limiter;
}

/** テストで Upstash シングルトンと limiter キャッシュを捨てる */
export function resetHttpRateLimitCachesForTests() {
  redisSingleton = undefined;
  limiterCache.clear();
}

/**
 * 分散レート制限（Upstash 設定時）またはメモリ Map（フォールバック）。
 * 識別子は検証済みユーザー ID を優先し、未検証 JWT や x-forwarded-for は信用しない。
 */
export async function checkHttpRateLimit(
  request: Request,
  routeKey: string,
  policy: RateLimitPolicy,
  options?: { verifiedUserId?: string | null },
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const ip = readClientIp(request);
  const identifier = options?.verifiedUserId ? `u:${options.verifiedUserId}` : `ip:${ip}`;

  const limiter = getRatelimit(routeKey, policy.maxRequests, policy.windowMs);
  if (!limiter) {
    return consumeRateLimit(`${routeKey}:${identifier}`, policy);
  }

  const result = await limiter.limit(identifier);
  const windowSec = Math.max(1, Math.round(policy.windowMs / 1000));

  if (result.success) {
    return { ok: true, retryAfterSeconds: windowSec };
  }

  const resetMs = typeof result.reset === "number" ? result.reset : Date.now() + policy.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
  return { ok: false, retryAfterSeconds };
}
