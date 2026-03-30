"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TabBarStripDecoration } from "@/components/ui/TabBarStripDecoration";
import { MAIN_NAV_TABS } from "@/lib/main-tabs";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="メインタブ" className="tab-bar">
      <div className="tab-bar-strip">
        <div className="tab-bar-strip-bg" aria-hidden="true">
          <TabBarStripDecoration />
        </div>
        <div className="tab-bar-strip-cells">
          {MAIN_NAV_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className="tab-link"
                href={tab.href}
                key={tab.href}
                prefetch={false}
              >
                <span className="tab-link-sr">{tab.a11yLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
