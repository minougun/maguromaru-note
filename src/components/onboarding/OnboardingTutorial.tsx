"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type OnboardingMockId, OnboardingDeviceMock } from "@/components/onboarding/OnboardingDeviceMock";
import { publicPath } from "@/lib/public-path";

type Step = {
  mockId: OnboardingMockId;
  title: string;
  body: string;
  /**
   * 任意: 静的 WebP を置くとそのステップでは画像を表示する。
   * 下部タブは `OnboardingDeviceMock` が実機 `TabBar` と同じ 6 列グリッド＋ラベル DOM を描画するため、通常は未指定（常にモック）とする。
   */
  screenshotSrc?: string;
};

const TUTORIAL_SCREENSHOT_REV = "20260404-3";

const STEPS: Step[] = [
  {
    mockId: "intro",
    title: "まぐろ丸ノートへようこそ",
    body: "海鮮丼まぐろ丸の公式アプリです。次のスライドから、ホーム・記録・図鑑・クイズ・称号・設定でできることを順番に紹介します。",
  },
  {
    mockId: "home",
    title: "ホーム",
    body: "営業状況と天気、まぐろ丸Botの豆知識、本日の入荷状況、最近の記録をまとめて確認できます。来店頻度が少なくても進めやすい「ゆるく進める目標」と、常連メリットもここで見られます。",
    screenshotSrc: `/onboarding/tutorial/home.png?v=${TUTORIAL_SCREENSHOT_REV}`,
  },
  {
    mockId: "record",
    title: "記録",
    body: "今日食べた丼を選ぶと、標準の部位が自動で入る「かんたん記録」で素早く保存できます。必要なら部位の調整、写真、メモ、脂感や食感などの主観記録も追加できます。",
    screenshotSrc: `/onboarding/tutorial/record.png?v=${TUTORIAL_SCREENSHOT_REV}`,
  },
  {
    mockId: "zukan",
    title: "図鑑",
    body: "記録した部位が図鑑に反映され、コンプリート進捗や部位マップから詳しく見られます。かんたん表示では一覧をシンプルに、詳細表示では出やすい丼や主観記録まで深く確認できます。",
    screenshotSrc: `/onboarding/tutorial/zukan.png?v=${TUTORIAL_SCREENSHOT_REV}`,
  },
  {
    mockId: "quiz",
    title: "クイズ",
    body: "まぐろの4択クイズにステージごとに挑戦できます。各ステージは10問で、全部正解すると次のステージが解放されます。クイズの進捗は称号やミッションにもつながります。",
    screenshotSrc: `/onboarding/tutorial/quiz.png?v=${TUTORIAL_SCREENSHOT_REV}`,
  },
  {
    mockId: "titles",
    title: "称号",
    body: "来店回数・図鑑・クイズ成績に応じて称号が解放されます。いま使っている称号と、次に目指す条件をこの画面で確認できます。晴れて最後の称号、「まぐろマスター」まで獲得できた暁には、なにか良いことがあるかも！？",
    screenshotSrc: `/onboarding/tutorial/titles.png?v=${TUTORIAL_SCREENSHOT_REV}`,
  },
  {
    mockId: "account",
    title: "設定",
    body: "設定では、かんたん表示 / 詳細表示や文字サイズを切り替えられます。Apple・Google・メールを連携しておくと、機種変更や再インストール後もデータを引き継ぎやすくなります。",
    screenshotSrc: `/onboarding/tutorial/account.png?v=${TUTORIAL_SCREENSHOT_REV}`,
  },
];

type OnboardingTutorialProps = {
  onComplete: () => void;
};

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;

  const goToStep = useCallback((nextIndex: number) => {
    setIndex(Math.max(0, Math.min(nextIndex, STEPS.length - 1)));
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((value) => Math.min(value + 1, STEPS.length - 1));
  }, [isLast, onComplete]);

  const goPrev = useCallback(() => {
    setIndex((value) => Math.max(value - 1, 0));
  }, []);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.focus();
    return () => {
      previousActive?.focus();
    };
  }, []);

  return (
    <div
      aria-describedby="onboarding-body"
      aria-labelledby="onboarding-title"
      aria-modal="true"
      className="onboarding-root"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goPrev();
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goNext();
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          goToStep(0);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          goToStep(STEPS.length - 1);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          finish();
        }
      }}
      ref={rootRef}
      role="dialog"
      tabIndex={-1}
    >
      <button className="onboarding-skip" onClick={() => finish()} type="button">
        スキップ
      </button>

      <div className="onboarding-panel">
        {step.mockId !== "intro" ? (
          <div className="onboarding-art onboarding-art--mock" aria-hidden="true">
            {step.screenshotSrc ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- 引き継ぎ前どおり公開 WebP（publicPath で basePath 対応） */}
                <img
                  alt=""
                  className="onboarding-screenshot-img"
                  decoding="async"
                  src={publicPath(step.screenshotSrc)}
                />
              </>
            ) : (
              <OnboardingDeviceMock screen={step.mockId} />
            )}
          </div>
        ) : null}

        <h2 className="onboarding-title" id="onboarding-title">
          {step.title}
        </h2>
        <p className="onboarding-body" id="onboarding-body">
          {step.body}
        </p>

        <div aria-label="オンボーディングの進捗" className="onboarding-dots">
          {STEPS.map((_, i) => (
            <button
              aria-current={i === index ? "step" : undefined}
              aria-label={`${i + 1}枚目へ移動`}
              className="onboarding-dot"
              data-active={i === index}
              key={i}
              onClick={() => goToStep(i)}
              style={{ padding: 0, border: "none", cursor: "pointer" }}
              type="button"
            />
          ))}
        </div>

        <div className="onboarding-actions">
          {index > 0 ? (
            <button className="onboarding-btn onboarding-btn--ghost" onClick={() => goPrev()} type="button">
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
            <button className="onboarding-btn onboarding-btn--primary" onClick={() => goNext()} type="button">
              次へ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
