/** 下部タブ用: フラットな線画アイコン（currentColor で帯の色に追従） */
export function TabIcon({ name, className }: { name: string; className?: string }) {
  const size = 22;
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const base = {
    className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...base}>
          <path d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-5v-7h-4v7H4a1 1 0 01-1-1v-9.5z" {...s} />
        </svg>
      );
    case "record":
      return (
        <svg {...base}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" {...s} />
          <path d="M14 2v6h6" {...s} />
          <path d="M9 13h6M9 17h4" {...s} />
        </svg>
      );
    case "zukan":
      return (
        <svg {...base}>
          <path d="M4 4h16v16H4z" {...s} />
          <path d="M12 4v16" {...s} />
          <path d="M7 8h3.5M7 11h3.5M7 14h2.5" {...s} />
        </svg>
      );
    case "quiz":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="9" {...s} />
          <path d="M9.5 9.3c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5c0 1.2-.8 1.9-1.4 2.3-.5.4-.6.6-.6 1.2V14" {...s} />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "titles":
      return (
        <svg {...base}>
          <path
            d="M12 2.5l2.2 5.5 5.9.5-4.5 3.7 1.4 5.8L12 15.9 6.9 18l1.4-5.8L3.9 8.5l5.9-.5L12 2.5z"
            {...s}
          />
        </svg>
      );
    case "mypage":
      return (
        <svg {...base}>
          <circle cx="12" cy="9" r="3.5" {...s} />
          <path d="M6.5 19.2c0-3 2.6-5.4 5.5-5.4s5.5 2.4 5.5 5.4" {...s} />
        </svg>
      );
    default:
      return null;
  }
}
