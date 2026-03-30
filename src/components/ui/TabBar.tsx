"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TabIcon } from "@/components/ui/TabIcon";
import { useTabBarScrollVisibility } from "@/lib/hooks/use-tab-bar-scroll-visibility";
import { MAIN_NAV_TABS } from "@/lib/main-tabs";

type TabBarProps = {
  scrollRoot: HTMLElement | null;
};

export function TabBar({ scrollRoot }: TabBarProps) {
  const pathname = usePathname();
  const tabBarVisible = useTabBarScrollVisibility(scrollRoot, pathname);

  return (
    <nav
      aria-label="メインタブ"
      className={`tab-bar${tabBarVisible ? "" : " tab-bar--scroll-hidden"}`}
    >
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
                <TabIcon className="tab-link-icon" name={tab.icon} />
                <span className="tab-link-label">{tab.stripLabel}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
