"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ZodError } from "zod";

import { AccountLinkSection } from "@/components/mypage/AccountLinkSection";
import { useAuthState } from "@/components/providers/AuthProvider";
import {
  clearAuthCallbackQueryParams,
  readAuthCallbackErrorMessage,
  readAuthCallbackNotice,
  readLinkedFlowMessages,
} from "@/lib/auth-callback-ui";
import {
  requestEmailSignInOtp,
  startAnonymousSession,
  startAppleSignInFlow,
  startGoogleSignInFlow,
  verifyEmailSignInOtp,
} from "@/lib/supabase/browser";
import { APP_INFO } from "@/lib/domain/constants";

function authErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "入力が不正です。";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "認証処理に失敗しました。";
}

type ScreenMode = "choose" | "signin";

const GIF_DURATION_MS = 3000;

export function LoginScreen({
  onAnimationEnd,
  revealed,
}: {
  onAnimationEnd: () => void;
  revealed: boolean;
}) {
  const auth = useAuthState();
  const router = useRouter();
  const [mode, setMode] = useState<ScreenMode>("choose");
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [signInEmail, setSignInEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "sent">("idle");
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onAnimationEnd, GIF_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (readAuthCallbackNotice(params) === "linked") {
      const { notice, error } = readLinkedFlowMessages(params);
      if (error) {
        setFormError(error);
        setNotice(null);
      } else if (notice) {
        setNotice(notice);
        setFormError(null);
      }
      clearAuthCallbackQueryParams();
      return;
    }
    const errMsg = readAuthCallbackErrorMessage(params);
    if (errMsg) {
      setFormError(errMsg);
      clearAuthCallbackQueryParams();
    }
  }, []);

  useEffect(() => {
    if (mode === "signin") {
      setEmailStep("idle");
      setEmailOtp("");
      setFormError(null);
      setEmailPanelOpen(false);
    }
  }, [mode]);

  async function handleStartAnonymous() {
    try {
      setPendingAction("anonymous");
      setFormError(null);
      setNotice(null);
      if (auth.usingSupabase) {
        await startAnonymousSession();
        router.push("/");
        router.refresh();
      } else {
        auth.acknowledgeLocalSession();
        router.push("/");
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
          <div className={`login-launch-title-wrap login-reveal ${revealed ? "login-reveal--visible" : ""}`}>
            <h1 className="header-title login-launch-title">{APP_INFO.appName}</h1>
          </div>
          <div className="login-launch-icon-stage">
            <div className="login-launch-mark-frame">
              {/* GIF アニメーション（ループなし）。Next.js Image は GIF アニメ非対応のため img を使用 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="login-launch-mark-img"
                draggable={false}
                src="/brand/login-launch-mark.gif"
              />
            </div>
          </div>
          <div className={`login-launch-inner login-reveal ${revealed ? "login-reveal--visible" : ""}`}>
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
          この環境では Supabase が未設定のため、Google やメールでのサインインは使えません。本番では{" "}
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
        email={signInEmail}
        emailExpanded={emailPanelOpen}
        emailFieldIdPrefix="login"
        emailFlow="otp"
        emailOtp={emailOtp}
        emailStep={emailStep}
        error={formError}
        loading={false}
        notice={notice}
        onApple={() => {
          void (async () => {
            try {
              setPendingAction("apple-signin");
              setFormError(null);
              setNotice(null);
              await startAppleSignInFlow("/");
            } catch (error) {
              setFormError(authErrorMessage(error));
              setPendingAction(null);
            }
          })();
        }}
        onCloseEmailPanel={() => {
          setEmailPanelOpen(false);
          setEmailStep("idle");
          setEmailOtp("");
          setFormError(null);
        }}
        onEmailChange={setSignInEmail}
        onEmailOtpChange={setEmailOtp}
        onEmailRow={() => {
          setEmailPanelOpen((open) => !open);
          setFormError(null);
        }}
        onGoogle={() => {
          void (async () => {
            try {
              setPendingAction("google-signin");
              setFormError(null);
              setNotice(null);
              await startGoogleSignInFlow("/");
            } catch (error) {
              setFormError(authErrorMessage(error));
              setPendingAction(null);
            }
          })();
        }}
        onSendEmail={() => {
          void (async () => {
            try {
              setPendingAction("email-otp-send");
              setFormError(null);
              await requestEmailSignInOtp(signInEmail, "/");
              setEmailStep("sent");
            } catch (error) {
              setFormError(authErrorMessage(error));
            } finally {
              setPendingAction(null);
            }
          })();
        }}
        onVerifyEmailOtp={() => {
          void (async () => {
            try {
              setPendingAction("email-otp-verify");
              setFormError(null);
              await verifyEmailSignInOtp(signInEmail, emailOtp);
              setEmailStep("idle");
              setEmailOtp("");
              setEmailPanelOpen(false);
              router.push("/");
              router.refresh();
            } catch (error) {
              setFormError(authErrorMessage(error));
            } finally {
              setPendingAction(null);
            }
          })();
        }}
        pending={pendingAction}
        profile={null}
        variant="signIn"
      />
    </div>
  );
}
