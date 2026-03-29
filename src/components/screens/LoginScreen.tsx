"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
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

  if (mode === "choose") {
    return (
      <div className="login-launch">
        <header className="app-header login-launch-header">
          <h1 className="header-title">まぐろ丸ノート</h1>
          <div className="accent-line" aria-hidden="true" />
        </header>
        <div className="login-launch-body">
          <div className="login-launch-inner">
            <div className="login-launch-hero">
              <Image
                alt=""
                className="login-launch-hero-img"
                height={544}
                priority
                sizes="(max-width: 420px) 88vw, 340px"
                src="/brand/login-launch-hero.webp"
                width={560}
              />
            </div>
            {(formError || notice) ? (
              <p
                className={
                  formError ? "login-launch-flash login-launch-flash--error" : "login-launch-flash login-launch-flash--ok"
                }
                role={formError ? "alert" : "status"}
              >
                {formError ?? notice}
              </p>
            ) : null}
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
      <h2 className="login-signin-heading">サインイン</h2>
      {formError ? (
        <p className="login-launch-flash login-launch-flash--error" role="alert">
          {formError}
        </p>
      ) : null}
      {notice ? (
        <p className="login-launch-flash login-launch-flash--ok" role="status">
          {notice}
        </p>
      ) : null}
      <p className="login-signin-lead">Google アカウントまたは電話番号（SMS）で連携してください。</p>
      <button
        className="login-launch-btn login-launch-btn--primary"
        disabled={pendingAction !== null}
        onClick={() => void handleGoogleSignIn()}
        type="button"
      >
        {pendingAction === "google-signin" ? "Google へ移動中…" : "Google でサインイン"}
      </button>
      <p className="login-signin-section-label">電話番号</p>
      {phoneStep === "idle" ? (
        <div className="login-signin-form">
          <label className="login-signin-label" htmlFor="login-phone">
            電話番号（E.164）
          </label>
          <input
            autoComplete="tel"
            className="login-signin-input"
            disabled={pendingAction !== null}
            id="login-phone"
            onChange={(event) => setPhoneE164(event.target.value)}
            placeholder="+819012345678"
            type="tel"
            value={phoneE164}
          />
          <button
            className="login-launch-btn login-launch-btn--secondary"
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
            {pendingAction === "phone-sms" ? "送信中…" : "SMS を送る"}
          </button>
        </div>
      ) : (
        <div className="login-signin-form">
          <label className="login-signin-label" htmlFor="login-otp">
            SMS の確認コード
          </label>
          <input
            className="login-signin-input"
            disabled={pendingAction !== null}
            id="login-otp"
            inputMode="numeric"
            onChange={(event) => setPhoneOtp(event.target.value)}
            placeholder="6桁のコード"
            type="text"
            value={phoneOtp}
          />
          <button
            className="login-launch-btn login-launch-btn--primary"
            disabled={pendingAction !== null}
            onClick={() => {
              void (async () => {
                try {
                  setPendingAction("phone-otp");
                  setFormError(null);
                  await verifyPhoneSignInOtp(phoneE164, phoneOtp);
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
            {pendingAction === "phone-otp" ? "確認中…" : "コードを確定"}
          </button>
          <button
            className="login-signin-text-btn"
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
    </div>
  );
}
