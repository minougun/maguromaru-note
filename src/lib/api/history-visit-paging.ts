import {
  HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE,
  HISTORY_SNAPSHOT_MAX_PAGE_SIZE,
  type AppSnapshotLoadOptions,
} from "@/lib/domain/snapshot-scope";

export type HistoryVisitPagingParamsSpec = {
  pageParam: string;
  sizeParam: string;
  invalidMessage: string;
};

/** `/api/app-snapshot?scope=history&…` 用クエリ名 */
export const historyPagingQueryAppSnapshot: HistoryVisitPagingParamsSpec = {
  pageParam: "history_visit_page",
  sizeParam: "history_visit_page_size",
  invalidMessage: "履歴のページ指定（history_visit_page / history_visit_page_size）が不正です。",
};

/** `/api/history-logs?…` 用クエリ名 */
export const historyPagingQueryHistoryLogs: HistoryVisitPagingParamsSpec = {
  pageParam: "page",
  sizeParam: "page_size",
  invalidMessage: "履歴のページ指定（page / page_size）が不正です。",
};

function parsePositiveInt(raw: string | null, fallback: number, max?: number): number | null {
  if (raw === null || raw === "") {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  if (max !== undefined && n > max) {
    return null;
  }
  return n;
}

/**
 * 履歴 API 共通のページ・ページサイズ解析（文字列数値・範囲外を拒否）。
 */
export function parseHistoryVisitPagingParams(
  searchParams: URLSearchParams,
  spec: HistoryVisitPagingParamsSpec,
): AppSnapshotLoadOptions | { error: string } {
  const pageRaw = searchParams.get(spec.pageParam);
  const sizeRaw = searchParams.get(spec.sizeParam);

  const page = parsePositiveInt(pageRaw, 1);
  const size = parsePositiveInt(sizeRaw, HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE, HISTORY_SNAPSHOT_MAX_PAGE_SIZE);
  if (page === null || size === null) {
    return { error: spec.invalidMessage };
  }

  return {
    historyVisitPage: page,
    historyVisitPageSize: size,
  };
}
