"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ZodError } from "zod";

import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  startGoogleSignInFlow,
} from "@/lib/supabase/browser";

function authErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "入力内容が不正です。";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "認証処理に失敗しました。";
}

export function LoginScreen() {
  const auth = useAuthState();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPasswordConfirmation, setCreatePasswordConfirmation] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  useEffect(() => {
    const authResult = new URLSearchParams(window.location.search).get("auth");
    if (authResult === "linked") {
      setNotice("ログインが完了しました。");
      setFormError(null);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (authResult === "error") {
      setFormError("認証のコールバック処理に失敗しました。設定を確認して再度お試しください。");
    }
  }, []);

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

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setPendingAction("email-signup");
      setFormError(null);
      setNotice(null);
      const result = await signUpWithEmailPassword({
        email: createEmail,
        password: createPassword,
        passwordConfirmation: createPasswordConfirmation,
      });
      setCreatePassword("");
      setCreatePasswordConfirmation("");
      if (result.session) {
        setNotice("アカウントを作成してログインしました。");
        router.refresh();
      } else {
        setNotice("確認メールを送信しました。メール内のリンクを開くとログインできます。");
      }
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setPendingAction("email-signin");
      setFormError(null);
      setNotice(null);
      await signInWithEmailPassword({
        email: signInEmail,
        password: signInPassword,
      });
      setSignInPassword("");
      setNotice("ログインしました。");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
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
      <NorenBanner label="ログイン" />

      <Card glow>
        <p className="account-status-label">はじめに</p>
        <h2 className="account-status-title">アカウントでログイン</h2>
        <p className="account-status-copy">
          まぐろ丸ノートを使うには、Google アカウントまたはメールアドレスでの登録・ログインが必要です。
        </p>
      </Card>

      {notice ? <Card className="account-notice-card">{notice}</Card> : null}
      {formError ? <Card className="account-error-card">{formError}</Card> : null}

      <SectionTitle subtitle="Google" title="Googleでログイン" />
      <Card>
        <p className="account-copy">Google アカウントがあれば、ワンタップで登録・ログインできます。</p>
        <button
          className="button-primary"
          disabled={pendingAction !== null}
          onClick={() => void handleGoogleSignIn()}
          type="button"
        >
          {pendingAction === "google-signin" ? "Google へ移動中..." : "Google で続ける"}
        </button>
        <p className="account-meta-note">Supabase で Google プロバイダを有効にしておいてください。</p>
      </Card>

      <SectionTitle subtitle="Email" title="メールで新規登録" />
      <Card>
        <p className="account-copy">メールアドレスとパスワードでアカウントを作成します。確認メールが届く設定の場合は、リンクを開いて完了してください。</p>
        <form className="account-form" onSubmit={handleSignUp}>
          <label className="form-label">
            メールアドレス
            <input
              autoComplete="email"
              className="memo-input"
              onChange={(event) => setCreateEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={createEmail}
            />
          </label>
          <label className="form-label">
            パスワード
            <input
              autoComplete="new-password"
              className="memo-input"
              onChange={(event) => setCreatePassword(event.target.value)}
              placeholder="8文字以上"
              type="password"
              value={createPassword}
            />
          </label>
          <label className="form-label">
            確認用パスワード
            <input
              autoComplete="new-password"
              className="memo-input"
              onChange={(event) => setCreatePasswordConfirmation(event.target.value)}
              placeholder="もう一度入力"
              type="password"
              value={createPasswordConfirmation}
            />
          </label>
          <button className="button-primary" disabled={pendingAction !== null} type="submit">
            {pendingAction === "email-signup" ? "登録中..." : "メールアドレスで登録"}
          </button>
        </form>
      </Card>

      <SectionTitle subtitle="Sign in" title="メールでログイン" />
      <Card>
        <p className="account-copy">すでに登録済みの方はこちらから入れます。</p>
        <form className="account-form" onSubmit={handleSignIn}>
          <label className="form-label">
            メールアドレス
            <input
              autoComplete="email"
              className="memo-input"
              onChange={(event) => setSignInEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={signInEmail}
            />
          </label>
          <label className="form-label">
            パスワード
            <input
              autoComplete="current-password"
              className="memo-input"
              onChange={(event) => setSignInPassword(event.target.value)}
              placeholder="パスワード"
              type="password"
              value={signInPassword}
            />
          </label>
          <button className="button-outline" disabled={pendingAction !== null} type="submit">
            {pendingAction === "email-signin" ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </Card>
    </>
  );
}
