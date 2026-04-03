/** Supabase Auth のエラーを画面向けの日本語に寄せる */

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

  if (/already been registered/i.test(message)) {
    return "そのメールアドレスは別のアカウントですでに登録済みです。メールでサインインするか、連携画面から確認メールを送り直してください。";
  }

  return message;
}
