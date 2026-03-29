/** Supabase Auth のエラーを画面向けの日本語に寄せる */

const IDENTITY_LINKING_DOC = "https://supabase.com/docs/guides/auth/auth-identity-linking";

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") {
      return msg;
    }
  }
  return "";
}

export function formatSupabaseAuthError(error: unknown): string {
  const message = readErrorMessage(error);
  if (!message) {
    return "処理に失敗しました。";
  }

  if (/manual linking is disabled/i.test(message)) {
    return `手動でのプロバイダ連携（Manual linking）が Supabase でオフです。ダッシュボードの Authentication → Sign In / Providers で「Allow manual linking（手動でのリンクを許可）」をオンにしてください。参考: ${IDENTITY_LINKING_DOC}`;
  }

  return message;
}
