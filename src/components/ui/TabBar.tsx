"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/record", label: "記録", icon: "✏️" },
  { href: "/zukan", label: "図鑑", icon: "📖" },
  { href: "/mypage", label: "マイページ", icon: "👤" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar" aria-label="メインタブ">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link className="tab-link" data-active={active} href={tab.href} key={tab.href}>
            <span aria-hidden="true" className="tab-icon">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
