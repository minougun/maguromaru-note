"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  requestPhoneSignInSms,
  startAnonymousSession,
  startGoogleSignInFlow,
  verifyPhoneSignInOtp,
} from "@/lib/supabase/browser";

function authErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "認証処理に失敗しました。";
}

type ScreenMode = "choose" | "signin";

export function LoginScreen() {
  const auth = useAuthState();
  const router = useRouter();
  const [mode, setMode] = useState<ScreenMode>("choose");
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [phoneE164, setPhoneE164] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"idle" | "sent">("idle");

  useEffect(() => {
    const authResult = new URLSearchParams(window.location.search).get("auth");
    if (authResult === "linked") {
      setNotice("アカウント連携が完了しました。");
      setFormError(null);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (authResult === "error") {
      setFormError("認証のコールバック処理に失敗しました。設定を確認して再度お試しください。");
    }
  }, []);

  useEffect(() => {
    if (mode === "signin") {
      setPhoneStep("idle");
      setPhoneOtp("");
      setFormError(null);
    }
  }, [mode]);

  async function handleStartAnonymous() {
    try {
      setPendingAction("anonymous");
      setFormError(null);
      setNotice(null);
      await startAnonymousSession();
      setNotice("ようこそ、まぐろ丸ノートへ。");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setPendingAction("google-signin");
      setFormError(null);
      setNotice(null);
      await startGoogleSignInFlow("/");
    } catch (error) {
      setFormError(authErrorMessage(error));
      setPendingAction(null);
    }
  }

  if (!auth.usingSupabase) {
    return (
      <Card>
        <p className="account-copy">
          この環境では Supabase が未設定のため、ログイン画面は表示されません。開発用のモック動作ではそのまま利用できます。
        </p>
      </Card>
    );
  }

  return (
    <>
      <NorenBanner label="はじめる" />

      <Card glow>
        <p className="account-status-label">ようこそ</p>
        <h2 className="account-status-title">まぐろ丸ノート</h2>
        <p className="account-status-copy">
          {mode === "choose"
            ? "はじめに、サインインするか、匿名ですぐに試すかを選んでください。匿名のまま始めた場合も、あとからマイページで Google アカウントや電話番号と紐づけて記録を引き継げます。"
            : "Google アカウント、または電話番号（SMS）のどちらかで連携すると、このブラウザにアカウントが紐づきます。"}
        </p>
      </Card>

      {notice ? <Card className="account-notice-card">{notice}</Card> : null}
      {formError ? <Card className="account-error-card">{formError}</Card> : null}

      {mode === "choose" ? (
        <>
          <SectionTitle subtitle="Start" title="どちらではじめますか？" />
          <Card>
            <div className="account-form" style={{ gap: 14 }}>
              <button
                className="button-primary"
                disabled={pendingAction !== null}
                onClick={() => {
                  setMode("signin");
                  setNotice(null);
                  setFormError(null);
                }}
                type="button"
              >
                サインイン
              </button>
              <p className="account-copy" style={{ margin: 0 }}>
                Google アカウントまたは電話番号で連携してから利用を開始します。
              </p>
              <button
                className="button-outline"
                disabled={pendingAction !== null}
                onClick={() => void handleStartAnonymous()}
                type="button"
              >
                {pendingAction === "anonymous" ? "準備中..." : "今すぐはじめる"}
              </button>
              <p className="account-copy" style={{ margin: 0 }}>
                アカウントは作らず、匿名のまますぐに利用できます。紐づけはマイページからいつでも可能です。
              </p>
            </div>
            <p className="account-meta-note">「今すぐはじめる」には Supabase の Anonymous sign-ins が有効である必要があります。</p>
          </Card>
        </>
      ) : (
        <>
          <SectionTitle subtitle="Sign in" title="アカウントでサインイン" />
          <Card>
            <button
              className="button-subtle"
              disabled={pendingAction !== null}
              onClick={() => setMode("choose")}
              type="button"
            >
              ← 戻る
            </button>
            <p className="account-copy" style={{ marginTop: 12 }}>
              次のいずれかの方法で連携してください。
            </p>
            <button
              className="button-primary"
              disabled={pendingAction !== null}
              onClick={() => void handleGoogleSignIn()}
              style={{ marginTop: 12 }}
              type="button"
            >
              {pendingAction === "google-signin" ? "Google へ移動中..." : "Google でサインイン"}
            </button>
            <p className="account-meta-note">Supabase で Google プロバイダを有効にしてください。</p>

            <p className="account-copy" style={{ marginTop: 20 }}>
              電話番号（国番号付き）に SMS でコードを送り、入力してサインインします。
            </p>
            {phoneStep === "idle" ? (
              <div className="account-form" style={{ marginTop: 10 }}>
                <label className="form-label">
                  電話番号（E.164）
                  <input
                    autoComplete="tel"
                    className="memo-input"
                    onChange={(event) => setPhoneE164(event.target.value)}
                    placeholder="+819012345678"
                    type="tel"
                    value={phoneE164}
                  />
                </label>
                <button
                  className="button-outline"
                  disabled={pendingAction !== null}
                  onClick={() => {
                    void (async () => {
                      try {
                        setPendingAction("phone-sms");
                        setFormError(null);
                        await requestPhoneSignInSms(phoneE164);
                        setPhoneStep("sent");
                      } catch (error) {
                        setFormError(authErrorMessage(error));
                      } finally {
                        setPendingAction(null);
                      }
                    })();
                  }}
                  type="button"
                >
                  {pendingAction === "phone-sms" ? "送信中..." : "SMS を送る"}
                </button>
              </div>
            ) : (
              <div className="account-form" style={{ marginTop: 10 }}>
                <label className="form-label">
                  SMS の確認コード
                  <input
                    className="memo-input"
                    inputMode="numeric"
                    onChange={(event) => setPhoneOtp(event.target.value)}
                    placeholder="6桁のコード"
                    type="text"
                    value={phoneOtp}
                  />
                </label>
                <button
                  className="button-primary"
                  disabled={pendingAction !== null}
                  onClick={() => {
                    void (async () => {
                      try {
                        setPendingAction("phone-otp");
                        setFormError(null);
                        await verifyPhoneSignInOtp(phoneE164, phoneOtp);
                        setNotice("サインインしました。");
                        router.refresh();
                      } catch (error) {
                        setFormError(authErrorMessage(error));
                      } finally {
                        setPendingAction(null);
                      }
                    })();
                  }}
                  type="button"
                >
                  {pendingAction === "phone-otp" ? "確認中..." : "コードを確定してサインイン"}
                </button>
                <button
                  className="button-subtle"
                  disabled={pendingAction !== null}
                  onClick={() => {
                    setPhoneStep("idle");
                    setPhoneOtp("");
                    setFormError(null);
                  }}
                  type="button"
                >
                  電話番号をやり直す
                </button>
              </div>
            )}
            <p className="account-meta-note">Supabase で Phone プロバイダと SMS を有効にしてください。</p>
          </Card>
        </>
      )}
    </>
  );
}
