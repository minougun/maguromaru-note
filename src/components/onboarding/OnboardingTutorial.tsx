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

const STEPS: Step[] = [
  {
    mockId: "intro",
    title: "まぐろ丸ノートへようこそ",
    body: "海鮮丼まぐろ丸の公式アプリです。次のスライドから、画面下の5つのタブそれぞれでできることを紹介します。",
  },
  {
    mockId: "home",
    title: "ホーム",
    body: "店舗の営業状況と天気、スタッフの一言コメント、本日のおすすめ、入荷状況（各丼の「◎ あり」など）、最近の来店記録を確認できます。",
  },
  {
    mockId: "record",
    title: "記録",
    body: "今日食べた丼を選び、食べた部位にチェックを入れて保存します。写真やメモを添えられるので、思い出として残せます。",
  },
  {
    mockId: "zukan",
    title: "図鑑",
    body: "記録した部位が図鑑にライトアップされていきます。コンプリート進捗やマグロの部位マップから、解説を読めます。",
  },
  {
    mockId: "quiz",
    title: "クイズ",
    body: "まぐろの4択クイズをステージごとに挑戦できます。各ステージ10問。全ての問題に正解すると次のステージが解放されます。",
  },
  {
    mockId: "titles",
    title: "称号",
    body: "来店回数・図鑑・クイズ成績に応じて称号が解放されます。いまの称号と、次の条件もこの画面で確認できます。",
  },
  {
    mockId: "account",
    title: "アカウント連携",
    body: "画面上部の「アカウント連携」から、Apple・Google・メールのいずれかで連携すると、機種変更や再インストール後もデータを引き継ぎやすくなります。",
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
