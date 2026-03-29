"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccountLinkSection } from "@/components/mypage/AccountLinkSection";
import { useAuthState } from "@/components/providers/AuthProvider";
import {
  requestPhoneSignInSms,
  startAnonymousSession,
  startAppleSignInFlow,
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
  const [phonePanelOpen, setPhonePanelOpen] = useState(false);

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
      setPhonePanelOpen(false);
    }
  }, [mode]);

  async function handleStartAnonymous() {
    try {
      setPendingAction("anonymous");
      setFormError(null);
      setNotice(null);
      if (auth.usingSupabase) {
        await startAnonymousSession();
        router.refresh();
      } else {
        auth.acknowledgeLocalSession();
      }
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  if (mode === "choose") {
    return (
      <div className="login-launch">
        <div className="login-launch-body">
          <div className="login-launch-icon-stage">
            <div className="login-launch-mark-frame">
              <Image
                alt=""
                className="login-launch-mark-img"
                fill
                priority
                sizes="100vw"
                src="/brand/login-launch-mark.webp"
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>
          <div className="login-launch-inner">
            {(formError || notice) && (
              <p
                className={
                  formError ? "login-launch-flash login-launch-flash--error" : "login-launch-flash login-launch-flash--ok"
                }
                role={formError ? "alert" : "status"}
              >
                {formError ?? notice}
              </p>
            )}
            <div className="login-launch-actions">
              <button
                className="login-launch-btn login-launch-btn--primary"
                disabled={pendingAction !== null}
                onClick={() => void handleStartAnonymous()}
                type="button"
              >
                {pendingAction === "anonymous" ? "準備中…" : "今すぐはじめる"}
              </button>
              <button
                className="login-launch-btn login-launch-btn--secondary"
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.usingSupabase) {
    return (
      <div className="login-signin">
        <button
          className="login-signin-back"
          disabled={pendingAction !== null}
          onClick={() => setMode("choose")}
          type="button"
        >
          ← 戻る
        </button>
        <h2 className="login-signin-heading">サインイン</h2>
        <p className="login-signin-lead">
          この環境では Supabase が未設定のため、Google や電話番号でのサインインは使えません。本番では{" "}
          <code className="login-signin-code">NEXT_PUBLIC_SUPABASE_URL</code> と{" "}
          <code className="login-signin-code">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定してください。開発中は「今すぐはじめる」でモック利用できます。
        </p>
      </div>
    );
  }

  return (
    <div className="login-signin">
      <button
        className="login-signin-back"
        disabled={pendingAction !== null}
        onClick={() => setMode("choose")}
        type="button"
      >
        ← 戻る
      </button>
      <AccountLinkSection
        error={formError}
        loading={false}
        notice={notice}
        onApple={() => {
          void (async () => {
            try {
              setPendingAction("apple-signin");
              setFormError(null);
              setNotice(null);
              await startAppleSignInFlow("/mypage");
            } catch (error) {
              setFormError(authErrorMessage(error));
              setPendingAction(null);
            }
          })();
        }}
        onClosePhonePanel={() => {
          setPhonePanelOpen(false);
          setPhoneStep("idle");
          setPhoneOtp("");
          setFormError(null);
        }}
        onGoogle={() => {
          void (async () => {
            try {
              setPendingAction("google-signin");
              setFormError(null);
              setNotice(null);
              await startGoogleSignInFlow("/mypage");
            } catch (error) {
              setFormError(authErrorMessage(error));
              setPendingAction(null);
            }
          })();
        }}
        onPhoneE164Change={setPhoneE164}
        onPhoneOtpChange={setPhoneOtp}
        onPhoneRow={() => {
          setPhonePanelOpen((open) => !open);
          setFormError(null);
        }}
        onSendSms={() => {
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
        onVerifyOtp={() => {
          void (async () => {
            try {
              setPendingAction("phone-otp");
              setFormError(null);
              await verifyPhoneSignInOtp(phoneE164, phoneOtp);
              setPhoneStep("idle");
              setPhoneOtp("");
              setPhonePanelOpen(false);
              router.push("/mypage");
              router.refresh();
            } catch (error) {
              setFormError(authErrorMessage(error));
            } finally {
              setPendingAction(null);
            }
          })();
        }}
        pending={pendingAction}
        phoneE164={phoneE164}
        phoneExpanded={phonePanelOpen}
        phoneFieldIdPrefix="login"
        phoneOtp={phoneOtp}
        phoneStep={phoneStep}
        profile={null}
        variant="signIn"
      />
    </div>
  );
}
