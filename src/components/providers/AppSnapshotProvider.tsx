"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import type { AppSnapshot } from "@/lib/domain/types";
import { buildSupabaseAuthHeaders, readSupabaseAccessToken } from "@/lib/supabase/browser";

const SNAPSHOT_URL = "/api/app-snapshot";

/** 連携完了など、フックの外からスナップショット再取得を依頼するときに使う */
export const APP_SNAPSHOT_REFRESH_EVENT = "maguro-app-snapshot-refresh";

export function requestAppSnapshotRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_SNAPSHOT_REFRESH_EVENT));
  }
}

type AppSnapshotContextValue = {
  snapshot: AppSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const AppSnapshotContext = createContext<AppSnapshotContextValue | null>(null);

export function AppSnapshotProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!auth.ready) {
      return;
    }

    if (!auth.signedIn) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (auth.usingSupabase && !auth.accessToken) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function loadSnapshot() {
      setLoading(true);
      setError(null);

      const initialToken = auth.usingSupabase
        ? auth.accessToken ?? (await readSupabaseAccessToken())
        : auth.accessToken;

      const fetchInit = {
        cache: "no-store" as const,
        signal: abortController.signal,
        headers: buildSupabaseAuthHeaders(initialToken),
      };

      let response: Response;
      try {
        response = await fetch(SNAPSHOT_URL, fetchInit);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        throw err;
      }

      if (response.status === 401 && auth.usingSupabase) {
        const retryToken = await readSupabaseAccessToken();
        if (retryToken && retryToken !== initialToken) {
          try {
            response = await fetch(SNAPSHOT_URL, {
              ...fetchInit,
              headers: buildSupabaseAuthHeaders(retryToken),
            });
          } catch (err) {
            if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
              return;
            }
            throw err;
          }
        }
      }

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "データ取得に失敗しました。");
        setLoading(false);
        return;
      }

      const nextSnapshot = (await response.json()) as AppSnapshot;
      setSnapshot(nextSnapshot);
      setLoading(false);
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [auth.accessToken, auth.error, auth.ready, auth.signedIn, auth.usingSupabase, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const handler = () => {
      setRefreshToken((current) => current + 1);
    };
    window.addEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
    return () => window.removeEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
  }, []);

  const waitingForUserSession =
    auth.ready &&
    auth.usingSupabase &&
    auth.signedIn &&
    !auth.accessToken &&
    !auth.error;

  const value = useMemo<AppSnapshotContextValue>(
    () => ({
      snapshot,
      loading: waitingForUserSession ? true : loading,
      error: auth.error ?? error,
      refresh,
    }),
    [auth.error, error, loading, refresh, snapshot, waitingForUserSession],
  );

  return <AppSnapshotContext.Provider value={value}>{children}</AppSnapshotContext.Provider>;
}

/** ログイン後にフルスナップショットを1回取得し、アプリ全体で共有する。`scope` は互換のため受け取れるが無視される。 */
export function useAppSnapshot(_options?: { scope?: string }) {
  const ctx = useContext(AppSnapshotContext);
  if (!ctx) {
    throw new Error("useAppSnapshot は AppSnapshotProvider 内で使ってください。");
  }
  return ctx;
}
