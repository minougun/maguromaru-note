"use client";

import { useState } from "react";
type Props = {
  onClose: () => void;
};
export default function TutorialScreen({ onClose }: Props) {
  const slides = [
    {
      title: "ようこそ、まぐろ丸へ",
      body: "気軽に使える記録＆クイズアプリです。",
      image: "/onboarding/step1.webp"
    },
    {
      title: "記録をつけよう",
      body: "来店したらワンタップで記録。履歴もすぐ見返せます。",
      image: "/onboarding/step2.webp"
    },
    {
      title: "クイズで遊ぼう",
      body: "まぐろに関するクイズで楽しく知識アップ。",
      image: "/onboarding/step3.webp"
    },
    {
      title: "称号を集めよう",
      body: "条件を満たすと特別な称号がもらえます。",
      image: "/onboarding/step4.webp"
    },
    {
      title: "いつでも再表示",
      body: "このチュートリアルは設定から何度でも見直せます。",
      image: "/onboarding/step5.webp"
    },
    {
      title: "さあ始めよう",
      body: "準備ができたらスタート！",
      image: "/onboarding/step6.webp"
    },
  ];
  const [index, setIndex] = useState(0);
  function next() {
    if (index < slides.length - 1) setIndex(index + 1);
    else finish();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }
  function finish() {
    try {
      localStorage.setItem("maguromaru_tutorial_shown", "1");
    } catch (e) {
      /* ignore */
    }
    onClose();
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
      <div style={{ width: "min(92%, 420px)" }}>
        <div className="card">
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{slides[index].title}</h3>
          {slides[index].image && (
            <img
              src={slides[index].image}
              alt=""
              className="tutorial-image"
              loading="lazy"
            />
          )}
          <p style={{ marginTop: 8, color: "var(--cream-faint)" }}>{slides[index].body}</p>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button className="button-outline" onClick={prev} disabled={index === 0} type="button">
              戻る
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ alignSelf: "center", fontSize: 12, color: "var(--cream-faint)" }}>{index + 1}/{slides.length}</div>
              <button className="button-primary" onClick={next} type="button">
                {index < slides.length - 1 ? "次へ" : "完了して開始"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



