"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { useAuthState } from "@/components/providers/AuthProvider";
import { useUiPreferences } from "@/components/providers/UiPreferencesProvider";
import { ScreenState } from "@/components/ui/ScreenState";
import { TabBar } from "@/components/ui/TabBar";
import { markOnboardingDone, readOnboardingDone } from "@/lib/onboarding-storage";

const LoginScreen = dynamic(
  () => import("@/components/screens/LoginScreen").then((m) => ({ default: m.LoginScreen })),
  {
    loading: () => <ScreenState description="ログイン画面を読み込んでいます。" title="読み込み中" />,
  },
);

const OnboardingTutorial = dynamic(
  () => import("@/components/onboarding/OnboardingTutorial").then((m) => ({ default: m.OnboardingTutorial })),
  { ssr: false, loading: () => null },
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const { preferences } = useUiPreferences();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [scrollMainEl, setScrollMainEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
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
      <div className="app-shell" data-ui-density={preferences.density} data-ui-text-size={preferences.textSize}>
        <ScreenState description="認証情報を確認しています。" title="読み込み中" />
      </div>
    );
  }

  if (auth.error && auth.usingSupabase) {
    return (
      <div className="app-shell" data-ui-density={preferences.density} data-ui-text-size={preferences.textSize}>
        <AppHeader />
        <main className="screen-main">
          <ScreenState description={auth.error} title="認証エラー" />
        </main>
      </div>
    );
  }

  if (!auth.signedIn) {
    return <LoginShell />;
  }

  return (
    <div className="app-shell" data-ui-density={preferences.density} data-ui-text-size={preferences.textSize}>
      <AppHeader />
      <main className="screen-main" ref={setScrollMainEl}>
        {children}
      </main>
      <TabBar scrollRoot={scrollMainEl} />
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

/** ログイン画面：GIF アニメ完了後にタイトル＋ボタンを同時フェードイン */
function LoginShell() {
  const [revealed, setRevealed] = useState(false);
  const onAnimationEnd = useCallback(() => setRevealed(true), []);
  const { preferences } = useUiPreferences();

  return (
    <div className="app-shell app-shell--login" data-ui-density={preferences.density} data-ui-text-size={preferences.textSize}>
      <main className="screen-main screen-main--login">
        <LoginScreen onAnimationEnd={onAnimationEnd} revealed={revealed} />
      </main>
    </div>
  );
}
