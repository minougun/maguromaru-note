/** Authorization ヘッダから Bearer トークンを取り出す（検証はしない）。 */
export function readBearerToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || undefined;
}

/**
 * JWT の payload.sub を検証なしで取り出す（レート制限キー用）。
 * 改ざんされたトークンは下流の Supabase で弾かれる前提。
 */
export function tryJwtSubFromAuthHeader(authorizationHeader: string | null): string | null {
  const token = readBearerToken(authorizationHeader);
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { sub?: unknown };
    if (typeof payload.sub === "string" && payload.sub.length > 0) {
      return payload.sub;
    }
  } catch {
    return null;
  }

  return null;
}
