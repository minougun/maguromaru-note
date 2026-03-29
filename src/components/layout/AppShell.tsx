"use client";

import { useAuthState } from "@/components/providers/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { ScreenState } from "@/components/ui/ScreenState";
import { TabBar } from "@/components/ui/TabBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();

  if (!auth.ready) {
    return (
      <div className="app-shell">
        <ScreenState description="認証情報を確認しています。" title="読み込み中" />
      </div>
    );
  }

  if (auth.error && auth.usingSupabase) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="screen-main">
          <ScreenState description={auth.error} title="認証エラー" />
        </main>
      </div>
    );
  }

  if (!auth.signedIn) {
    return (
      <div className="app-shell app-shell--login">
        <AppHeader />
        <main className="screen-main screen-main--login">
          <LoginScreen />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="screen-main">{children}</main>
      <TabBar />
    </div>
  );
}
