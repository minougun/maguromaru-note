"use client";

import Link from "next/link";

import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { Card } from "@/components/ui/Card";
import type { QuizSessionPayload } from "@/lib/quiz-session-api-types";

export type QuizResultPanelProps = {
  session: QuizSessionPayload;
  score: number;
  questionTotal: number;
  submittingResult: boolean;
  submitError: string | null;
  onRestart: () => void;
  onShare: () => void;
};

export function QuizResultPanel({
  session,
  score,
  questionTotal,
  submittingResult,
  submitError,
  onRestart,
  onShare,
}: QuizResultPanelProps) {
  const pct = session ? Math.round((score / Math.max(session.questionCount, 1)) * 100) : 0;

  return (
    <Card>
      <div className="quiz-result">
        <div className="progress-big">{pct}%</div>
        <p className="progress-caption">
          {score} / {questionTotal} 問正解
        </p>
        <ShareBonusCallout variant="quiz" />
        {submittingResult ? <p className="helper-text">結果を保存しています...</p> : null}
        {submitError ? <p className="helper-text">{submitError}</p> : null}
        <div className="quiz-result-actions">
          <button className="button-outline" onClick={onShare} type="button">
            SNSでシェア（正解数1.2倍）
          </button>
          <button className="button-primary" onClick={onRestart} type="button">
            もう一度チャレンジ
          </button>
          <Link className="button-outline inline-button" href="/">
            ホームに戻る
          </Link>
        </div>
      </div>
    </Card>
  );
}
