/**
 * メイン下部タブ（順序は帯の左→右と一致させる）。
 * `a11yLabel`: リンクのスクリーンリーダー用。`stripLabel`: 帯上の短い表記。
 * `icon`: TabIcon コンポーネントに渡すアイコン名。
 * `emoji`: オンボーディング等フォールバック用。
 */
export const MAIN_NAV_TABS = [
  { href: "/", a11yLabel: "ホーム", stripLabel: "ホーム", icon: "home", emoji: "🏠" },
  { href: "/record", a11yLabel: "記録", stripLabel: "記録", icon: "record", emoji: "✏️" },
  { href: "/zukan", a11yLabel: "図鑑", stripLabel: "図鑑", icon: "zukan", emoji: "📖" },
  { href: "/quiz", a11yLabel: "クイズ", stripLabel: "クイズ", icon: "quiz", emoji: "🐟" },
  { href: "/titles", a11yLabel: "称号", stripLabel: "称号", icon: "titles", emoji: "🏅" },
] as const;

export type MainNavTab = (typeof MAIN_NAV_TABS)[number];
export type MainNavHref = MainNavTab["href"];
