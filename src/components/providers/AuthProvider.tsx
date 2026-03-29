"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const LOCAL_SESSION_STORAGE_KEY = "maguro-note-local-session";

export interface AuthContextValue {
  ready: boolean;
  usingSupabase: boolean;
  signedIn: boolean;
  error: string | null;
  accessToken: string | null;
  /** Supabase 未設定のとき「今すぐはじめる」でローカル利用を開始する */
  acknowledgeLocalSession: () => void;
  /** ローカルモック利用を終了し、初回画面に戻す */
  clearLocalSession: () => void;
}

type AuthSessionState = Omit<AuthContextValue, "acknowledgeLocalSession" | "clearLocalSession">;

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  usingSupabase: SUPABASE_CONFIGURED,
  signedIn: false,
  error: null,
  accessToken: null,
  acknowledgeLocalSession: () => {},
  clearLocalSession: () => {},
});

async function resolveInitialSupabaseSession(
  client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
): Promise<{ accessToken: string | null; signedIn: boolean }> {
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return { accessToken: null, signedIn: false };
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return { accessToken: null, signedIn: false };
  }

  return { accessToken: session.access_token, signedIn: true };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthSessionState>({
    ready: false,
    usingSupabase: SUPABASE_CONFIGURED,
    signedIn: false,
    error: null,
    accessToken: null,
  });

  const acknowledgeLocalSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LOCAL_SESSION_STORAGE_KEY, "1");
    }
    setState({
      ready: true,
      usingSupabase: false,
      signedIn: true,
      error: null,
      accessToken: null,
    });
  }, []);

  const clearLocalSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
    }
    setState({
      ready: true,
      usingSupabase: false,
      signedIn: false,
      error: null,
      accessToken: null,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const client = getSupabaseBrowserClient();

    async function bootstrap() {
      if (!SUPABASE_CONFIGURED) {
        const hasLocal =
          typeof window !== "undefined" && window.sessionStorage.getItem(LOCAL_SESSION_STORAGE_KEY) === "1";
        setState({
          ready: true,
          usingSupabase: false,
          signedIn: hasLocal,
          error: null,
          accessToken: null,
        });
        return;
      }

      if (!client) {
        setState({
          ready: true,
          usingSupabase: true,
          signedIn: false,
          error: "Supabase クライアントを初期化できませんでした。",
          accessToken: null,
        });
        return;
      }

      try {
        const { accessToken, signedIn } = await resolveInitialSupabaseSession(client);
        if (cancelled) {
          return;
        }

        setState({
          ready: true,
          usingSupabase: true,
          signedIn,
          error: null,
          accessToken,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const msg = error instanceof Error ? error.message : "unknown";
        setState({
          ready: true,
          usingSupabase: true,
          signedIn: false,
          error: `認証初期化に失敗しました: ${msg}`,
          accessToken: null,
        });
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } =
      client?.auth.onAuthStateChange((_event, session) => {
        if (cancelled) {
          return;
        }

        if (!session?.access_token) {
          setState((current) => ({
            ...current,
            ready: true,
            usingSupabase: true,
            signedIn: false,
            error: null,
            accessToken: null,
          }));
          return;
        }

        setState((current) => ({
          ...current,
          ready: true,
          usingSupabase: true,
          signedIn: true,
          accessToken: session.access_token,
          error: null,
        }));
      }) ?? { data: { subscription: { unsubscribe() {} } } };

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      acknowledgeLocalSession,
      clearLocalSession,
    }),
    [acknowledgeLocalSession, clearLocalSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthContext);
}
