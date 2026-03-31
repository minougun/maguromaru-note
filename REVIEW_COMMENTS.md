# Review: CI/Secrets/Error handling improvements

## Summary
- Added TypeScript typecheck to CI
- Added secret-scanning workflow
- Added pre-commit secret guard
- Implemented retry/timeout and masking for OpenAI calls
- Removed hard-coded production env values

## Files changed
- .github/workflows/ci.yml — run typecheck, build, tests
- .github/workflows/secret-scan.yml — Basic secret scan
- .github/workflows/store-ai-blurb-cron.yml — ensured uses secrets
- .env.production.local — commented out leaked keys
- src/lib/services/store-ai-blurb.ts — retry, timeout, masking

## Followups / Recommendations
1. Enable GitHub native secret scanning and push exclusion rules.
2. Replace simple grep pre-commit with `detect-secrets` or `gitleaks` action for robust scanning.
3. Review all env files for accidental secrets; rotate any leaked keys immediately.
4. Apply similar retry wrappers to Supabase callers where network errors observed.
5. Consider centralizing HTTP client logic (fetch wrapper) for consistent timeouts, instrumentation, and observability.

## Suggested PR body (copy into GitHub)
- Adds CI type checking, secret scanning, pre-commit guard and improves OpenAI/Supabase error handling.
- Masks secrets in logs and adds retries/timeouts for external calls.

## Priority
1. Rotate leaked Supabase service key (HIGH)
2. Enable secret scanning in repo (HIGH)
3. Merge CI typecheck to catch future type regressions (MEDIUM)
4. Expand retry/timeout to other network calls (LOW)
