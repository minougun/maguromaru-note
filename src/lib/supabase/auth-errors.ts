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

  return message;
}
