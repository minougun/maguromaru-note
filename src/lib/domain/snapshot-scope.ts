/** 履歴スナップショットの既定ページサイズ（API・Provider で共有。サーバー側上限は別定数） */
export const HISTORY_SNAPSHOT_DEFAULT_PAGE_SIZE = 30;
export const HISTORY_SNAPSHOT_MAX_PAGE_SIZE = 100;

/** `getAppSnapshot` / `getHistoryVisitLogsPage` に渡す履歴ページング */
export type AppSnapshotLoadOptions = {
  historyVisitPage?: number;
  historyVisitPageSize?: number;
};

export const SNAPSHOT_SCOPES = ["full", "home", "history", "zukan", "record", "quiz", "mypage", "admin"] as const;

export type SnapshotScope = (typeof SNAPSHOT_SCOPES)[number];

/** `?scope=` のパース。不正なら null（ルートで 400） */
export function tryParseSnapshotScope(param: string | null): SnapshotScope | null {
  if (param === null || param === "" || param === "full") {
    return "full";
  }
  if ((SNAPSHOT_SCOPES as readonly string[]).includes(param)) {
    return param as SnapshotScope;
  }
  return null;
}

/**
 * `usePathname()` の値（basePath なし）からスナップショット scope を決める。
 * 未マッチ時はペイロード互換のため `full`。
 */
export function snapshotScopeForPathname(pathname: string | null | undefined): SnapshotScope {
  if (!pathname) {
    return "full";
  }
  const path = pathname.split("?")[0] ?? pathname;
  const normalized = path === "" ? "/" : path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

  switch (normalized) {
    case "/":
    case "/home":
      return "home";
    case "/history":
      return "history";
    case "/record":
      return "record";
    case "/zukan":
      return "zukan";
    case "/quiz":
      return "quiz";
    case "/titles":
    case "/mypage":
      return "mypage";
    case "/admin":
      return "admin";
    default:
      return "full";
  }
}
