"use client";

import { Card } from "@/components/ui/Card";
import type { QuizAnswerFeedback, SessionQuestion } from "@/lib/quiz-session-api-types";

export type QuizPlayPanelProps = {
  currentQuestion: SessionQuestion;
  currentIndex: number;
  questionTotal: number;
  selectedIndexes: number[];
  checkingAnswer: boolean;
  answerError: string | null;
  answerFeedback: QuizAnswerFeedback | null;
  onToggleAnswer: (index: number) => void;
  onJudge: () => void;
  onNext: () => void;
};

export function QuizPlayPanel({
  currentQuestion,
  currentIndex,
  questionTotal,
  selectedIndexes,
  checkingAnswer,
  answerError,
  answerFeedback,
  onToggleAnswer,
  onJudge,
  onNext,
}: QuizPlayPanelProps) {
  return (
    <Card>
      <div className="quiz-progress-row">
        <span className="pill">{currentQuestion.category}</span>
        <span className="helper-text">
          {currentIndex + 1} / {questionTotal}
        </span>
      </div>
      <h2 className="quiz-question">{currentQuestion.question}</h2>
      <p className="helper-text">正解をすべて選んでから判定してください。</p>
      <div className="quiz-options">
        {currentQuestion.options.map((option, index) => {
          const optionStateClass = answerFeedback
            ? answerFeedback.correctIndexes.includes(index)
              ? "correct"
              : answerFeedback.selectedIndexes.includes(index) && !answerFeedback.correct
                ? "wrong"
                : ""
            : selectedIndexes.includes(index)
              ? "selected"
              : "";

          return (
            <button
              className={`quiz-option ${answerFeedback ? "locked" : ""} ${optionStateClass}`}
              disabled={Boolean(answerFeedback)}
              key={`${currentQuestion.id}-${option}`}
              onClick={() => onToggleAnswer(index)}
              type="button"
            >
              <span className="quiz-option-label">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {checkingAnswer ? <div className="quiz-answer-note">判定しています...</div> : null}
      {answerError ? <p className="helper-text">{answerError}</p> : null}
      {!answerFeedback ? (
        <button
          className="button-primary"
          disabled={selectedIndexes.length === 0 || checkingAnswer}
          onClick={() => void onJudge()}
          type="button"
        >
          この回答で判定
        </button>
      ) : null}
      {answerFeedback ? (
        <>
          <div className={`quiz-answer-note ${answerFeedback.correct ? "correct" : "wrong"}`}>
            {answerFeedback.correct ? "◯ 正解" : "✕ 不正解"}
          </div>
          <p className="helper-text">解説: {answerFeedback.explanation}</p>
          <button className="button-primary" onClick={onNext} type="button">
            {currentIndex + 1 >= questionTotal ? "結果を見る" : "次の問題へ"}
          </button>
        </>
      ) : null}
    </Card>
  );
}
