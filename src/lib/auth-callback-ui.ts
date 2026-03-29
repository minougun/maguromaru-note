/**
 * ログイン画面・マイページで、URL クエリに含まれた認証コールバック結果を読み取る。
 * Supabase は失敗時に `error` / `error_description` を付けることがある。
 */

const AUTH_QUERY_KEYS = ["auth", "auth_err", "error", "error_description", "error_code"] as const;

export function readAuthCallbackNotice(params: URLSearchParams): "linked" | null {
  return params.get("auth") === "linked" ? "linked" : null;
}

export function readAuthCallbackErrorMessage(params: URLSearchParams): string | null {
  const auth = params.get("auth");

  if (auth === "linked") {
    return null;
  }

  if (auth === "error") {
    switch (params.get("auth_err")) {
      case "provider":
        return "外部ログイン（Google・Apple 等）でエラーが返されました。しばらくしてから再度お試しください。";
      case "session":
        return "セッションの確立に失敗しました。サインインを開始したのと同じブラウザで完了するようお試しください（メールアプリ内ブラウザだけで最後まで開かない等の場合に起きます）。";
      case "email":
        return "メール確認リンクが無効か、期限切れ、または既に使用済みの可能性があります。確認メールの送信からやり直してください。";
      case "incomplete":
        return "認証リンクの情報が不足しています。メール内のリンクをコピーせず、そのまま開いてください。";
      default:
        return "認証のコールバック処理に失敗しました。時間をおいて再度お試しください。";
    }
  }

  const oauthError = params.get("error");
  const oauthDesc = params.get("error_description");
  if (oauthError) {
    if (oauthDesc) {
      try {
        const text = decodeURIComponent(oauthDesc.replace(/\+/g, " ")).trim();
        if (text.length > 0) {
          return text.length > 280 ? `${text.slice(0, 280)}…` : text;
        }
      } catch {
        /* ignore */
      }
    }
    return "外部ログインが完了しませんでした。別の方法でサインインするか、時間をおいて再度お試しください。";
  }

  return null;
}

export function clearAuthCallbackQueryParams() {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of AUTH_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}`);
  }
}
