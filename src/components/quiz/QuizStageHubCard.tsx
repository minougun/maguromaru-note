"use client";

import { memo } from "react";

import { Card } from "@/components/ui/Card";
import { quizStageCount } from "@/lib/domain/constants";
import type { AppSnapshot } from "@/lib/domain/types";
import { QUIZ_MASTER_TITLE_FOR_PROGRESS } from "@/lib/quiz-master-progress";
import { QUIZ_SESSION_SIZE } from "@/lib/quiz-session-constants";
import { getQuizStageConfig, getStageProgressCount, isQuizStageUnlocked } from "@/lib/quiz-stages";
import { formatCount } from "@/lib/utils/format";

export type QuizStageHubCardProps = {
  snapshot: AppSnapshot;
  stageNumber: number;
  onStageNumberChange: (next: number) => void;
  onRestartStage: (nextStageNumber?: number) => void;
};

export const QuizStageHubCard = memo(function QuizStageHubCard({
  snapshot,
  stageNumber,
  onStageNumberChange,
  onRestartStage,
}: QuizStageHubCardProps) {
  const viewingStage = getQuizStageConfig(stageNumber);
  const isViewingLocked = !isQuizStageUnlocked(stageNumber, {
    correctByStage: snapshot.history.quizStageProgress.correctByStage,
  });
  const canGoPrev = stageNumber > 1;
  const canGoNext = stageNumber < quizStageCount;

  const totalCorrect = snapshot.history.quizStats.totalCorrectAnswers;
  const goal = QUIZ_MASTER_TITLE_FOR_PROGRESS.requiredQuizCorrect;
  const pct = Math.min(Math.round((totalCorrect / goal) * 100), 100);
  const reached = totalCorrect >= goal;
  const name = QUIZ_MASTER_TITLE_FOR_PROGRESS.name;

  return (
    <Card glow>
      <div className="quiz-master-progress">
        <div className="quiz-master-progress-header">
          <span className="progress-label">👑 {name}への道</span>
          <span className="progress-label">{pct}%</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="progress-caption">
          {reached ? `${name}到達！おめでとうございます！` : `正解済み${formatCount(totalCorrect)}/${formatCount(goal)}`}
        </p>
      </div>
      <p className="helper-text quiz-unlock-hint">
        各ステージ10問。全ての問題に正解すると次のステージが解放されます。
      </p>
      <div className="quiz-stage-single">
        <button
          className="quiz-stage-nav-btn"
          disabled={!canGoPrev}
          onClick={() => onStageNumberChange(stageNumber - 1)}
          type="button"
        >
          ◀
        </button>
        <button
          className="button-choice quiz-stage-card quiz-stage-card-single"
          data-active={!isViewingLocked}
          data-locked={isViewingLocked}
          disabled={isViewingLocked}
          onClick={() => onRestartStage(stageNumber)}
          type="button"
        >
          <span className="quiz-stage-label">{isViewingLocked ? `🔒 ${viewingStage.stage}` : viewingStage.stage}</span>
          <span className="quiz-stage-count">{viewingStage.title}</span>
          <span className="quiz-stage-detail">
            {isViewingLocked
              ? `STAGE ${stageNumber - 1} で全ての問題に正解すると開放`
              : `${viewingStage.detail} ・ 正解済み${formatCount(getStageProgressCount({ correctByStage: snapshot.history.quizStageProgress.correctByStage }, stageNumber))}/${QUIZ_SESSION_SIZE}`}
          </span>
        </button>
        <button
          className="quiz-stage-nav-btn"
          disabled={!canGoNext}
          onClick={() => onStageNumberChange(stageNumber + 1)}
          type="button"
        >
          ▶
        </button>
      </div>
    </Card>
  );
});
