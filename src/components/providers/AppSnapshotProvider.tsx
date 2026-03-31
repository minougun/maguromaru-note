"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import type { AppSnapshot } from "@/lib/domain/types";
import { withAppBasePath } from "@/lib/public-path";
import { buildSupabaseAuthHeaders, readSupabaseAccessToken } from "@/lib/supabase/browser";

type SnapshotCacheEntry = {
  snapshot: AppSnapshot;
  fetchedAt: number;
};

function readSnapshotStaleMs(): number {
  const raw = process.env.NEXT_PUBLIC_APP_SNAPSHOT_STALE_MS?.trim();
  if (!raw) {
    return 45_000;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 5_000 || n > 600_000) {
    return 45_000;
  }
  return n;
}

const SNAPSHOT_STALE_MS = readSnapshotStaleMs();

const SNAPSHOT_FETCH_MAX_ATTEMPTS = 3;
const SNAPSHOT_FETCH_RETRY_BASE_MS = 400;

/** オフライン・一時的なネットワーク失敗向けに短い間隔で再試行（Abort は即中断）。 */
async function fetchWithNetworkRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SNAPSHOT_FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      lastError = err;
      if (attempt < SNAPSHOT_FETCH_MAX_ATTEMPTS - 1) {
        await new Promise((r) =>
          setTimeout(r, SNAPSHOT_FETCH_RETRY_BASE_MS * (attempt + 1)),
        );
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("network");
}

/** タブ共通の一括スナップショット（`scope=full`）。タブ切替では再フェッチしない。 */
function buildFullSnapshotRequestUrl(): string {
  const params = new URLSearchParams();
  params.set("scope", "full");
  return `${withAppBasePath("/api/app-snapshot")}?${params.toString()}`;
}

function isFreshEntry(entry: SnapshotCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < SNAPSHOT_STALE_MS;
}

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

  const fullSnapshotCacheRef = useRef<SnapshotCacheEntry | null>(null);

  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    fullSnapshotCacheRef.current = null;
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const handler = () => {
      fullSnapshotCacheRef.current = null;
      setRefreshToken((current) => current + 1);
    };
    window.addEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
    return () => window.removeEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
  }, []);

  /** ログイン後は常に同一の full キャッシュを表示。未取得時のみローディング。 */
  useLayoutEffect(() => {
    if (!auth.ready) {
      return;
    }

    if (!auth.signedIn) {
      fullSnapshotCacheRef.current = null;
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (auth.usingSupabase && !auth.accessToken) {
      return;
    }

    const hit = fullSnapshotCacheRef.current;
    if (hit) {
      setSnapshot(hit.snapshot);
      setError(null);
      setLoading(false);
    } else {
      setSnapshot(null);
      setLoading(true);
      setError(null);
    }
  }, [auth.accessToken, auth.ready, auth.signedIn, auth.usingSupabase, refreshToken]);

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

    const entry = fullSnapshotCacheRef.current;
    if (entry && isFreshEntry(entry)) {
      return;
    }

    const hadCache = Boolean(entry);
    const blockingLoad = !hadCache;

    let cancelled = false;
    const abortController = new AbortController();
    const snapshotUrl = buildFullSnapshotRequestUrl();

    async function loadFullSnapshot() {
      try {
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
          response = await fetchWithNetworkRetry(snapshotUrl, fetchInit);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          throw new Error("network");
        }

        if (response.status === 401 && auth.usingSupabase) {
          const retryToken = await readSupabaseAccessToken();
          if (retryToken && retryToken !== initialToken) {
            try {
              response = await fetchWithNetworkRetry(snapshotUrl, {
                ...fetchInit,
                headers: buildSupabaseAuthHeaders(retryToken),
              });
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError") {
                return;
              }
              throw new Error("network");
            }
          }
        }

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          if (blockingLoad) {
            setError(payload?.error ?? "データ取得に失敗しました。");
          }
          return;
        }

        const nextSnapshot = (await response.json().catch(() => null)) as AppSnapshot | null;
        if (!nextSnapshot) {
          if (blockingLoad) {
            setError("データの形式が不正です。");
          }
          return;
        }

        fullSnapshotCacheRef.current = { snapshot: nextSnapshot, fetchedAt: Date.now() };
        setSnapshot(nextSnapshot);
        setError(null);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        if (blockingLoad && !cancelled) {
          setError("通信に失敗しました。ネットワークを確認してください。");
        }
      } finally {
        if (!cancelled && blockingLoad) {
          setLoading(false);
        }
      }
    }

    void loadFullSnapshot();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [auth.accessToken, auth.error, auth.ready, auth.signedIn, auth.usingSupabase, refreshToken]);

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

/** ログイン後に `scope=full` で一度だけまとめて取得し、全タブで共有する。 */
export function useAppSnapshot() {
  const ctx = useContext(AppSnapshotContext);
  if (!ctx) {
    throw new Error("useAppSnapshot は AppSnapshotProvider 内で使ってください。");
  }
  return ctx;
}
