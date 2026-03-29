"use client";

import type { BrowserAuthProfile } from "@/lib/supabase/browser";

export function isProviderLinked(profile: BrowserAuthProfile | null, provider: string) {
  return Boolean(profile?.identityProviders.includes(provider));
}

function IconApple() {
  return (
    <svg aria-hidden className="account-link-icon-svg" height={24} viewBox="0 0 24 24" width={24}>
      <path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.06 1.87-2.54 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconGoogle() {
  return (
    <svg aria-hidden className="account-link-icon-svg account-link-icon-google" height={24} viewBox="0 0 24 24" width={24}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function IconMail() {
  return (
    <svg
      aria-hidden
      className="account-link-icon-svg"
      fill="none"
      height={24}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={24}
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function Chevron() {
  return (
    <span aria-hidden className="account-link-chevron">
      ›
    </span>
  );
}

export type AccountLinkSectionProps = {
  /** `signIn`: ログイン画面用（プロファイル未取得でも一覧を出す） */
  variant?: "link" | "signIn";
  /** メール入力の id 接頭辞（同一 DOM に両方載ることがないよう画面ごとに分ける） */
  emailFieldIdPrefix?: string;
  profile: BrowserAuthProfile | null;
  loading: boolean;
  notice: string | null;
  error: string | null;
  pending: string | null;
  emailExpanded: boolean;
  email: string;
  emailOtp: string;
  emailStep: "idle" | "sent";
  /**
   * `otp`: ログインはメールの確認コード入力まで。
   * `magic_link`: マイページは確認メール送信のみ（リンクで確定）。
   */
  emailFlow: "otp" | "magic_link";
  onApple: () => void;
  onGoogle: () => void;
  onEmailRow: () => void;
  onEmailChange: (value: string) => void;
  onEmailOtpChange: (value: string) => void;
  onSendEmail: () => void;
  onVerifyEmailOtp: () => void;
  onCloseEmailPanel: () => void;
};

export function AccountLinkSection({
  variant = "link",
  emailFieldIdPrefix = "mypage",
  profile,
  loading,
  notice,
  error,
  pending,
  emailExpanded,
  email,
  emailOtp,
  emailStep,
  emailFlow,
  onApple,
  onGoogle,
  onEmailRow,
  onEmailChange,
  onEmailOtpChange,
  onSendEmail,
  onVerifyEmailOtp,
  onCloseEmailPanel,
}: AccountLinkSectionProps) {
  const isSignIn = variant === "signIn";
  const appleOn = isProviderLinked(profile, "apple");
  const googleOn = isProviderLinked(profile, "google");
  const emailOn = isProviderLinked(profile, "email");
  const busy = pending !== null;
  const emailInputId = `${emailFieldIdPrefix}-link-email`;
  const emailOtpId = `${emailFieldIdPrefix}-link-email-otp`;
  const showRows = isSignIn || (!loading && profile);
  const showEmailPanel = emailExpanded && (isSignIn || (profile && !loading));
  const useOtpSubstep = emailFlow === "otp" && emailStep === "sent";

  return (
    <section className="account-link-section">
      {notice ? <p className="account-link-banner account-link-banner--ok">{notice}</p> : null}
      {error ? <p className="account-link-banner account-link-banner--err">{error}</p> : null}

      <div className="account-link-panel">
        <header className="account-link-header">
          <h2 className="account-link-title">アカウント連携</h2>
          <p className="account-link-subtitle">
            {isSignIn
              ? "マイページと同じ手順で、Google・Apple・メールのいずれかにサインインできます。"
              : "データのバックアップや引き継ぎができます"}
          </p>
        </header>

        <div className="account-link-list" role="list">
          {!showRows ? (
            <p className="account-link-loading">連携状態を読み込み中です…</p>
          ) : (
            <>
              <button className="account-link-row" disabled={busy} onClick={() => onApple()} type="button">
                <span className="account-link-row-icon" aria-hidden>
                  <IconApple />
                </span>
                <span className="account-link-row-label">Apple</span>
                <span className="account-link-row-status">
                  {isSignIn ? "サインイン" : appleOn ? "連携済み" : "未連携"}
                </span>
                <Chevron />
              </button>

              <button className="account-link-row" disabled={busy} onClick={() => onGoogle()} type="button">
                <span className="account-link-row-icon" aria-hidden>
                  <IconGoogle />
                </span>
                <span className="account-link-row-label">Google</span>
                <span className="account-link-row-status">
                  {isSignIn ? "サインイン" : googleOn ? "連携済み" : "未連携"}
                </span>
                <Chevron />
              </button>

              <button className="account-link-row" disabled={busy} onClick={() => onEmailRow()} type="button">
                <span className="account-link-row-icon" aria-hidden>
                  <IconMail />
                </span>
                <span className="account-link-row-label">メールアドレス</span>
                <span className="account-link-row-status">
                  {isSignIn ? "メールでサインイン" : emailOn ? "連携済み" : "未連携"}
                </span>
                <Chevron />
              </button>
            </>
          )}
        </div>

        {showEmailPanel ? (
          <div className="account-link-phone-panel">
            <p className="account-link-phone-lead">
              {emailFlow === "magic_link"
                ? "メールアドレスを入力し、届いたメールのリンクを開くと連携が完了します。"
                : isSignIn
                  ? "メールアドレスを入力し、届いた確認コードでサインインします。"
                  : "メールアドレスを入力し、届いた確認コードで連携します。"}
            </p>
            {!useOtpSubstep ? (
              <div className="account-link-phone-form">
                <label className="account-link-field-label" htmlFor={emailInputId}>
                  メールアドレス
                </label>
                <input
                  autoComplete="email"
                  className="account-link-field-input"
                  disabled={busy}
                  id={emailInputId}
                  inputMode="email"
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
                <div className="account-link-phone-actions">
                  <button className="account-link-text-btn" disabled={busy} onClick={() => onCloseEmailPanel()} type="button">
                    閉じる
                  </button>
                  <button className="account-link-pill-btn" disabled={busy} onClick={() => void onSendEmail()} type="button">
                    {pending === "email-confirm" || pending === "email-otp-send"
                      ? "送信中…"
                      : emailFlow === "magic_link"
                        ? "確認メールを送る"
                        : "確認コードを送る"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="account-link-phone-form">
                <label className="account-link-field-label" htmlFor={emailOtpId}>
                  メールの確認コード
                </label>
                <input
                  className="account-link-field-input"
                  disabled={busy}
                  id={emailOtpId}
                  inputMode="numeric"
                  onChange={(e) => onEmailOtpChange(e.target.value)}
                  placeholder="メールに記載のコード"
                  type="text"
                  value={emailOtp}
                />
                <div className="account-link-phone-actions">
                  <button className="account-link-text-btn" disabled={busy} onClick={() => onCloseEmailPanel()} type="button">
                    閉じる
                  </button>
                  <button className="account-link-pill-btn" disabled={busy} onClick={() => void onVerifyEmailOtp()} type="button">
                    {pending === "email-otp-verify" ? "確認中…" : "コードを確定"}
                  </button>
                </div>
              </div>
            )}
            <p className="account-link-footnote">
              Supabase で Email プロバイダを有効にし、リダイレクト URL にコールバック先を登録してください。
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
