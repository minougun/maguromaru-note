"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SettingsGearIcon } from "@/components/ui/SettingsGearIcon";

export function AppHeaderAccountLink() {
  const pathname = usePathname() ?? "";
  const active = pathname === "/mypage";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label="設定"
      className="header-account-link"
      href="/mypage"
      prefetch={false}
    >
      <SettingsGearIcon className="header-account-link-icon" size={24} />
    </Link>
  );
}
