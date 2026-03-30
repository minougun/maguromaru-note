import { publicPath } from "@/lib/public-path";

/**
 * 下部タブ帯（430×75 SVG、実アプリ `TabBar`・`OnboardingDeviceMock` 共通）。
 * 中立デザイン（どのタブも未選択トーン）。選択表示は CSS グロー。
 * クエリは CDN / ブラウザキャッシュ避け用（差し替え時に更新する）。
 */
export const TAB_STRIP_IMAGE_URL = `${publicPath("/tabbar/bottom-tabs.svg")}?v=7`;
