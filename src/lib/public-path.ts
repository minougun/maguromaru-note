/**
 * `public/` 配下の静的ファイル用 URL。
 * GitHub Pages 等で `basePath`（例: `/maguromaru-note`）を使うとき、
 * 先頭が `/` だけのパスだと画像が 404 になるため、`NEXT_PUBLIC_BASE_PATH` を前置する。
 */
export function publicPath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
