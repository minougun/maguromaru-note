"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  authNextPathSchema,
  createEmailAccountInputSchema,
  displayNameOnlySchema,
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

/** 既存セッションの access_token のみ返す（匿名サインインは行わない）。 */
export async function readSupabaseAccessToken(): Promise<string | null> {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  return session?.access_token ?? null;
}

export async function ensureSupabaseAccessToken() {
  return readSupabaseAccessToken();
}

export function buildSupabaseAuthHeaders(accessToken: string | null | undefined, headers: HeadersInit = {}) {
  const nextHeaders = new Headers(headers);

  if (accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return nextHeaders;
}

export async function buildFreshSupabaseAuthHeaders(headers: HeadersInit = {}) {
  const accessToken = await readSupabaseAccessToken();
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
    isAnonymous: Boolean(user?.is_anonymous),
    identityProviders,
  };
}

/** 表示名のみで利用開始（匿名セッション + user_metadata.display_name）。パスワード不要。 */
export async function signInWithDisplayNameOnly(rawDisplayName: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const displayName = displayNameOnlySchema.parse(rawDisplayName);

  const {
    data: { session: existing },
  } = await client.auth.getSession();

  if (existing?.user?.is_anonymous) {
    const { error } = await client.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) {
      throw error;
    }
    return;
  }

  if (existing?.access_token) {
    throw new Error("すでにログインしています。別の方法で入っている場合は一度ログアウトしてください。");
  }

  const { error: anonError } = await client.auth.signInAnonymously();
  if (anonError) {
    throw anonError;
  }

  const { error: nameError } = await client.auth.updateUser({
    data: { display_name: displayName },
  });
  if (nameError) {
    throw nameError;
  }
}

export async function startGoogleLinkFlow(nextPath = "/") {
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

export async function startGoogleSignInFlow(nextPath = "/") {
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

export async function signUpWithEmailPassword(input: unknown, nextPath = "/") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const parsed = createEmailAccountInputSchema.parse(input);
  const { data, error } = await client.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(nextPath),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutSupabase() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  await client.auth.signOut();
}

/** 電話番号の紐づけ: SMS 送信（updateUser）。マイページから呼ぶ。 */
export async function requestPhoneLinkSms(phoneE164: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const phone = phoneE164.trim();
  if (!phone.startsWith("+")) {
    throw new Error("国番号から入力してください（例: +819012345678）。");
  }

  const { error } = await client.auth.updateUser({ phone });
  if (error) {
    throw error;
  }
}

/** 電話番号の紐づけ: SMS の確認コードで確定。 */
export async function verifyPhoneLinkOtp(phoneE164: string, token: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const { error } = await client.auth.verifyOtp({
    phone: phoneE164.trim(),
    token: token.trim(),
    type: "phone_change",
  });
  if (error) {
    throw error;
  }
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
