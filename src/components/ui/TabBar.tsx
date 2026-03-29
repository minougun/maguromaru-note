"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TAB_STRIP_IMAGE_URL } from "@/lib/tabbar-strip";

const tabs = [
  { href: "/", label: "ホーム" },
  { href: "/record", label: "記録" },
  { href: "/zukan", label: "図鑑" },
  { href: "/quiz", label: "クイズ" },
  { href: "/titles", label: "称号" },
  { href: "/mypage", label: "アカウント連携" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインタブ"
      className="tab-bar"
      style={{
        backgroundImage: `url(${TAB_STRIP_IMAGE_URL})`,
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className="tab-link"
            data-active={active}
            href={tab.href}
            key={tab.href}
            prefetch={false}
          >
            <span className="tab-link-sr">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
