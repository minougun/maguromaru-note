"use client";

/**
 * 以前は `next/dynamic` で遅延読み込みしていたが、クライアントのチャンクキャッシュで
 * マップ修正が反映されない報告があったため、通常の再 export に変更した。
 * 図鑑は `ZukanScreen` から `TunaMap` を直接 import している。
 */
export { TunaMap as TunaMapDynamic } from "./TunaMap";
