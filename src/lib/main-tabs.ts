/**
 * メイン下部タブ（順序は帯の左→右と一致させる）。
 * `a11yLabel`: リンクのスクリーンリーダー用。`stripLabel`: 帯上の短い表記。
 */
export const MAIN_NAV_TABS = [
  { href: "/", a11yLabel: "ホーム", stripLabel: "ホーム" },
  { href: "/record", a11yLabel: "記録", stripLabel: "記録" },
  { href: "/zukan", a11yLabel: "図鑑", stripLabel: "図鑑" },
  { href: "/quiz", a11yLabel: "クイズ", stripLabel: "クイズ" },
  { href: "/titles", a11yLabel: "称号", stripLabel: "称号" },
  { href: "/mypage", a11yLabel: "アカウント連携", stripLabel: "マイページ" },
] as const;

export type MainNavTab = (typeof MAIN_NAV_TABS)[number];
export type MainNavHref = MainNavTab["href"];
