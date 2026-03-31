"use client";

/**
 * `TunaMap` の再エクスポート。図鑑ルートは `zukan/page.tsx` で `ZukanScreen` を dynamic import し、
 * 初回チャンクを分割する。マップ本体は `memo`＋共有 reveal ビットマップ参照で描画コストを抑える。
 */
export { TunaMap as TunaMapDynamic } from "./TunaMap";
