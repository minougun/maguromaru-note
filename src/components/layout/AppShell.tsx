"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { useAuthState } from "@/components/providers/AuthProvider";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { ScreenState } from "@/components/ui/ScreenState";
import { TabBar } from "@/components/ui/TabBar";
import { markOnboardingDone, readOnboardingDone } from "@/lib/onboarding-storage";

const OnboardingTutorial = dynamic(
  () => import("@/components/onboarding/OnboardingTutorial").then((m) => ({ default: m.OnboardingTutorial })),
  { ssr: false, loading: () => null },
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useLayoutEffect(() => {
    /* localStorage と認証状態の同期。ルールは意図的に抑止 */
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!auth.ready || !auth.signedIn) {
      setShowOnboarding(false);
      return;
    }
    setShowOnboarding(!readOnboardingDone());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [auth.ready, auth.signedIn]);

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
      {showOnboarding ? (
        <OnboardingTutorial
          onComplete={() => {
            markOnboardingDone();
            setShowOnboarding(false);
          }}
        />
      ) : null}
    </div>
  );
}
