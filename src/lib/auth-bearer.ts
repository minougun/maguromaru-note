/** Authorization ヘッダから Bearer トークンを取り出す（検証はしない）。 */
export function readBearerToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || undefined;
}
