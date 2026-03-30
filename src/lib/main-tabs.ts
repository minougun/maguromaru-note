/**
 * メイン下部タブ（順序は帯の左→右と一致させる）。
 * `a11yLabel`: リンクのスクリーンリーダー用。`stripLabel`: 帯上の短い表記。
 * `emoji`: 実機タブ帯とオンボーディング内モックで共通（1 か所の定義）。
 */
export const MAIN_NAV_TABS = [
  { href: "/", a11yLabel: "ホーム", stripLabel: "ホーム", emoji: "🏠" },
  { href: "/record", a11yLabel: "記録", stripLabel: "記録", emoji: "✏️" },
  { href: "/zukan", a11yLabel: "図鑑", stripLabel: "図鑑", emoji: "📖" },
  { href: "/quiz", a11yLabel: "クイズ", stripLabel: "クイズ", emoji: "🐟" },
  { href: "/titles", a11yLabel: "称号", stripLabel: "称号", emoji: "🏅" },
  { href: "/mypage", a11yLabel: "アカウント連携", stripLabel: "マイページ", emoji: "👤" },
] as const;

export type MainNavTab = (typeof MAIN_NAV_TABS)[number];
export type MainNavHref = MainNavTab["href"];
