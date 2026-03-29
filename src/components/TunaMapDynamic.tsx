"use client";

import dynamic from "next/dynamic";

/**
 * 図鑑の SVG マップは重いため、/zukan 表示時のみ読み込む。
 */
export const TunaMapDynamic = dynamic(
  () => import("./TunaMap").then((mod) => ({ default: mod.TunaMap })),
  {
    ssr: false,
    loading: () => <p className="helper-text map-loading-hint">部位マップを読み込み中…</p>,
  },
);
