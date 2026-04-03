"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  authEmailSchema,
  authNextPathSchema,
  createEmailAccountInputSchema,
  signInWithPasswordInputSchema,
} from "@/lib/domain/schemas";

// Next.js は process.env.NEXT_PUBLIC_* の直接アクセスのみビルド時にインラインする。
// env.ts の readOptionalEnv() は process.env[name] (動的アクセス) を使うため
// クライアント側では常に undefined になる。ここでは直接アクセスを使う。
const BROWSER_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BROWSER_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BROWSER_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
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

/**
 * 既に `AuthProvider` が持つ `accessToken` を優先し、未取得のときだけ `getSession` する。
 * 画面からの API 呼び出しでは `buildFreshSupabaseAuthHeaders` の代わりにこちらを使う。
 */
export async function getClientAuthHeadersForApi(
  accessToken: string | null | undefined,
  usingSupabase: boolean,
  extra?: HeadersInit,
): Promise<Headers> {
  let token = accessToken ?? null;
  if (!token && usingSupabase) {
    token = await readSupabaseAccessToken();
  }
  return buildSupabaseAuthHeaders(token, extra);
}

/**
 * Google / Apple OAuth やメール確認の戻り先オリジン。
 * 本番ビルドでは `NEXT_PUBLIC_SITE_URL` に公開 URL（https://…）を必ず入れ、localhost へ飛ばないようにする。
 * 未設定時のみ `window.location.origin`（ローカル開発用）。
 */
function getAuthRedirectOrigin(): string {
  if (BROWSER_SITE_URL) {
    try {
      return new URL(BROWSER_SITE_URL).origin;
    } catch {
      /* 無効な URL はフォールバックへ */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  throw new Error(
    "認証のリダイレクト先を決められません。NEXT_PUBLIC_SITE_URL にサイトの公開 URL を設定してください。",
  );
}

function buildAuthCallbackUrl(nextPath: string) {
  const parsedNextPath = authNextPathSchema.parse(nextPath);
  const url = new URL("/auth/callback", getAuthRedirectOrigin());
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

  const user = userData.user;
  /** getUserIdentities が一時失敗・空でも、getUser().user.identities に Google 等が載ることがある（OAuth 直後など） */
  const fromIdentitiesApi = identitiesError ? [] : (identitiesData?.identities ?? []);
  const fromUserObject = user?.identities ?? [];
  const mergedIdentities = fromIdentitiesApi.length > 0 ? fromIdentitiesApi : fromUserObject;
  const identityProviders = [
    ...new Set(mergedIdentities.map((identity) => identity.provider).filter((p): p is string => Boolean(p))),
  ];

  return {
    accessToken: session?.access_token ?? null,
    email: user?.email ?? null,
    isAnonymous: Boolean(user?.is_anonymous),
    identityProviders,
  };
}

/** アカウントを作らず匿名セッションだけで利用開始（表示名・メール不要）。 */
export async function startAnonymousSession() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const {
    data: { session: existing },
  } = await client.auth.getSession();

  if (existing?.access_token) {
    if (existing.user?.is_anonymous) {
      return;
    }
    throw new Error("すでにサインイン済みです。別アカウントで始める場合は一度ログアウトしてください。");
  }

  const { error } = await client.auth.signInAnonymously();
  if (error) {
    throw error;
  }
}

function parseAuthEmail(email: string) {
  return authEmailSchema.parse(email.trim());
}

/** 初回サインイン用: メールへ OTP（セッション不要）。 */
export async function requestEmailSignInOtp(email: string, nextPath = "/") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const parsed = parseAuthEmail(email);
  const { error } = await client.auth.signInWithOtp({
    email: parsed,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: buildAuthCallbackUrl(nextPath),
    },
  });
  if (error) {
    throw error;
  }
}

/** 初回サインイン用: メールの確認コードでセッション確立。 */
export async function verifyEmailSignInOtp(email: string, token: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const parsed = parseAuthEmail(email);
  const { error } = await client.auth.verifyOtp({
    email: parsed,
    token: token.trim(),
    type: "email",
  });
  if (error) {
    throw error;
  }
}

const ANON_LINK_NONCE_STORAGE_KEY = "maguromaru_anon_link_nonce";

export function clearStoredAnonymousLinkNonce() {
  try {
    sessionStorage.removeItem(ANON_LINK_NONCE_STORAGE_KEY);
  } catch {
    /* ignore private mode */
  }
}

export function readStoredAnonymousLinkNonce(): string | null {
  try {
    return sessionStorage.getItem(ANON_LINK_NONCE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 匿名連携用 nonce を HttpOnly Cookie に載せる（OAuth / メール確認のコールバックで complete する）。 */
async function ensureAnonymousLinkPrepareCookie(accessToken: string): Promise<void> {
  const res = await fetch(`${window.location.origin}/api/auth/anonymous-link/prepare`, {
    method: "POST",
    credentials: "include",
    headers: buildSupabaseAuthHeaders(accessToken, { "Cache-Control": "no-store" }),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "連携の準備に失敗しました。");
  }
  if (body.ok !== true) {
    throw new Error("連携の準備に失敗しました。");
  }
}

/**
 * 匿名ユーザーが Google アカウントへ「昇格」する（Manual linking 不要）。
 * OAuth 完了後、アカウント連携画面で complete API が走り DB 上の user_id を引き継ぎます。
 */
export async function startAnonymousGoogleLinkFlow(nextPath = "/") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) {
    throw new Error("ログインが必要です。");
  }
  if (!session.user.is_anonymous) {
    throw new Error("匿名セッションでのみこの手順を使えます。");
  }

  await ensureAnonymousLinkPrepareCookie(session.access_token);

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl(nextPath),
    },
  });

  if (error) {
    clearStoredAnonymousLinkNonce();
    throw error;
  }

  if (data.url) {
    window.location.assign(data.url);
  }
}

/** 匿名ユーザーが Apple アカウントへ「昇格」する。 */
export async function startAnonymousAppleLinkFlow(nextPath = "/") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) {
    throw new Error("ログインが必要です。");
  }
  if (!session.user.is_anonymous) {
    throw new Error("匿名セッションでのみこの手順を使えます。");
  }

  await ensureAnonymousLinkPrepareCookie(session.access_token);

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: buildAuthCallbackUrl(nextPath),
    },
  });

  if (error) {
    clearStoredAnonymousLinkNonce();
    throw error;
  }

  if (data.url) {
    window.location.assign(data.url);
  }
}

/** 既に永続アカウントのとき、Google を追加で紐づける（Supabase の Manual linking が有効なときのみ成功しやすい）。 */
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

/** 既に永続アカウントのとき、Apple を追加で紐づける。 */
export async function startAppleLinkFlow(nextPath = "/") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const { data, error } = await client.auth.linkIdentity({
    provider: "apple",
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

/** 初回サインイン用: Apple（OAuth リダイレクト）。 */
export async function startAppleSignInFlow(nextPath = "/") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "apple",
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

export function resolveEmailLinkStrategy(session: {
  access_token?: string | null;
  user?: { is_anonymous?: boolean | null } | null;
} | null): "anonymous_magic_link" | "attach_email" {
  return session?.user?.is_anonymous && session.access_token ? "anonymous_magic_link" : "attach_email";
}

/**
 * メール連携の確認メール送信。
 * - 匿名セッション: signInWithOtp による magic link で既存/新規メールアカウントへ入り、callback 後に匿名データを移行する
 * - 通常セッション: updateUser(email) で現在のユーザーへメールを紐づける
 */
export async function requestEmailLinkConfirmation(email: string, nextPath = "/mypage") {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase が設定されていません。");
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  const parsed = parseAuthEmail(email);

  if (resolveEmailLinkStrategy(session) === "anonymous_magic_link") {
    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error("ログインが必要です。");
    }

    await ensureAnonymousLinkPrepareCookie(accessToken);

    const { error } = await client.auth.signInWithOtp({
      email: parsed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: buildAuthCallbackUrl(nextPath),
      },
    });
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await client.auth.updateUser({ email: parsed }, { emailRedirectTo: buildAuthCallbackUrl(nextPath) });
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
