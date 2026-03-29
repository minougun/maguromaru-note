"use client";

import { useCallback, useState } from "react";

import { publicPath } from "@/lib/public-path";

type Step = {
  imageSrc: string;
  title: string;
  body: string;
};

/** 実画面レイアウトに合わせたタブ別モック（public/onboarding/*.svg） */
const STEPS: Step[] = [
  {
    imageSrc: "/onboarding/mock-intro.svg",
    title: "まぐろ丸ノートへようこそ",
    body: "海鮮丼まぐろ丸の公式アプリです。次のスライドから、画面下の6つのタブそれぞれでできることを紹介します。",
  },
  {
    imageSrc: "/onboarding/mock-home.svg",
    title: "ホーム",
    body: "店舗の営業状況と天気、本日の入荷状況（各丼の「◎ あり」など）、おすすめメッセージ、最近の来店記録の一覧を確認できます。",
  },
  {
    imageSrc: "/onboarding/mock-record.svg",
    title: "記録",
    body: "今日食べた丼を選び、食べた部位にチェックを入れて保存します。写真やメモを添えられるので、思い出として残せます。",
  },
  {
    imageSrc: "/onboarding/mock-zukan.svg",
    title: "図鑑",
    body: "記録した部位が図鑑にライトアップされていきます。コンプリート進捗やマグロの部位マップから、解説を読めます。",
  },
  {
    imageSrc: "/onboarding/mock-quiz.svg",
    title: "クイズ",
    body: "ステージごとにまぐろの4択クイズに挑戦できます。ステージを順にクリアしていくと、難易度と報酬が上がっていきます。",
  },
  {
    imageSrc: "/onboarding/mock-titles.svg",
    title: "称号",
    body: "来店回数・図鑑・クイズ成績に応じて称号が解放されます。いまの称号と、次の条件もこの画面で確認できます。「晴れて最後の称号、\"まぐろマスター\"まで獲得できた暁には、なにか良いことがあるかも！？（※無いかもしれません）」",
  },
  {
    imageSrc: "/onboarding/mock-account.svg",
    title: "アカウント連携",
    body: "Apple・Google・メールのいずれかで連携すると、機種変更や再インストール後もデータを引き継ぎやすくなります。",
  },
];

const MOCK_WIDTH = 320;
const MOCK_HEIGHT = 560;

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
          {/* next/image の unoptimized でも basePath は付かないため、__NEXT_ROUTER_BASEPATH 対応の publicPath を使う */}
          <img
            alt=""
            className="onboarding-mock-img"
            decoding="async"
            height={MOCK_HEIGHT}
            src={publicPath(step.imageSrc)}
            width={MOCK_WIDTH}
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
