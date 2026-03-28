"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// Next.js は process.env.NEXT_PUBLIC_* の直接アクセスのみビルド時にインラインする。
// env.ts の readOptionalEnv() は process.env[name] (動的アクセス) を使うため
// クライアント側では常に undefined になる。ここでは直接アクセスを使う。
const BROWSER_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BROWSER_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const HAS_SUPABASE = Boolean(BROWSER_SUPABASE_URL && BROWSER_SUPABASE_ANON_KEY);

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (!HAS_SUPABASE) {
    return undefined;
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    BROWSER_SUPABASE_URL,
    BROWSER_SUPABASE_ANON_KEY,
  );

  return browserClient;
}

export async function ensureAnonymousSupabaseSession() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return { ready: true, authenticated: false, accessToken: null };
  }

  const { data } = await client.auth.getSession();
  if (data.session) {
    return { ready: true, authenticated: true, accessToken: data.session.access_token };
  }

  const { data: signInData, error } = await client.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return {
    ready: true,
    authenticated: true,
    accessToken: signInData.session?.access_token ?? null,
  };
}

export async function waitForSupabaseAccessToken(retries = 20, delayMs = 250) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const {
      data: { session },
    } = await client.auth.getSession();

    if (session?.access_token) {
      return session.access_token;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }

  return null;
}

export function buildSupabaseAuthHeaders(accessToken: string | null | undefined, headers: HeadersInit = {}) {
  const nextHeaders = new Headers(headers);

  if (accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return nextHeaders;
}
