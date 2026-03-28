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
  siteUrl:
    readOptionalEnv("NEXT_PUBLIC_SITE_URL") ??
    withHttps(readOptionalEnv("VERCEL_URL")) ??
    withHttps(readOptionalEnv("VERCEL_PROJECT_PRODUCTION_URL")) ??
    "http://localhost:3000",
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
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

export function getSiteUrl() {
  return env.siteUrl.replace(/\/$/, "");
}

export function isMockStaffEnabled() {
  return readOptionalEnv("MAGUROMARU_ENABLE_MOCK_STAFF") === "true";
}
