"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import type { SnapshotScope } from "@/lib/domain/snapshot-scope";
import type { AppSnapshot } from "@/lib/domain/types";
import { buildSupabaseAuthHeaders, readSupabaseAccessToken } from "@/lib/supabase/browser";

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

    async function loadSnapshot() {
      setLoading(true);
      setError(null);

      const initialToken = auth.usingSupabase
        ? auth.accessToken ?? (await readSupabaseAccessToken())
        : auth.accessToken;

      const snapshotUrl =
        scope === "full" ? "/api/app-snapshot" : `/api/app-snapshot?scope=${encodeURIComponent(scope)}`;

      let response = await fetch(snapshotUrl, {
        cache: "no-store",
        headers: buildSupabaseAuthHeaders(initialToken),
      });

      if (response.status === 401 && auth.usingSupabase) {
        const retryToken = await readSupabaseAccessToken();
        if (retryToken && retryToken !== initialToken) {
          response = await fetch(snapshotUrl, {
            cache: "no-store",
            headers: buildSupabaseAuthHeaders(retryToken),
          });
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
    };
  }, [auth.accessToken, auth.error, auth.ready, auth.signedIn, auth.usingSupabase, refreshToken, scope]);

  const refresh = useCallback(() => {
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
