"use client";

import { usePathname } from "next/navigation";
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
import {
  HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE,
  snapshotScopeForPathname,
} from "@/lib/domain/snapshot-scope";
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

function buildSnapshotRequestUrl(pathname: string | null): string {
  const scope = snapshotScopeForPathname(pathname);
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (scope === "history") {
    params.set("history_visit_page", "1");
    params.set("history_visit_page_size", String(HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE));
  }
  return `${withAppBasePath("/api/app-snapshot")}?${params.toString()}`;
}

function snapshotCacheKey(pathname: string | null): string {
  const scope = snapshotScopeForPathname(pathname);
  if (scope === "history") {
    return `${scope}:p1:s${HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE}`;
  }
  return scope;
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
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const snapshotCacheRef = useRef(new Map<string, SnapshotCacheEntry>());

  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    snapshotCacheRef.current.clear();
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const handler = () => {
      snapshotCacheRef.current.clear();
      setRefreshToken((current) => current + 1);
    };
    window.addEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
    return () => window.removeEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
  }, []);

  /** タブ切り替え直後に前画面のスナップショットが見えないよう、描画前にキャッシュ反映またはクリア */
  useLayoutEffect(() => {
    if (!auth.ready) {
      return;
    }

    if (!auth.signedIn) {
      snapshotCacheRef.current.clear();
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (auth.usingSupabase && !auth.accessToken) {
      return;
    }

    const key = snapshotCacheKey(pathname);
    const hit = snapshotCacheRef.current.get(key);
    if (hit) {
      setSnapshot(hit.snapshot);
      setError(null);
      setLoading(false);
    } else {
      setSnapshot(null);
      setLoading(true);
      setError(null);
    }
  }, [auth.accessToken, auth.ready, auth.signedIn, auth.usingSupabase, pathname, refreshToken]);

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

    const key = snapshotCacheKey(pathname);
    const entry = snapshotCacheRef.current.get(key);

    if (entry && isFreshEntry(entry)) {
      return;
    }

    const hadCache = Boolean(entry);
    const blockingLoad = !hadCache;

    let cancelled = false;
    const abortController = new AbortController();
    const snapshotUrl = buildSnapshotRequestUrl(pathname);

    async function loadSnapshot() {
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
          response = await fetch(snapshotUrl, fetchInit);
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
              response = await fetch(snapshotUrl, {
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

        snapshotCacheRef.current.set(key, { snapshot: nextSnapshot, fetchedAt: Date.now() });

        if (snapshotCacheKey(pathnameRef.current) === key) {
          setSnapshot(nextSnapshot);
          setError(null);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        if (blockingLoad && !cancelled) {
          setError("通信に失敗しました。ネットワークを確認してください。");
        }
      } finally {
        if (!cancelled && blockingLoad && snapshotCacheKey(pathnameRef.current) === key) {
          setLoading(false);
        }
      }
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [auth.accessToken, auth.error, auth.ready, auth.signedIn, auth.usingSupabase, pathname, refreshToken]);

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

/** ログイン後にスナップショットを取得し共有する。`scope` は現在のパスから自動決定（`/api/app-snapshot?scope=`）。 */
export function useAppSnapshot() {
  const ctx = useContext(AppSnapshotContext);
  if (!ctx) {
    throw new Error("useAppSnapshot は AppSnapshotProvider 内で使ってください。");
  }
  return ctx;
}
