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

function IconPhone() {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
  profile: BrowserAuthProfile | null;
  loading: boolean;
  notice: string | null;
  error: string | null;
  pending: string | null;
  phoneExpanded: boolean;
  phoneE164: string;
  phoneOtp: string;
  phoneStep: "idle" | "sent";
  onApple: () => void;
  onGoogle: () => void;
  onPhoneRow: () => void;
  onPhoneE164Change: (value: string) => void;
  onPhoneOtpChange: (value: string) => void;
  onSendSms: () => void;
  onVerifyOtp: () => void;
  onClosePhonePanel: () => void;
};

export function AccountLinkSection({
  profile,
  loading,
  notice,
  error,
  pending,
  phoneExpanded,
  phoneE164,
  phoneOtp,
  phoneStep,
  onApple,
  onGoogle,
  onPhoneRow,
  onPhoneE164Change,
  onPhoneOtpChange,
  onSendSms,
  onVerifyOtp,
  onClosePhonePanel,
}: AccountLinkSectionProps) {
  const appleOn = isProviderLinked(profile, "apple");
  const googleOn = isProviderLinked(profile, "google");
  const phoneOn = isProviderLinked(profile, "phone");
  const busy = pending !== null;

  return (
    <section className="account-link-section">
      {notice ? <p className="account-link-banner account-link-banner--ok">{notice}</p> : null}
      {error ? <p className="account-link-banner account-link-banner--err">{error}</p> : null}

      <div className="account-link-panel">
        <header className="account-link-header">
          <h2 className="account-link-title">アカウント連携</h2>
          <p className="account-link-subtitle">データのバックアップや引き継ぎができます</p>
          <p className="account-link-subhint">
            Apple / Google を紐づけるには、Supabase ダッシュボードの Authentication → Sign In / Providers で「Allow
            manual linking」をオンにしてください。
          </p>
        </header>

        <div className="account-link-list" role="list">
          {loading || !profile ? (
            <p className="account-link-loading">連携状態を読み込み中です…</p>
          ) : (
            <>
              <button className="account-link-row" disabled={busy} onClick={() => onApple()} type="button">
                <span className="account-link-row-icon" aria-hidden>
                  <IconApple />
                </span>
                <span className="account-link-row-label">Apple</span>
                <span className="account-link-row-status">{appleOn ? "連携済み" : "未連携"}</span>
                <Chevron />
              </button>

              <button className="account-link-row" disabled={busy} onClick={() => onGoogle()} type="button">
                <span className="account-link-row-icon" aria-hidden>
                  <IconGoogle />
                </span>
                <span className="account-link-row-label">Google</span>
                <span className="account-link-row-status">{googleOn ? "連携済み" : "未連携"}</span>
                <Chevron />
              </button>

              <button className="account-link-row" disabled={busy} onClick={() => onPhoneRow()} type="button">
                <span className="account-link-row-icon" aria-hidden>
                  <IconPhone />
                </span>
                <span className="account-link-row-label">電話番号</span>
                <span className="account-link-row-status">{phoneOn ? "連携済み" : "未連携"}</span>
                <Chevron />
              </button>
            </>
          )}
        </div>

        {phoneExpanded && profile && !loading ? (
          <div className="account-link-phone-panel">
            <p className="account-link-phone-lead">国番号付きの電話番号を入力し、SMS のコードで連携します。</p>
            {phoneStep === "idle" ? (
              <div className="account-link-phone-form">
                <label className="account-link-field-label" htmlFor="mypage-phone-e164">
                  電話番号（E.164）
                </label>
                <input
                  autoComplete="tel"
                  className="account-link-field-input"
                  disabled={busy}
                  id="mypage-phone-e164"
                  onChange={(e) => onPhoneE164Change(e.target.value)}
                  placeholder="+819012345678"
                  type="tel"
                  value={phoneE164}
                />
                <div className="account-link-phone-actions">
                  <button className="account-link-text-btn" disabled={busy} onClick={() => onClosePhonePanel()} type="button">
                    閉じる
                  </button>
                  <button className="account-link-pill-btn" disabled={busy} onClick={() => void onSendSms()} type="button">
                    {pending === "phone-sms" ? "送信中…" : "SMS を送る"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="account-link-phone-form">
                <label className="account-link-field-label" htmlFor="mypage-phone-otp">
                  SMS の確認コード
                </label>
                <input
                  className="account-link-field-input"
                  disabled={busy}
                  id="mypage-phone-otp"
                  inputMode="numeric"
                  onChange={(e) => onPhoneOtpChange(e.target.value)}
                  placeholder="6桁のコード"
                  type="text"
                  value={phoneOtp}
                />
                <div className="account-link-phone-actions">
                  <button className="account-link-text-btn" disabled={busy} onClick={() => onClosePhonePanel()} type="button">
                    閉じる
                  </button>
                  <button className="account-link-pill-btn" disabled={busy} onClick={() => void onVerifyOtp()} type="button">
                    {pending === "phone-otp" ? "確認中…" : "コードを確定"}
                  </button>
                </div>
              </div>
            )}
            <p className="account-link-footnote">Supabase で Phone プロバイダを有効にしてください。</p>
          </div>
        ) : null}

      </div>
    </section>
  );
}
