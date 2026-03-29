"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ZodError } from "zod";

import { AccountLinkSection, isProviderLinked } from "@/components/mypage/AccountLinkSection";
import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildMyPageSummary } from "@/lib/mypage";
import {
  type BrowserAuthProfile,
  getSupabaseAuthProfile,
  requestPhoneLinkSms,
  signOutSupabase,
  startAppleLinkFlow,
  startGoogleLinkFlow,
  verifyPhoneLinkOtp,
} from "@/lib/supabase/browser";
import { formatCount } from "@/lib/utils/format";

function profileErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "入力が不正です。";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "処理に失敗しました。";
}

export function MyPageScreen() {
  const router = useRouter();
  const auth = useAuthState();
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [profile, setProfile] = useState<BrowserAuthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [phoneE164, setPhoneE164] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"idle" | "sent">("idle");
  const [phonePanelOpen, setPhonePanelOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!auth.usingSupabase) {
      return;
    }
    setProfileLoading(true);
    setLinkError(null);
    try {
      const next = await getSupabaseAuthProfile();
      setProfile(next);
    } catch (err) {
      setLinkError(profileErrorMessage(err));
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [auth.usingSupabase]);

  useEffect(() => {
    const authResult = new URLSearchParams(window.location.search).get("auth");
    if (authResult === "linked") {
      setLinkNotice("アカウント連携が完了しました。");
      setLinkError(null);
      window.history.replaceState({}, "", window.location.pathname);
      void loadProfile();
      void refresh();
      return;
    }
    if (authResult === "error") {
      setLinkError("認証のコールバックに失敗しました。");
    }
  }, [loadProfile, refresh]);

  useEffect(() => {
    if (!auth.usingSupabase || !auth.accessToken) {
      return;
    }
    void loadProfile();
  }, [auth.accessToken, auth.usingSupabase, loadProfile]);

  useEffect(() => {
    if (profile && isProviderLinked(profile, "phone")) {
      setPhonePanelOpen(false);
    }
  }, [profile]);

  if (loading) {
    return <ScreenState description="マイページを読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "マイページを表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  const summary = buildMyPageSummary(snapshot);
  const currentTitle = summary.currentTitle;
  const heroTitle = currentTitle?.name ?? "まだ称号なし";
  const heroIcon = currentTitle?.icon ?? "🔒";
  const heroSubline =
    currentTitle === null
      ? "来店とクイズで称号を解放"
      : `来店 ${formatCount(summary.visitCount)}回 ・ ${summary.collectedCount}部位コンプ`;

  return (
    <>
      <NorenBanner label="マイページ" />

      <Card className="mypage-hero-card" glow>
        <div className="mypage-hero-emblem">
          <div className="mypage-hero-icon">{heroIcon}</div>
        </div>
        <h2 className="mypage-hero-title">{heroTitle}</h2>
        <p className="mypage-hero-sub">{heroSubline}</p>
      </Card>

      <div className="stats-grid mypage-stats-grid">
        <div className="stat-cell mypage-stat-cell">
          <div className="mypage-stat-value">
            <span className="stat-num">{formatCount(summary.visitCount)}</span>
            <span className="mypage-stat-unit">回</span>
          </div>
          <div className="stat-label">来店回数</div>
        </div>
        <div className="stat-cell mypage-stat-cell">
          <div className="mypage-stat-value">
            <span className="stat-num">{summary.collectedCount}</span>
            <span className="mypage-stat-unit">種</span>
          </div>
          <div className="stat-label">食べた部位</div>
        </div>
        <div className="stat-cell mypage-stat-cell">
          <div className="mypage-stat-value">
            <span className="stat-num">{summary.streakWeeks}</span>
            <span className="mypage-stat-unit">週</span>
          </div>
          <div className="stat-label">連続来店</div>
        </div>
      </div>

      {auth.usingSupabase ? (
        <AccountLinkSection
          error={linkError}
          loading={profileLoading}
          notice={linkNotice}
          onApple={() => {
            if (!profile) {
              return;
            }
            if (isProviderLinked(profile, "apple")) {
              setLinkNotice("すでに Apple と連携しています。");
              return;
            }
            void (async () => {
              try {
                setPendingLink("apple");
                setLinkError(null);
                await startAppleLinkFlow("/mypage");
              } catch (err) {
                setLinkError(profileErrorMessage(err));
                setPendingLink(null);
              }
            })();
          }}
          onClosePhonePanel={() => {
            setPhonePanelOpen(false);
            setPhoneStep("idle");
            setPhoneOtp("");
            setLinkError(null);
          }}
          onGoogle={() => {
            if (!profile) {
              return;
            }
            if (isProviderLinked(profile, "google")) {
              setLinkNotice("すでに Google と連携しています。");
              return;
            }
            void (async () => {
              try {
                setPendingLink("google");
                setLinkError(null);
                await startGoogleLinkFlow("/mypage");
              } catch (err) {
                setLinkError(profileErrorMessage(err));
                setPendingLink(null);
              }
            })();
          }}
          onPhoneE164Change={setPhoneE164}
          onPhoneOtpChange={setPhoneOtp}
          onPhoneRow={() => {
            if (!profile) {
              return;
            }
            if (isProviderLinked(profile, "phone")) {
              setLinkNotice("すでに電話番号と連携しています。");
              setPhonePanelOpen(false);
              return;
            }
            setPhonePanelOpen((open) => !open);
            setLinkError(null);
          }}
          onSendSms={() => {
            void (async () => {
              try {
                setPendingLink("phone-sms");
                setLinkError(null);
                await requestPhoneLinkSms(phoneE164);
                setPhoneStep("sent");
              } catch (err) {
                setLinkError(profileErrorMessage(err));
              } finally {
                setPendingLink(null);
              }
            })();
          }}
          onVerifyOtp={() => {
            void (async () => {
              try {
                setPendingLink("phone-otp");
                setLinkError(null);
                await verifyPhoneLinkOtp(phoneE164, phoneOtp);
                setPhoneStep("idle");
                setPhoneOtp("");
                setPhonePanelOpen(false);
                setLinkNotice("電話番号の連携が完了しました。");
                router.refresh();
                await loadProfile();
              } catch (err) {
                setLinkError(profileErrorMessage(err));
              } finally {
                setPendingLink(null);
              }
            })();
          }}
          pending={pendingLink}
          phoneE164={phoneE164}
          phoneExpanded={phonePanelOpen}
          phoneOtp={phoneOtp}
          phoneStep={phoneStep}
          profile={profile}
        />
      ) : null}

      <SectionTitle subtitle="Titles" title="称号" />
      <Card>
        {summary.titles.map((title) => (
          <div className={`title-row ${title.current ? "current" : ""} ${title.unlocked ? "" : "locked"}`} key={title.id}>
            <div className={`title-icon ${title.current ? "current" : ""}`}>{title.unlocked ? title.icon : "🔒"}</div>
            <div className="title-copy">
              <div className="title-name">{title.name}</div>
              <div className="title-meta">{title.unlocked ? "解放済み" : title.requirementText}</div>
            </div>
            {title.current ? <span className="title-status-chip">使用中</span> : null}
          </div>
        ))}
      </Card>

      {auth.usingSupabase ? (
        <Card>
          <p className="account-copy">別のアカウントに切り替える場合はログアウトしてください。</p>
          <button
            className="button-outline inline-button"
            onClick={() => {
              void (async () => {
                await signOutSupabase();
                router.push("/");
                router.refresh();
              })();
            }}
            type="button"
          >
            ログアウト
          </button>
        </Card>
      ) : (
        <Card>
          <p className="account-copy">初回の選択画面に戻ります（ローカル開発用）。</p>
          <button
            className="button-outline inline-button"
            onClick={() => {
              auth.clearLocalSession();
              router.push("/");
              router.refresh();
            }}
            type="button"
          >
            はじめに戻る
          </button>
        </Card>
      )}
    </>
  );
}
