"use client";

import {
  OnboardingDeviceMock,
  type OnboardingMockId,
} from "@/components/onboarding/OnboardingDeviceMock";

export function OnboardingMockCaptureView({ screen }: { screen: OnboardingMockId }) {
  return (
    <div className="onboarding-art onboarding-art--mock" data-onboarding-mock-capture="1">
      <OnboardingDeviceMock screen={screen} />
    </div>
  );
}
