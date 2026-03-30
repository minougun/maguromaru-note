"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TabIcon } from "@/components/ui/TabIcon";

export function AppHeaderAccountLink() {
  const pathname = usePathname() ?? "";
  const active = pathname === "/mypage";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="header-account-link"
      href="/mypage"
      prefetch={false}
    >
      <TabIcon className="header-account-link-icon" name="mypage" />
      <span className="header-account-link-text">アカウント連携</span>
    </Link>
  );
}
