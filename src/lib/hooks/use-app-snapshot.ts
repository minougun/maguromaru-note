"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import type { SnapshotScope } from "@/lib/domain/snapshot-scope";
import type { AppSnapshot } from "@/lib/domain/types";
import { buildSupabaseAuthHeaders, readSupabaseAccessToken } from "@/lib/supabase/browser";

const SNAPSHOT_CLIENT_CACHE_TTL_MS = 25_000;

type SnapshotCacheEntry = {
  snapshot: AppSnapshot;
  expiresAt: number;
};

const snapshotClientCache = new Map<string, SnapshotCacheEntry>();

function clearAppSnapshotClientCache() {
  snapshotClientCache.clear();
}

function snapshotCacheKey(scope: SnapshotScope, token: string | null | undefined, snapshotUrl: string) {
  return `${snapshotUrl}\0${scope}\0${token ?? ""}`;
}

export function useAppSnapshot(options?: { scope?: SnapshotScope }) {
  const scope = options?.scope ?? "full";
  const auth = useAuthState();
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!auth.ready) {
      return;
    }

    if (!auth.signedIn) {
      return;
    }

    if (auth.usingSupabase && !auth.accessToken) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function loadSnapshot() {
      setError(null);

      const initialToken = auth.usingSupabase
        ? auth.accessToken ?? (await readSupabaseAccessToken())
        : auth.accessToken;

      const snapshotUrl =
        scope === "full" ? "/api/app-snapshot" : `/api/app-snapshot?scope=${encodeURIComponent(scope)}`;

      const cacheKey = snapshotCacheKey(scope, initialToken, snapshotUrl);
      const cached = snapshotClientCache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        if (!cancelled) {
          setSnapshot(cached.snapshot);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const fetchInit = {
        cache: "no-store" as const,
        signal: abortController.signal,
        headers: buildSupabaseAuthHeaders(initialToken),
      };

      let response: Response;
      try {
        response = await fetch(snapshotUrl, fetchInit);
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
            response = await fetch(snapshotUrl, {
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
      snapshotClientCache.set(cacheKey, {
        snapshot: nextSnapshot,
        expiresAt: Date.now() + SNAPSHOT_CLIENT_CACHE_TTL_MS,
      });
      setSnapshot(nextSnapshot);
      setLoading(false);
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [auth.accessToken, auth.error, auth.ready, auth.signedIn, auth.usingSupabase, refreshToken, scope]);

  const refresh = useCallback(() => {
    clearAppSnapshotClientCache();
    setRefreshToken((current) => current + 1);
  }, []);

  const waitingForUserSession =
    auth.ready &&
    auth.usingSupabase &&
    auth.signedIn &&
    !auth.accessToken &&
    !auth.error;
  const loadingState = waitingForUserSession ? true : loading;

  return {
    snapshot,
    loading: loadingState,
    error: auth.error ?? error,
    refresh,
  };
}
