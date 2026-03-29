import { buildSupabaseAuthHeaders, readSupabaseAccessToken } from "@/lib/supabase/browser";

export class FetchJsonError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "FetchJsonError";
    this.status = status;
    this.body = body;
  }
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) {
      return err;
    }
  }
  return fallback;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FetchJsonError(
      errorMessageFromBody(body, response.statusText || "リクエストに失敗しました。"),
      response.status,
      body,
    );
  }
  return body as T;
}

export type FetchJsonAuthContext = {
  usingSupabase: boolean;
  accessToken: string | null;
};

/**
 * API 向け JSON fetch。`accessToken` があれば即利用し、無ければ Supabase 時のみ `getSession` を1回試す。
 * 401 のときトークンが更新されていれば1回だけ再試行する。
 */
export async function fetchJsonWithAuth<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  auth: FetchJsonAuthContext,
): Promise<T> {
  const baseInit = init ?? {};
  let token = auth.accessToken;
  if (!token && auth.usingSupabase) {
    token = await readSupabaseAccessToken();
  }

  const run = async (t: string | null) =>
    fetch(input, {
      ...baseInit,
      headers: buildSupabaseAuthHeaders(t, new Headers(baseInit.headers as HeadersInit)),
    });

  let response = await run(token);
  if (response.status === 401 && auth.usingSupabase) {
    const retry = await readSupabaseAccessToken();
    if (retry && retry !== token) {
      response = await run(retry);
    }
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FetchJsonError(
      errorMessageFromBody(body, response.statusText || "リクエストに失敗しました。"),
      response.status,
      body,
    );
  }
  return body as T;
}
