"use client";

import { useAuthState } from "@/components/providers/AuthProvider";
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
        <header className="app-header">
          <div className="header-row">
            <div className="logo-mark">
              まぐろ
              <br />
              丸
            </div>
            <div>
              <h1 className="header-title">まぐろ丸ノート</h1>
              <p className="header-subtitle">海鮮丼まぐろ丸 ── 本町</p>
            </div>
          </div>
          <div className="accent-line" aria-hidden="true" />
        </header>
        <main className="screen-main">
          <ScreenState description={auth.error} title="認証エラー" />
        </main>
      </div>
    );
  }

  if (!auth.signedIn) {
    return (
      <div className="app-shell app-shell--login">
        <main className="screen-main screen-main--login">
          <LoginScreen />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div className="logo-mark">
            まぐろ
            <br />
            丸
          </div>
          <div>
            <h1 className="header-title">まぐろ丸ノート</h1>
            <p className="header-subtitle">海鮮丼まぐろ丸 ── 本町</p>
          </div>
        </div>
        <div className="accent-line" aria-hidden="true" />
      </header>
      <main className="screen-main">{children}</main>
      <TabBar />
    </div>
  );
}
