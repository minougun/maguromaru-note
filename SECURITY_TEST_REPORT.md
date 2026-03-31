# maguromaru-note API Security Test Report

Summary
- Scope: API routes and server-side services (Supabase-backed).
- Focus: API direct-call attacks, auth/authorization, input validation, rate limiting, CORS, data protection.

Findings (high/medium/low)

1) High: JWT sub decoded without verification used for rate-limiting identity
- Location: src/lib/auth-bearer.ts -> tryJwtSubFromAuthHeader
- Risk: An attacker can present a forged JWT (not validated) to claim a different sub and bypass per-user limits when Upstash is configured (originally used `u:<sub>` as identifier).
- Mitigation applied: rate-limit identifier now includes client IP (u:<sub>:ip:<ip>), reducing risk of sub spoofing allowing unlimited requests from other IPs.

PoC (rate-limit evasion)
- Craft a fake JWT with desired payload (no signature verification needed by tryJwtSubFromAuthHeader) and send repeated requests with Authorization: Bearer <fake>
- Before patch, Upstash keying by `u:<sub>` could allow distributed requests from multiple IPs each using same forged sub to share quota. Now identifier contains IP.

2) Medium: CSRF protection relies on Origin strict-equality check
- Location: src/lib/env.ts -> verifyCsrfOrigin
- Behavior: returns false unless Origin header exactly equals NEXT_PUBLIC_SITE_URL origin. Missing Origin => rejected.
- Risk: Good for browser-based protections but may block legitimate non-browser clients that do not send Origin. Also verifyCsrfOrigin does not validate Referer fallback.
- Recommendation: keep strict Origin check for browser flows, but provide documented API clients (mobile/CLI) with token-based auth or implement double-submit CSRF token for cookie-based sessions.

3) Medium: Rate limiting fallback is process-local memory
- Location: src/lib/rate-limit.ts
- Risk: If Upstash Redis is not configured, consumeRateLimit uses an in-memory Map which is not shared across instances; distributed denial of service remains possible.
- Recommendation: Ensure UPSTASH_REDIS_REST_URL/TOKEN are set in production or deploy WAF / cloud rate-limits in front of app.

4) Medium: Some endpoints accept free-form fields and echo them (XSS risk)
- Examples: visit_logs.memo, user-provided text potentially stored and later rendered client-side.
- Recommendation: Sanitize inputs before storing or apply output encoding and CSP on frontend.

5) Low: Error messages sometimes expose database error messages (toRouteError passes Error.message)
- Location: src/lib/services/* handlers -> toRouteError returns error.message for generic Error -> 500
- Recommendation: Sanitize returned messages in production to avoid leaking schema/SQL details. Keep detailed logs server-side.

6) Low: Logging may include errors via console.error (global). Ensure logs do not contain secrets (tokens/passwords).

Validation & SQL Injection
- Supabase client is used (parameterized), and Zod schemas are widely used for inputs. This reduces SQL injection risk substantially.
- No raw SQL string concatenation observed in services. Good.

CORS
- Server-side code denies non-matching Origin via verifyCsrfOrigin but does not set CORS headers. If APIs must be called cross-origin from allowed domains, set explicit Access-Control-Allow-Origin.

Authentication / Session
- Supabase is used for auth. getAccessTokenFromRequest reads Bearer token from Authorization header. Server-side uses createTokenSupabaseClient(accessToken) for per-request auth.
- signOut calls supabase.auth.signOut (client). To ensure server-side session invalidation, consider revoking refresh tokens via service role if needed.

Immediate Changes Made (branch: security/api-hardening)
- src/lib/http-rate-limit.ts: include client IP in rate-limit identifier to mitigate forged JWT sub abuse.
  - Commit created on branch `security/api-hardening`.

Recommended Fixes / Patches
1. Keep the JWT->sub decoding but do NOT trust it for authorization; only use it combined with IP (already applied) or verify token signature against Supabase public keys before trusting sub.
   - Option: call Supabase auth.verifySession or introspect token via Supabase admin API when possible.
2. Add Referer fallback and a documented opt-in for non-browser clients for CSRF check (or use double-submit CSRF tokens) in src/lib/env.ts.
3. Ensure UPSTASH_REDIS_REST_URL/TOKEN are configured in production; otherwise use cloud WAF rate-limits.
4. Sanitize error messages returned to clients in toRouteError for non-dev environments.
5. Add output encoding / input sanitization for memo and other free-text fields.
6. Add tests covering: missing Origin, forged JWT with different sub, large/invalid inputs (UUID/date), SQL injection strings to endpoints, XSS payloads.

Example PoC: unauthorized access attempt
- curl -v -X POST "https://<site>/api/visit-logs" -H "Content-Type: application/json" -d '{"menuItemId":"..."}'
  - If Origin header missing, verifyCsrfOrigin will reject (403) for endpoints using it.

Next Steps I can take on request
- Implement Referer fallback + documented API exceptions.
- Sanitize toRouteError responses.
- Add unit/integration tests for the PoCs and rate-limit behavior.

