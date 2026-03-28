"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { hasSupabaseEnv } from "@/lib/env";

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) {
    return undefined;
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );

  return browserClient;
}

export async function ensureAnonymousSupabaseSession() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return { ready: true, authenticated: false };
  }

  const { data } = await client.auth.getSession();
  if (data.session) {
    return { ready: true, authenticated: true };
  }

  const { error } = await client.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return { ready: true, authenticated: true };
}
