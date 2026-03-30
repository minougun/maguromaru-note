"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAIN_NAV_TABS } from "@/lib/main-tabs";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="メインタブ" className="tab-bar">
      <div className="tab-bar-strip">
        {MAIN_NAV_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={tab.a11yLabel}
              className="tab-link"
              href={tab.href}
              key={tab.href}
              prefetch={false}
            >
              <span aria-hidden="true" className="tab-link-stack">
                <span className="tab-link-emoji">{tab.emoji}</span>
                <span className="tab-link-label">{tab.stripLabel}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
