"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import { snapshotScopeForPathname, type SnapshotScope } from "@/lib/domain/snapshot-scope";
import type { AppSnapshot } from "@/lib/domain/types";
import { withAppBasePath } from "@/lib/public-path";
import { buildSupabaseAuthHeaders, readSupabaseAccessToken } from "@/lib/supabase/browser";

type SnapshotCacheEntry = {
  snapshot: AppSnapshot;
  fetchedAt: number;
};

export type SnapshotRefreshTarget = "all" | "current" | SnapshotScope | readonly SnapshotScope[];

type SnapshotRefreshEventDetail = {
  target?: SnapshotRefreshTarget;
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
        await new Promise((r) => setTimeout(r, SNAPSHOT_FETCH_RETRY_BASE_MS * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("network");
}

function buildSnapshotRequestUrl(scope: SnapshotScope): string {
  const params = new URLSearchParams();
  params.set("scope", scope);
  return `${withAppBasePath("/api/app-snapshot")}?${params.toString()}`;
}

function isFreshEntry(entry: SnapshotCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < SNAPSHOT_STALE_MS;
}

function normalizedRefreshTarget(
  target: SnapshotRefreshTarget | undefined,
  currentScope: SnapshotScope,
): "all" | SnapshotScope[] {
  if (!target || target === "current") {
    return [currentScope];
  }
  if (target === "all") {
    return "all";
  }
  if (Array.isArray(target)) {
    return [...new Set(target)] as SnapshotScope[];
  }
  return [target as SnapshotScope];
}

function invalidateSnapshotCache(
  cache: Map<SnapshotScope, SnapshotCacheEntry>,
  target: SnapshotRefreshTarget | undefined,
  currentScope: SnapshotScope,
) {
  const normalized = normalizedRefreshTarget(target, currentScope);
  if (normalized === "all") {
    cache.clear();
    return;
  }

  for (const scope of normalized) {
    cache.delete(scope);
  }
}

export const APP_SNAPSHOT_REFRESH_EVENT = "maguro-app-snapshot-refresh";

export function requestAppSnapshotRefresh(target: SnapshotRefreshTarget = "all") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<SnapshotRefreshEventDetail>(APP_SNAPSHOT_REFRESH_EVENT, {
        detail: { target },
      }),
    );
  }
}

type AppSnapshotContextValue = {
  snapshot: AppSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: (target?: SnapshotRefreshTarget) => void;
};

const AppSnapshotContext = createContext<AppSnapshotContextValue | null>(null);

export function AppSnapshotProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const pathname = usePathname();
  const currentScope = useMemo(() => snapshotScopeForPathname(pathname), [pathname]);

  const snapshotCacheRef = useRef<Map<SnapshotScope, SnapshotCacheEntry>>(new Map());
  const snapshotRef = useRef<AppSnapshot | null>(null);

  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const refresh = useCallback(
    (target: SnapshotRefreshTarget = "current") => {
      invalidateSnapshotCache(snapshotCacheRef.current, target, currentScope);
      setRefreshToken((current) => current + 1);
    },
    [currentScope],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SnapshotRefreshEventDetail>;
      invalidateSnapshotCache(snapshotCacheRef.current, customEvent.detail?.target, currentScope);
      setRefreshToken((current) => current + 1);
    };
    window.addEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
    return () => window.removeEventListener(APP_SNAPSHOT_REFRESH_EVENT, handler);
  }, [currentScope]);

  useEffect(() => {
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

    const hit = snapshotCacheRef.current.get(currentScope);
    if (hit) {
      setSnapshot(hit.snapshot);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(snapshotRef.current == null);
    setError(null);
  }, [auth.accessToken, auth.ready, auth.signedIn, auth.usingSupabase, currentScope, refreshToken]);

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

    const entry = snapshotCacheRef.current.get(currentScope);
    if (entry && isFreshEntry(entry)) {
      return;
    }

    const blockingLoad = !entry && snapshotRef.current == null;
    let cancelled = false;
    const abortController = new AbortController();
    const snapshotUrl = buildSnapshotRequestUrl(currentScope);

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

        snapshotCacheRef.current.set(currentScope, {
          snapshot: nextSnapshot,
          fetchedAt: Date.now(),
        });
        setSnapshot(nextSnapshot);
        setError(null);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        if (blockingLoad) {
          setError("通信に失敗しました。ネットワークを確認してください。");
        }
      } finally {
        if (!cancelled && blockingLoad) {
          setLoading(false);
        }
      }
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [auth.accessToken, auth.error, auth.ready, auth.signedIn, auth.usingSupabase, currentScope, refreshToken]);

  const waitingForUserSession =
    auth.ready && auth.usingSupabase && auth.signedIn && !auth.accessToken && !auth.error;

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

export function useAppSnapshot() {
  const ctx = useContext(AppSnapshotContext);
  if (!ctx) {
    throw new Error("useAppSnapshot は AppSnapshotProvider 内で使ってください。");
  }
  return ctx;
}
