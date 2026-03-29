/**
 * `public/` 配下の静的ファイル用 URL。
 * GitHub Pages 等で `basePath`（例: `/maguromaru-note`）を使うとき、
 * 先頭が `/` だけのパスだと画像が 404 になる。
 *
 * `NEXT_PUBLIC_*` は CI で未設定だとクライアントに埋め込まれないことがあるため、
 * Next が常に置き換える `__NEXT_ROUTER_BASEPATH`（= next.config の basePath）を優先する。
 */
export function publicPath(path: string): string {
  const fromRouter =
    typeof process.env.__NEXT_ROUTER_BASEPATH === "string"
      ? process.env.__NEXT_ROUTER_BASEPATH
      : "";
  const fromPublic = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const base = (fromRouter || fromPublic).replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
