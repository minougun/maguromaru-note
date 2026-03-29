"use client";

import { useCallback, useState } from "react";

import { publicPath } from "@/lib/public-path";

import { type OnboardingMockId, OnboardingDeviceMock } from "@/components/onboarding/OnboardingDeviceMock";

type Step = {
  mockId: OnboardingMockId;
  title: string;
  body: string;
  /**
   * 任意: `public/onboarding/screenshots/home.webp` のように画像を置くと、
   * そのステップでは CSS モックの代わりにスクショを表示します（未配置時は 404 になるので、ファイルを置いてから指定）。
   */
  screenshotSrc?: string;
};

const STEPS: Step[] = [
  {
    mockId: "intro",
    title: "まぐろ丸ノートへようこそ",
    body: "海鮮丼まぐろ丸の公式アプリです。次のスライドから、画面下の6つのタブそれぞれでできることを紹介します。",
  },
  {
    mockId: "home",
    title: "ホーム",
    body: "店舗の営業状況と天気、スタッフの一言コメント、本日のおすすめ、入荷状況（各丼の「◎ あり」など）、最近の来店記録を確認できます。",
    screenshotSrc: "/onboarding/home.webp",
  },
  {
    mockId: "record",
    title: "記録",
    body: "今日食べた丼を選び、食べた部位にチェックを入れて保存します。写真やメモを添えられるので、思い出として残せます。",
    screenshotSrc: "/onboarding/record.webp",
  },
  {
    mockId: "zukan",
    title: "図鑑",
    body: "記録した部位が図鑑にライトアップされていきます。コンプリート進捗やマグロの部位マップから、解説を読めます。",
    screenshotSrc: "/onboarding/zukan.webp",
  },
  {
    mockId: "quiz",
    title: "クイズ",
    body: "まぐろの4択クイズをステージごとに挑戦できます。各ステージ10問。全ての問題に正解すると次のステージが解放されます。",
    screenshotSrc: "/onboarding/quiz.webp",
  },
  {
    mockId: "titles",
    title: "称号",
    body: "来店回数・図鑑・クイズ成績に応じて称号が解放されます。いまの称号と、次の条件もこの画面で確認できます。「晴れて最後の称号、\"まぐろマスター\"まで獲得できた暁には、なにか良いことがあるかも！？（※無いかもしれません）」",
    screenshotSrc: "/onboarding/titles.webp",
  },
  {
    mockId: "account",
    title: "アカウント連携",
    body: "Apple・Google・メールのいずれかで連携すると、機種変更や再インストール後もデータを引き継ぎやすくなります。",
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
        <div className="onboarding-art onboarding-art--mock" aria-hidden="true">
          {step.screenshotSrc ? (
            <img
              alt=""
              className="onboarding-screenshot-img"
              decoding="async"
              src={publicPath(step.screenshotSrc)}
            />
          ) : (
            <OnboardingDeviceMock screen={step.mockId} />
          )}
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
