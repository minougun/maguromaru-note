"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ZodError } from "zod";

import { AccountLinkSection, isProviderLinked } from "@/components/mypage/AccountLinkSection";
import { requestAppSnapshotRefresh } from "@/components/providers/AppSnapshotProvider";
import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { clearAuthCallbackQueryParams, readAuthCallbackErrorMessage } from "@/lib/auth-callback-ui";
import { formatSupabaseAuthError } from "@/lib/supabase/auth-errors";
import {
  type BrowserAuthProfile,
  clearStoredAnonymousLinkNonce,
  getSupabaseAuthProfile,
  readStoredAnonymousLinkNonce,
  readSupabaseAccessToken,
  requestEmailLinkConfirmation,
  signOutSupabase,
  startAnonymousAppleLinkFlow,
  startAnonymousGoogleLinkFlow,
  startAppleLinkFlow,
  startGoogleLinkFlow,
} from "@/lib/supabase/browser";

function profileErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "入力が不正です。";
  }
  return formatSupabaseAuthError(error);
}

export function MyPageScreen() {
  const router = useRouter();
  const auth = useAuthState();
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
      clearAuthCallbackQueryParams();
      return;
    }

    void (async () => {
      const nonce = readStoredAnonymousLinkNonce();
      window.history.replaceState({}, "", window.location.pathname);

      if (nonce) {
        let token: string | null = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          token = await readSupabaseAccessToken();
          if (token) {
            break;
          }
          await new Promise((r) => setTimeout(r, 120));
        }

        if (!token) {
          setLinkError("セッションの確立を待てませんでした。再読み込みしてください。");
          clearStoredAnonymousLinkNonce();
        } else {
          try {
            const res = await fetch(`${window.location.origin}/api/auth/anonymous-link/complete`, {
              body: JSON.stringify({ nonce }),
              headers: {
                Authorization: `Bearer ${token}`,
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              method: "POST",
            });
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
              throw new Error(body.error ?? "データの引き継ぎに失敗しました。");
            }
            setLinkNotice("アカウント連携が完了しました。");
            setLinkError(null);
          } catch (err) {
            setLinkError(profileErrorMessage(err));
          } finally {
            clearStoredAnonymousLinkNonce();
          }
        }
      } else {
        setLinkNotice("アカウント連携が完了しました。");
        setLinkError(null);
      }

      void loadProfile();
      requestAppSnapshotRefresh();
    })();
  }, [loadProfile]);

  useEffect(() => {
    if (!auth.usingSupabase || !auth.accessToken) {
      return;
    }
    void loadProfile();
  }, [auth.accessToken, auth.usingSupabase, loadProfile]);

  useEffect(() => {
    if (profile && isProviderLinked(profile, "email")) {
      setEmailPanelOpen(false);
    }
  }, [profile]);

  return (
    <>
      <NorenBanner label="アカウント連携" />

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
