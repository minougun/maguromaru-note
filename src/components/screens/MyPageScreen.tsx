"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ZodError } from "zod";

import { isProviderLinked } from "@/components/mypage/is-provider-linked";
import { requestAppSnapshotRefresh } from "@/components/providers/AppSnapshotProvider";
import { useAuthState } from "@/components/providers/AuthProvider";
import { useUiPreferences } from "@/components/providers/UiPreferencesProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import {
  clearAuthCallbackQueryParams,
  readAuthCallbackErrorMessage,
  readLinkedFlowMessages,
} from "@/lib/auth-callback-ui";
import { formatSupabaseAuthError } from "@/lib/supabase/auth-errors";
import {
  type BrowserAuthProfile,
  clearStoredAnonymousLinkNonce,
  getSupabaseAuthProfile,
  requestEmailLinkConfirmation,
  signOutSupabase,
  startAnonymousAppleLinkFlow,
  startAnonymousGoogleLinkFlow,
  startAppleLinkFlow,
  startGoogleLinkFlow,
} from "@/lib/supabase/browser";

const AccountLinkSection = dynamic(
  () => import("@/components/mypage/AccountLinkSection").then((m) => ({ default: m.AccountLinkSection })),
  {
    loading: () => (
      <Card>
        <p className="helper-text">連携オプションを読み込んでいます…</p>
      </Card>
    ),
  },
);

function profileErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "入力が不正です。";
  }
  return formatSupabaseAuthError(error);
}

export function MyPageScreen() {
  const router = useRouter();
  const auth = useAuthState();
  const { preferences, setDensity, setTextSize } = useUiPreferences();
  const [profile, setProfile] = useState<BrowserAuthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get("auth");
    if (authResult !== "linked" && authResult !== "error") {
      return;
    }

    if (authResult === "error") {
      setLinkError(readAuthCallbackErrorMessage(params) ?? "認証のコールバックに失敗しました。");
      clearStoredAnonymousLinkNonce();
      clearAuthCallbackQueryParams();
      return;
    }

    const { notice, error } = readLinkedFlowMessages(params);
    if (error) {
      setLinkError(error);
      setLinkNotice(null);
    } else if (notice) {
      setLinkNotice(notice);
      setLinkError(null);
    }
    clearStoredAnonymousLinkNonce();
    clearAuthCallbackQueryParams();
    void loadProfile();
    requestAppSnapshotRefresh("all");
  }, [loadProfile]);

  useEffect(() => {
    if (!auth.usingSupabase || !auth.signedIn) {
      return;
    }
    void loadProfile();
  }, [auth.signedIn, auth.usingSupabase, loadProfile]);

  useEffect(() => {
    if (profile && isProviderLinked(profile, "email")) {
      setEmailPanelOpen(false);
    }
  }, [profile]);

  return (
    <>
      <NorenBanner label="設定" />

      <Card className="settings-card">
        <div className="settings-card-head">
          <div>
            <p className="settings-card-label">見やすさ設定</p>
            <p className="settings-card-title">表示を軽くする / 文字を大きくする</p>
          </div>
        </div>
        <div className="settings-group">
          <div className="settings-group-title">表示モード</div>
          <div className="settings-option-row">
            <button
              className={`settings-pill ${preferences.density === "simple" ? "active" : ""}`}
              onClick={() => setDensity("simple")}
              type="button"
            >
              かんたん表示
            </button>
            <button
              className={`settings-pill ${preferences.density === "detail" ? "active" : ""}`}
              onClick={() => setDensity("detail")}
              type="button"
            >
              詳細表示
            </button>
          </div>
          <p className="helper-text">かんたん表示では、図鑑一覧などの情報量を抑えて見やすくします。</p>
        </div>
        <div className="settings-group">
          <div className="settings-group-title">文字サイズ</div>
          <div className="settings-option-row">
            <button
              className={`settings-pill ${preferences.textSize === "standard" ? "active" : ""}`}
              onClick={() => setTextSize("standard")}
              type="button"
            >
              標準
            </button>
            <button
              className={`settings-pill ${preferences.textSize === "large" ? "active" : ""}`}
              onClick={() => setTextSize("large")}
              type="button"
            >
              大きめ
            </button>
          </div>
          <p className="helper-text">大きめ文字は、ホームや図鑑、記録画面の文字を少し読みやすくします。</p>
        </div>
      </Card>

      {auth.usingSupabase ? (
        <AccountLinkSection
          email={linkEmail}
          emailExpanded={emailPanelOpen}
          emailFieldIdPrefix="mypage"
          emailFlow="magic_link"
          emailOtp=""
          emailStep="idle"
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
                if (profile.isAnonymous) {
                  await startAnonymousAppleLinkFlow("/mypage");
                } else {
                  await startAppleLinkFlow("/mypage");
                }
              } catch (err) {
                setLinkError(profileErrorMessage(err));
                setPendingLink(null);
              }
            })();
          }}
          onCloseEmailPanel={() => {
            setEmailPanelOpen(false);
            setLinkEmail("");
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
                if (profile.isAnonymous) {
                  await startAnonymousGoogleLinkFlow("/mypage");
                } else {
                  await startGoogleLinkFlow("/mypage");
                }
              } catch (err) {
                setLinkError(profileErrorMessage(err));
                setPendingLink(null);
              }
            })();
          }}
          onEmailChange={setLinkEmail}
          onEmailOtpChange={() => {}}
          onEmailRow={() => {
            if (!profile) {
              return;
            }
            if (isProviderLinked(profile, "email")) {
              setLinkNotice("すでにメールアドレスと連携しています。");
              setEmailPanelOpen(false);
              return;
            }
            setEmailPanelOpen((open) => !open);
            setLinkError(null);
          }}
          onSendEmail={() => {
            void (async () => {
              try {
                setPendingLink("email-confirm");
                setLinkError(null);
                await requestEmailLinkConfirmation(linkEmail, "/mypage");
                setEmailPanelOpen(false);
                setLinkEmail("");
                setLinkNotice(
                  "確認メールを送信しました。メール内のリンクを開くと連携が完了します。リンク後はこのページを再読み込みしてください。",
                );
              } catch (err) {
                setLinkError(profileErrorMessage(err));
              } finally {
                setPendingLink(null);
              }
            })();
          }}
          onVerifyEmailOtp={() => {}}
          pending={pendingLink}
          profile={profile}
        />
      ) : null}

      {auth.usingSupabase && profile && !profile.isAnonymous ? (
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
      ) : auth.usingSupabase ? null : (
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
