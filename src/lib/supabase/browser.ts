"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  authNextPathSchema,
  createEmailAccountInputSchema,
  signInWithPasswordInputSchema,
} from "@/lib/domain/schemas";

// Next.js は process.env.NEXT_PUBLIC_* の直接アクセスのみビルド時にインラインする。
// env.ts の readOptionalEnv() は process.env[name] (動的アクセス) を使うため
// クライアント側では常に undefined になる。ここでは直接アクセスを使う。
const BROWSER_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BROWSER_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const HAS_SUPABASE = Boolean(BROWSER_SUPABASE_URL && BROWSER_SUPABASE_ANON_KEY);

let browserClient: SupabaseClient<Database> | undefined;

export interface BrowserAuthProfile {
  accessToken: string | null;
  email: string | null;
  isAnonymous: boolean;
  identityProviders: string[];
}

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

export async function ensureSupabaseAccessToken() {
  const result = await ensureAnonymousSupabaseSession();
  return result.accessToken ?? (result.authenticated ? await waitForSupabaseAccessToken() : null);
}

export function buildSupabaseAuthHeaders(accessToken: string | null | undefined, headers: HeadersInit = {}) {
  const nextHeaders = new Headers(headers);

  if (accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return nextHeaders;
}

export async function buildFreshSupabaseAuthHeaders(headers: HeadersInit = {}) {
  const accessToken = await ensureSupabaseAccessToken();
  return buildSupabaseAuthHeaders(accessToken, headers);
}

function buildAuthCallbackUrl(nextPath: string) {
  const parsedNextPath = authNextPathSchema.parse(nextPath);
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", parsedNextPath);
  return url.toString();
}

export async function getSupabaseAuthProfile(): Promise<BrowserAuthProfile> {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return {
      accessToken: null,
      email: null,
      isAnonymous: true,
      identityProviders: [],
    };
  }

  const [
    {
      data: { session },
    },
    { data: userData, error: userError },
    { data: identitiesData, error: identitiesError },
  ] = await Promise.all([
    client.auth.getSession(),
    client.auth.getUser(),
    client.auth.getUserIdentities(),
  ]);

  if (userError) {
    throw userError;
  }
  if (identitiesError) {
    throw identitiesError;
  }

  const user = userData.user;
  const identityProviders = [...new Set((identitiesData?.identities ?? []).map((identity) => identity.provider))];

  return {
    accessToken: session?.access_token ?? null,
    email: user?.email ?? null,
    isAnonymous: Boolean(user?.is_anonymous) || identityProviders.length === 0,
    identityProviders,
  };
}

export async function startGoogleLinkFlow(nextPath = "/account") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const { data, error } = await client.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl(nextPath),
    },
  });

  if (error) {
    throw error;
  }

  if (data.url) {
    window.location.assign(data.url);
  }
}

export async function startGoogleSignInFlow(nextPath = "/account") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl(nextPath),
    },
  });

  if (error) {
    throw error;
  }

  if (data.url) {
    window.location.assign(data.url);
  }
}

export async function createEmailPasswordAccount(input: unknown, nextPath = "/account") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const parsed = createEmailAccountInputSchema.parse(input);
  const { data, error } = await client.auth.updateUser(
    {
      email: parsed.email,
      password: parsed.password,
    },
    {
      emailRedirectTo: buildAuthCallbackUrl(nextPath),
    },
  );

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signInWithEmailPassword(input: unknown) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const parsed = signInWithPasswordInputSchema.parse(input);
  const { data, error } = await client.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    throw error;
  }

  return data.session;
}
