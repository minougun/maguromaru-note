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
    <nav aria-label="メインタブ" className="tab-bar">
      <div className="tab-bar-strip">
        <div
          className="tab-bar-strip-bg"
          style={{
            backgroundImage: `url(${TAB_STRIP_IMAGE_URL})`,
          }}
        />
        <div className="tab-bar-strip-cells">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className="tab-link"
                href={tab.href}
                key={tab.href}
                prefetch={false}
              >
                <span className="tab-link-sr">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
