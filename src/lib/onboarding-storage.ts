/** チュートリアル内容を差し替えたらキーを上げて再表示できる（v7: ドット移動・キーボード操作・起動導線の再調整） */
const ONBOARDING_DONE_KEY = "maguro_note_onboarding_v7_done";

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
