"use client";

import dynamic from "next/dynamic";

/**
 * ShareModal + ShareCanvas を初回シェア操作までバンドルから外し、初期ロードを軽くする。
 */
export const ShareModalDynamic = dynamic(
  () => import("./ShareModal").then((mod) => ({ default: mod.ShareModal })),
  { ssr: false, loading: () => null },
);
