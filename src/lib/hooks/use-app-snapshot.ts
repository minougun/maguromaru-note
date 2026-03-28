"use client";

import { useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import type { AppSnapshot } from "@/lib/domain/types";
import { buildSupabaseAuthHeaders } from "@/lib/supabase/browser";

export function useAppSnapshot() {
  const auth = useAuthState();
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!auth.ready) {
      return;
    }

    if (auth.usingSupabase && !auth.accessToken) {
      if (auth.error) {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function loadSnapshot() {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/app-snapshot", {
        cache: "no-store",
        headers: buildSupabaseAuthHeaders(auth.accessToken),
      });
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
  }, [auth.accessToken, auth.error, auth.ready, auth.usingSupabase, refreshToken]);

  function refresh() {
    setRefreshToken((current) => current + 1);
  }

  return {
    snapshot,
    loading,
    error: auth.error ?? error,
    refresh,
  };
}
