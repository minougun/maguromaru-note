"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

type Step = {
  imageSrc: string;
  title: string;
  body: string;
  /** SVG などは width/height 指定でレイアウト安定 */
  imageWidth: number;
  imageHeight: number;
};

const STEPS: Step[] = [
  {
    imageSrc: "/tuna-placeholder.svg",
    title: "まぐろ丸ノートへようこそ",
    body: "海鮮丼まぐろ丸の公式アプリです。来店記録や図鑑、クイズを楽しめます。",
    imageWidth: 200,
    imageHeight: 200,
  },
  {
    imageSrc: "/tuna-placeholder.svg",
    title: "ホーム",
    body: "本日の入荷状況やおすすめ、お店の状況をいつでも確認できます。",
    imageWidth: 200,
    imageHeight: 200,
  },
  {
    imageSrc: "/tuna-map-base.svg",
    title: "記録と図鑑",
    body: "食べた丼を記録すると、まぐろの部位が図鑑に集まります。コンプを目指しましょう。",
    imageWidth: 260,
    imageHeight: 200,
  },
  {
    imageSrc: "/tuna-map-base.svg",
    title: "クイズと称号",
    body: "まぐろクイズに挑戦して正解数を伸ばすと、新しい称号が解放されます。",
    imageWidth: 260,
    imageHeight: 200,
  },
  {
    imageSrc: "/tuna-placeholder.svg",
    title: "さあ、はじめよう",
    body: "画面下のタブでホーム・記録・図鑑・クイズ・称号・アカウント連携に移動できます。アカウント連携で端末を変えてもデータを引き継げます。",
    imageWidth: 200,
    imageHeight: 200,
  },
];

type OnboardingTutorialProps = {
  onComplete: () => void;
};

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="onboarding-root" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <button className="onboarding-skip" onClick={() => finish()} type="button">
        スキップ
      </button>

      <div className="onboarding-panel">
        <div className="onboarding-art" aria-hidden="true">
          <Image
            alt=""
            className="onboarding-art-img"
            height={step.imageHeight}
            src={step.imageSrc}
            unoptimized
            width={step.imageWidth}
          />
        </div>

        <h2 className="onboarding-title" id="onboarding-title">
          {step.title}
        </h2>
        <p className="onboarding-body">{step.body}</p>

        <div className="onboarding-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span className="onboarding-dot" data-active={i === index} key={i} />
          ))}
        </div>

        <div className="onboarding-actions">
          {index > 0 ? (
            <button className="onboarding-btn onboarding-btn--ghost" onClick={() => setIndex((v) => v - 1)} type="button">
              戻る
            </button>
          ) : (
            <span className="onboarding-btn-spacer" />
          )}
          {isLast ? (
            <button className="onboarding-btn onboarding-btn--primary" onClick={() => finish()} type="button">
              はじめる
            </button>
          ) : (
            <button className="onboarding-btn onboarding-btn--primary" onClick={() => setIndex((v) => v + 1)} type="button">
              次へ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
