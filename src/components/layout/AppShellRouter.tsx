"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";

/**
 * モック撮影用ルートは認証ゲートを通さずページだけ描画する（AppShell は children を握りつぶすため）。
 * 本番ではサーバー側で /dev/onboarding-mock-capture が 404 になるため外部公開されない。
 */
export function AppShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/dev/onboarding-mock-capture")) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
