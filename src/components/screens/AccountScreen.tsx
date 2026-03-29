"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ZodError } from "zod";

import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { BrowserAuthProfile } from "@/lib/supabase/browser";
import {
  createEmailPasswordAccount,
  getSupabaseAuthProfile,
  signInWithEmailPassword,
  startGoogleLinkFlow,
  startGoogleSignInFlow,
} from "@/lib/supabase/browser";

const providerLabels: Record<string, string> = {
  email: "メール",
  google: "Google",
  apple: "Apple",
  phone: "電話番号",
};

function authErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "入力内容が不正です。";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "認証処理に失敗しました。";
}

function formatProviders(profile: BrowserAuthProfile | null) {
  if (!profile || profile.identityProviders.length === 0) {
    return "ゲスト利用中";
  }

  return profile.identityProviders.map((provider) => providerLabels[provider] ?? provider).join(" / ");
}

export function AccountScreen() {
  const auth = useAuthState();
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserAuthProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPasswordConfirmation, setCreatePasswordConfirmation] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.usingSupabase) {
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const nextProfile = await getSupabaseAuthProfile();
        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(authErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [auth.accessToken, auth.ready, auth.usingSupabase]);

  useEffect(() => {
    const authResult = new URLSearchParams(window.location.search).get("auth");
    if (authResult === "linked") {
      setNotice("Google 連携が完了しました。");
      setFormError(null);
      return;
    }
    if (authResult === "error") {
      setFormError("認証のコールバック処理に失敗しました。Google 設定を確認して再実行してください。");
    }
  }, []);

  const profileSummary = useMemo(() => {
    if (!profile) {
      return {
        title: "アカウントを確認中",
        description: "現在のログイン状態を確認しています。",
      };
    }

    if (profile.isAnonymous) {
      return {
        title: "ゲスト利用中",
        description: "今の記録はこのブラウザの匿名ユーザーに紐づいています。Google 連携かメール登録で引き継ぎ可能にできます。",
      };
    }

    return {
      title: "引き継ぎ設定済み",
      description: `${formatProviders(profile)} で再ログインできます。`,
    };
  }, [profile]);

  if (!auth.ready || loadingProfile) {
    return <ScreenState description="アカウント設定を読み込んでいます。" title="読み込み中" />;
  }

  if (!auth.usingSupabase) {
    return (
      <ScreenState
        description="この環境では Supabase 認証が未設定のため、アカウント連携は使えません。"
        title="アカウント設定は利用できません"
      />
    );
  }

  async function handleGoogleLink() {
    try {
      setPendingAction("google-link");
      setFormError(null);
      setNotice(null);
      await startGoogleLinkFlow("/account");
    } catch (error) {
      setFormError(authErrorMessage(error));
      setPendingAction(null);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setPendingAction("google-signin");
      setFormError(null);
      setNotice(null);
      await startGoogleSignInFlow("/account");
    } catch (error) {
      setFormError(authErrorMessage(error));
      setPendingAction(null);
    }
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setPendingAction("email-create");
      setFormError(null);
      setNotice(null);
      await createEmailPasswordAccount({
        email: createEmail,
        password: createPassword,
        passwordConfirmation: createPasswordConfirmation,
      });
      setNotice("メールアドレスを登録しました。確認メールが届いた場合は認証後にこの画面へ戻ってください。");
      setCreatePassword("");
      setCreatePasswordConfirmation("");
      const nextProfile = await getSupabaseAuthProfile();
      setProfile(nextProfile);
      router.refresh();
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
      setNotice("メールアカウントでログインしました。");
      setSignInPassword("");
      const nextProfile = await getSupabaseAuthProfile();
      setProfile(nextProfile);
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <NorenBanner label="アカウント" />

      <Card glow>
        <p className="account-status-label">現在の状態</p>
        <h2 className="account-status-title">{profileSummary.title}</h2>
        <p className="account-status-copy">{profileSummary.description}</p>
        <div className="account-status-meta">
          <span className="badge badge-available">{formatProviders(profile)}</span>
          {profile?.email ? <span className="badge">{profile.email}</span> : null}
        </div>
      </Card>

      {notice ? <Card className="account-notice-card">{notice}</Card> : null}
      {formError ? <Card className="account-error-card">{formError}</Card> : null}

      <SectionTitle subtitle="Google" title="Google連携" />
      <Card>
        <p className="account-copy">
          Google を使うと、ブラウザを変えても今の記録を引き継げます。既存の Google アカウントで入り直す導線もここにまとめています。
        </p>
        {profile?.isAnonymous ? (
          <button
            className="button-primary"
            disabled={pendingAction !== null}
            onClick={() => void handleGoogleLink()}
            type="button"
          >
            {pendingAction === "google-link" ? "Google へ移動中..." : "この記録を Google と連携する"}
          </button>
        ) : null}
        <button
          className="button-outline"
          disabled={pendingAction !== null}
          onClick={() => void handleGoogleSignIn()}
          type="button"
        >
          {pendingAction === "google-signin" ? "Google へ移動中..." : "既存の Google アカウントでログイン"}
        </button>
        <p className="account-meta-note">Supabase Dashboard 側で Google provider と Manual Linking を有効化しておく必要があります。</p>
      </Card>

      <SectionTitle subtitle="Email" title="メールで使う" />
      <Card>
        <p className="account-copy">
          Google アカウントが無い人向けに、今の匿名ユーザーへメールとパスワードを追加できます。作成後は別ブラウザでもメールログインで復元できます。
        </p>
        <form className="account-form" onSubmit={handleCreateAccount}>
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
          <button className="button-primary" disabled={pendingAction !== null || !profile?.isAnonymous} type="submit">
            {pendingAction === "email-create" ? "登録中..." : "この記録でアカウントを作成"}
          </button>
        </form>
      </Card>

      <Card>
        <p className="account-copy">
          すでに作成済みのメールアカウントで入り直す場合はこちらです。現在の匿名データとは別アカウントとして切り替わります。
        </p>
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
            {pendingAction === "email-signin" ? "ログイン中..." : "メールアカウントでログイン"}
          </button>
        </form>
      </Card>

      <Link className="button-subtle inline-button account-back-link" href="/mypage">
        マイページに戻る
      </Link>
    </>
  );
}
