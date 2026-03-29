import { notFound } from "next/navigation";

import type { OnboardingMockId } from "@/components/onboarding/OnboardingDeviceMock";

import { OnboardingMockCaptureView } from "./OnboardingMockCaptureView";

/** ビルド時に notFound へ静的化されないよう、リクエスト時に環境変数を評価する */
export const dynamic = "force-dynamic";

const SCREENS = new Set<OnboardingMockId>([
  "intro",
  "home",
  "record",
  "zukan",
  "quiz",
  "titles",
  "account",
]);

function firstSearchParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) {
    return v[0];
  }
  return v;
}

function parseMockId(raw: string | undefined): OnboardingMockId | null {
  const s = raw?.trim();
  if (!s) {
    return "intro";
  }
  if (SCREENS.has(s as OnboardingMockId)) {
    return s as OnboardingMockId;
  }
  return null;
}

/**
 * OnboardingDeviceMock を単体表示し、Playwright で要素スクショするためのページ。
 * - `next dev`: 常に利用可
 * - `next start`（本番ビルド）: MAGUROMARU_TUTORIAL_SCREENSHOT_SERVER=1 または ONBOARDING_MOCK_CAPTURE=1
 * - それ以外の本番相当: 404（ホスティングでは上記を付けないこと）
 */
export default async function OnboardingMockCapturePage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string | string[] }>;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  const allowCaptureServer =
    process.env.MAGUROMARU_TUTORIAL_SCREENSHOT_SERVER === "1" ||
    process.env.ONBOARDING_MOCK_CAPTURE === "1";
  if (!isDev && !allowCaptureServer) {
    notFound();
  }

  const sp = await searchParams;
  const screen = parseMockId(firstSearchParam(sp.screen));
  if (screen === null) {
    notFound();
  }

  return (
    <div className="onboarding-mock-capture-page">
      <OnboardingMockCaptureView screen={screen} />
    </div>
  );
}
