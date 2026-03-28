"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { ensureAnonymousSupabaseSession } from "@/lib/supabase/browser";

interface AuthContextValue {
  ready: boolean;
  usingSupabase: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  ready: false,
  usingSupabase: false,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    ready: false,
    usingSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const result = await ensureAnonymousSupabaseSession();
        if (cancelled) {
          return;
        }
        setState({
          ready: true,
          usingSupabase: result.authenticated,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          ready: true,
          usingSupabase: false,
          error: error instanceof Error ? error.message : "認証初期化に失敗しました。",
        });
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthContext);
}
