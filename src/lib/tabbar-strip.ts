import { publicPath } from "@/lib/public-path";

/**
 * 下部タブ帯 PNG（430×75、実アプリ `TabBar`・`OnboardingDeviceMock` 共通）。
 * クエリは CDN / ブラウザキャッシュ避け用（画像差し替え時に更新する）。
 */
export const TAB_STRIP_IMAGE_URL = `${publicPath("/tabbar/bottom-tabs.png")}?v=5`;
