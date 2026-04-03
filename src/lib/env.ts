function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function withHttps(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

export const env = {
  supabaseUrl: readOptionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  adminEmail: readOptionalEnv("ADMIN_EMAIL")?.toLowerCase(),
  siteUrl:
    readOptionalEnv("NEXT_PUBLIC_SITE_URL") ??
    withHttps(readOptionalEnv("VERCEL_URL")) ??
    withHttps(readOptionalEnv("VERCEL_PROJECT_PRODUCTION_URL")) ??
    "http://localhost:3000",
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isMockAllowed() {
  return process.env.NODE_ENV !== "production" || readOptionalEnv("MAGUROMARU_ENABLE_PRODUCTION_MOCK") === "true";
}

export function requireSupabaseInProduction() {
  if (!hasSupabaseEnv() && !isMockAllowed()) {
    throw new Error(
      "Supabase environment variables are required in production. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}

export function getSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  };
}

export function getSupabaseServiceEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase service environment variables are not configured. " +
      "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
  };
}

export function hasSupabaseServiceEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}

export function getSiteUrl() {
  return env.siteUrl.replace(/\/$/, "");
}

export function getAdminEmail() {
  return env.adminEmail;
}

export function isMockAdminEnabled() {
  return readOptionalEnv("MAGUROMARU_ENABLE_MOCK_ADMIN") === "true";
}

function tryParseOrigin(value: string | null | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function isSameLoopbackOrigin(left: URL, right: URL) {
  return (
    left.protocol === right.protocol &&
    left.port === right.port &&
    isLoopbackHost(left.hostname) &&
    isLoopbackHost(right.hostname)
  );
}

export function verifyCsrfOrigin(request: Request): boolean {
  const requestOrigin = tryParseOrigin(request.headers.get("origin"));
  if (!requestOrigin) return false;

  const allowedOrigins = [tryParseOrigin(getSiteUrl()), tryParseOrigin(request.url)].filter(
    (value): value is URL => value !== null,
  );

  for (const allowedOrigin of allowedOrigins) {
    if (requestOrigin.origin === allowedOrigin.origin) {
      return true;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return allowedOrigins.some((allowedOrigin) => isSameLoopbackOrigin(requestOrigin, allowedOrigin));
  }

  return false;
}
