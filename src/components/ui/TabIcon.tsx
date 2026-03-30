/** 塗りつぶしベースのカラフルタブアイコン（スクショ準拠） */
export function TabIcon({ name, className }: { name: string; className?: string }) {
  const size = 22;
  const base = { className, width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };

  switch (name) {
    /* ホーム: 暖色系（茶〜オレンジ） */
    case "home":
      return (
        <svg {...base}>
          <path d="M12 3L2 12h3v8a1 1 0 001 1h12a1 1 0 001-1v-8h3L12 3z" fill="#c8875a" />
          <path d="M10 21v-6h4v6" fill="#8b5e3c" />
          <rect x="10.5" y="10" width="3" height="3" rx=".5" fill="#f5d78e" />
        </svg>
      );
    /* 記録: 黄〜オレンジ鉛筆 */
    case "record":
      return (
        <svg {...base}>
          <path d="M4.5 19.5l1-4L17 4a1.5 1.5 0 112 2L7.5 17.5l-3 2z" fill="#f0c040" />
          <path d="M4.5 19.5l1-4 3 3-4 1z" fill="#e88e3c" />
          <path d="M17 4l2 2 1.5-1.5a1.4 1.4 0 00-2-2L17 4z" fill="#e86040" />
        </svg>
      );
    /* 図鑑: 緑系の本 */
    case "zukan":
      return (
        <svg {...base}>
          <path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 16.5v-12z" fill="#4a9e6e" />
          <path d="M4 16.5A2.5 2.5 0 016.5 17H20v4H6.5A2.5 2.5 0 014 18.5v-2z" fill="#3b7d56" />
          <rect x="8" y="6" width="8" height="1.5" rx=".5" fill="#d4eedd" />
          <rect x="8" y="10" width="5" height="1.5" rx=".5" fill="#d4eedd" />
        </svg>
      );
    /* クイズ: 水色の魚 */
    case "quiz":
      return (
        <svg {...base}>
          <ellipse cx="11" cy="12" rx="7" ry="5" fill="#5ca8c8" />
          <path d="M18 12l4-4v8l-4-4z" fill="#5ca8c8" />
          <path d="M5 10.5c1.5-1.5 4-2.5 6.5-2.5" stroke="#3d7a9e" strokeWidth="1" fill="none" />
          <circle cx="7.5" cy="11" r="1" fill="#1b3a50" />
          <path d="M4 12.5c.3.3 1 .5 1.5.2" stroke="#3d7a9e" strokeWidth=".8" fill="none" />
        </svg>
      );
    /* 称号: ゴールドメダル */
    case "titles":
      return (
        <svg {...base}>
          <path d="M8 2h3l1 3-2.5 2L7 5.5 8 2z" fill="#d4a030" />
          <path d="M16 2h-3l-1 3 2.5 2L17 5.5 16 2z" fill="#c89028" />
          <circle cx="12" cy="14" r="6" fill="#e8b830" />
          <circle cx="12" cy="14" r="4" fill="#d4a030" />
          <path d="M10.5 13l1 1.5 2-3" stroke="#f5e8a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    /* マイページ: 青系のユーザー */
    case "mypage":
      return (
        <svg {...base}>
          <circle cx="12" cy="8" r="4.5" fill="#4a90c8" />
          <path d="M4 21c0-3.5 3.6-6.5 8-6.5s8 3 8 6.5" fill="#4a90c8" />
        </svg>
      );
    default:
      return null;
  }
}
