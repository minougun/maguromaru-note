/** チュートリアル内容を差し替えたらキーを上げて再表示できる（v5: タブ帯画像・選択ドットUI 更新） */
const ONBOARDING_DONE_KEY = "maguro_note_onboarding_v5_done";

export function readOnboardingDone(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingDone(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(ONBOARDING_DONE_KEY, "1");
  } catch {
    /* private mode 等 */
  }
}
