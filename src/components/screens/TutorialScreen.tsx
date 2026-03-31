"use client";

import { useState } from "react";
type Props = {
  onClose: () => void;
};
export default function TutorialScreen({ onClose }: Props) {
  const slides = [
    {
      title: "ようこそ、まぐろ丸へ！",
      body: "このアプリは来店記録やクイズで遊びながら、まぐろに詳しくなるアプリです。",
    },
    {
      title: "記録をシェア",
      body: "記録をシェアすると来店回数が1.2倍になります（※効果は大げさに表現しています）。",
    },
    {
      title: "クイズをシェア",
      body: "クイズ結果をシェアすると正解数が1.2倍になります（※無いかもしれません）。",
    },
    {
      title: "称号を獲得",
      body: "特定の条件で称号を獲得できます。称号はあなたの実力を示します。",
    },
    {
      title: "まぐろマスターへの道",
      body: "最終的にまぐろマスターを目指しましょう！何か良いことがある……かもしれません（※無いかもしれません）。",
    },
    {
      title: "さあ始めよう",
      body: "準備OKなら始めましょう。いつでもこのチュートリアルは設定から再表示できます。",
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



