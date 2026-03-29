"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  ensureSupabaseAccessToken,
  ensureAnonymousSupabaseSession,
  getSupabaseBrowserClient,
  waitForSupabaseAccessToken,
} from "@/lib/supabase/browser";

interface AuthContextValue {
  ready: boolean;
  usingSupabase: boolean;
  error: string | null;
  accessToken: string | null;
}

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  usingSupabase: SUPABASE_CONFIGURED,
  error: null,
  accessToken: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    ready: false,
    usingSupabase: SUPABASE_CONFIGURED,
    error: null,
    accessToken: null,
  });

  useEffect(() => {
    let cancelled = false;
    const client = getSupabaseBrowserClient();

    async function bootstrap() {
      if (!SUPABASE_CONFIGURED) {
        setState({ ready: true, usingSupabase: false, error: null, accessToken: null });
        return;
      }

      try {
        const result = await ensureAnonymousSupabaseSession();
        const accessToken = result.accessToken ?? (result.authenticated ? await waitForSupabaseAccessToken() : null);

        if (cancelled) {
          return;
        }

        if (!accessToken) {
          console.error("[AuthProvider] token取得失敗", {
            authenticated: result.authenticated,
            accessToken: result.accessToken,
            hasClient: Boolean(client),
          });
        }

        setState({
          ready: true,
          usingSupabase: true,
          error: !accessToken
            ? `認証セッションの確立に失敗しました（auth:${result.authenticated}, token:${Boolean(result.accessToken)}, client:${Boolean(client)}）。再読み込みしてください。`
            : null,
          accessToken,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const msg = error instanceof Error ? error.message : "unknown";
        console.error("[AuthProvider] 初期化例外", error);
        setState({
          ready: true,
          usingSupabase: true,
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
          void (async () => {
            try {
              const fallbackToken = await ensureSupabaseAccessToken();
              if (!cancelled) {
                setState((current) => ({
                  ...current,
                  ready: true,
                  usingSupabase: true,
                  error: fallbackToken ? null : current.error,
                  accessToken: fallbackToken,
                }));
              }
            } catch (error) {
              if (!cancelled) {
                setState((current) => ({
                  ...current,
                  ready: true,
                  usingSupabase: true,
                  error: error instanceof Error ? error.message : "認証セッションの再確立に失敗しました。",
                  accessToken: null,
                }));
              }
            }
          })();
          return;
        }

        setState((current) => ({
          ...current,
          ready: true,
          usingSupabase: true,
          error: null,
          accessToken: session.access_token,
        }));
      }) ?? { data: { subscription: { unsubscribe() {} } } };

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthContext);
}
