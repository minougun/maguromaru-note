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
