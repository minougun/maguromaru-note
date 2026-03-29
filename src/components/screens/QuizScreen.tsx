"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { QUIZ_SESSION_SIZE, type QuizQuestionCategory } from "@/lib/quiz";
import {
  QUIZ_STAGE_CONFIGS,
  getHighestUnlockedQuizStageNumber,
  getQuizStageConfig,
  getStageProgressCount,
  getUnlockedQuizStageNumbers,
  isQuizStageUnlocked,
} from "@/lib/quiz-stages";
import { buildQuizResultShare, type SharePayload } from "@/lib/share/share";
import { buildFreshSupabaseAuthHeaders } from "@/lib/supabase/browser";
import { TITLES } from "@/lib/domain/constants";
import { formatCount } from "@/lib/utils/format";

type SessionQuestion = {
  id: string;
  category: QuizQuestionCategory;
  question: string;
  options: [string, string, string, string];
  answerProof: string;
};

type QuizSessionPayload = {
  sessionId: string;
  stageNumber: number;
  questionCount: number;
  questions: SessionQuestion[];
  expiresAt: string;
};

type QuizResultPayload = {
  ok: true;
  score: number;
  questionCount: number;
  results: Array<{
    question: SessionQuestion;
    selectedIndexes: number[];
    correct: boolean;
    correctIndex: number;
    correctIndexes: number[];
    explanation: string;
  }>;
};

type QuizAnswerCheckPayload = {
  ok: true;
  result: {
    question: SessionQuestion;
    selectedIndexes: number[];
    correct: boolean;
    correctIndex: number;
    correctIndexes: number[];
    explanation: string;
  };
};

type ErrorPayload = {
  error?: string;
};

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === "object" && value !== null && "error" in value;
}

export function QuizScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [stageNumber, setStageNumber] = useState(1);
  const [sessionVersion, setSessionVersion] = useState(1);
  const [session, setSession] = useState<QuizSessionPayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<QuizAnswerCheckPayload["result"] | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResultPayload | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  useEffect(() => {
    if (loading || error || !snapshot || result) {
      return;
    }

    let cancelled = false;

    async function loadSession() {
      setLoadingSession(true);
      setSessionError(null);
      setSubmitError(null);
      setAnswerError(null);
      setResult(null);
      setCurrentIndex(0);
      setSelectedIndexes([]);
      setCheckingAnswer(false);
      setAnswerFeedback(null);
      setAnswers([]);

      const response = await fetch("/api/quiz-sessions", {
        method: "POST",
        headers: await buildFreshSupabaseAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ stageNumber }),
      });

      const payload = (await response.json().catch(() => null)) as QuizSessionPayload | ErrorPayload | null;
      if (cancelled) {
        return;
      }

      if (!response.ok || !payload || isErrorPayload(payload)) {
        setSessionError(isErrorPayload(payload) ? payload.error ?? "クイズセッションの作成に失敗しました。" : "クイズセッションの作成に失敗しました。");
        setSession(null);
        setLoadingSession(false);
        return;
      }

      setSession(payload);
      setLoadingSession(false);
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [error, loading, refresh, result, sessionVersion, snapshot, stageNumber]);

  useEffect(() => {
    if (!session || result || sessionError || currentIndex < session.questions.length) {
      return;
    }

    let cancelled = false;

    async function submit(activeSession: QuizSessionPayload) {
      setSubmittingResult(true);
      setSubmitError(null);

      const response = await fetch("/api/quiz-results", {
        method: "POST",
        headers: await buildFreshSupabaseAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          answers,
        }),
      });

      const payload = (await response.json().catch(() => null)) as QuizResultPayload | ErrorPayload | null;
      if (cancelled) {
        return;
      }

      if (!response.ok || !payload || isErrorPayload(payload)) {
        setSubmitError(isErrorPayload(payload) ? payload.error ?? "クイズ結果の保存に失敗しました。" : "クイズ結果の保存に失敗しました。");
        setSubmittingResult(false);
        return;
      }

      setResult(payload);
      setSubmittingResult(false);
      await refresh();
    }

    void submit(session);
    return () => {
      cancelled = true;
    };
  }, [answers, currentIndex, refresh, result, session, sessionError]);

  if (loading) {
    return <ScreenState description="クイズデータを読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "クイズ画面を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  function restart(nextStageNumber = stageNumber) {
    setResult(null);
    setStageNumber(nextStageNumber);
    setSessionVersion((value) => value + 1);
  }

  function toggleAnswer(index: number) {
    if (checkingAnswer || answerFeedback) {
      return;
    }

    setSelectedIndexes((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index].sort((left, right) => left - right),
    );
  }

  async function judgeAnswer() {
    if (checkingAnswer || !session || !currentQuestion || selectedIndexes.length === 0) {
      return;
    }

    setCheckingAnswer(true);
    setAnswerError(null);

    const response = await fetch("/api/quiz-answer-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        questionId: currentQuestion.id,
        answerIndexes: selectedIndexes,
        answerProof: currentQuestion.answerProof,
      }),
    });

    const payload = (await response.json().catch(() => null)) as QuizAnswerCheckPayload | ErrorPayload | null;
    if (!response.ok || !payload || isErrorPayload(payload)) {
      setAnswerError(isErrorPayload(payload) ? payload.error ?? "回答の判定に失敗しました。" : "回答の判定に失敗しました。");
      setCheckingAnswer(false);
      return;
    }

    setAnswerFeedback(payload.result);
    setCheckingAnswer(false);
  }

  function next() {
    if (!answerFeedback) {
      return;
    }

    setAnswers((current) => [...current, answerFeedback.selectedIndexes]);
    setSelectedIndexes([]);
    setCheckingAnswer(false);
    setAnswerFeedback(null);
    setAnswerError(null);
    setCurrentIndex((value) => value + 1);
  }

  async function handleShareBonus(payload: SharePayload, channel: "x" | "line" | "instagram") {
    if (!payload.bonusTarget) {
      return;
    }

    const response = await fetch("/api/share-bonuses", {
      method: "POST",
      headers: await buildFreshSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        targetType: payload.bonusTarget.targetType,
        targetId: payload.bonusTarget.targetId,
        channel,
      }),
    });
    const resultPayload = (await response.json().catch(() => null)) as
      | { error?: string; alreadyClaimed?: boolean; bonusCorrectAnswers?: number }
      | null;

    if (!response.ok) {
      window.alert(resultPayload?.error ?? "シェアボーナスの記録に失敗しました。");
      return;
    }

    if (resultPayload?.alreadyClaimed) {
      window.alert("このクイズ結果のシェアボーナスは受取済みです。");
      return;
    }

    await refresh();
    window.alert(`正解数ボーナス +${formatCount(resultPayload?.bonusCorrectAnswers ?? 0)}問 を反映しました。`);
  }

  const questionTotal = session?.questionCount ?? 0;
  const currentQuestion = session?.questions[currentIndex] ?? null;
  const finished = Boolean(session) && currentIndex >= questionTotal;
  const score = result?.score ?? 0;
  const currentStage = getQuizStageConfig(stageNumber);
  const unlockedStageNumbers = getUnlockedQuizStageNumbers({
    correctByStage: snapshot.history.quizStageProgress.correctByStage,
  });
  const highestUnlockedStageNumber = getHighestUnlockedQuizStageNumber({
    correctByStage: snapshot.history.quizStageProgress.correctByStage,
  });
  const viewingStage = getQuizStageConfig(stageNumber);
  const isViewingLocked = !isQuizStageUnlocked(stageNumber, {
    correctByStage: snapshot.history.quizStageProgress.correctByStage,
  });
  const canGoPrev = stageNumber > 1;
  const canGoNext = stageNumber < QUIZ_STAGE_CONFIGS.length;

  return (
    <>
      <NorenBanner label="まぐろクイズ" />
      <Card glow>
        <div className="quiz-info-header">
          <div className="quiz-info-stage">
            <div className="summary-label">現在のステージ</div>
            <div className="summary-title">{currentStage.stage}</div>
            <div className="quiz-info-subtitle">{currentStage.title}　─　{currentStage.difficultyLabel}</div>
          </div>
          <div className="quiz-info-stats">
            <div className="quiz-info-stat">
              <div className="summary-label">累計正解</div>
              <div className="summary-value">{formatCount(snapshot.history.quizStats.totalCorrectAnswers)}問</div>
            </div>
            <div className="quiz-info-stat">
              <div className="summary-label">最高到達</div>
              <div className="summary-value">STAGE {highestUnlockedStageNumber}</div>
            </div>
          </div>
        </div>
        {(() => {
          const masterTitle = TITLES.find((t) => t.id === "master")!;
          const totalCorrect = snapshot.history.quizStats.totalCorrectAnswers;
          const goal = masterTitle.requiredQuizCorrect;
          const pct = Math.min(Math.round((totalCorrect / goal) * 100), 100);
          const reached = totalCorrect >= goal;
          return (
            <div className="quiz-master-progress">
              <div className="quiz-master-progress-header">
                <span className="progress-label">👑 {masterTitle.name}への道</span>
                <span className="progress-label">{pct}%</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="progress-caption">
                {reached
                  ? `${masterTitle.name}到達！おめでとうございます！`
                  : `累計 ${formatCount(totalCorrect)} / ${formatCount(goal)} 問正解`}
              </p>
            </div>
          );
        })()}
        <p className="helper-text" style={{ marginTop: 8 }}>
          各ステージ内で累計 10問正解すると次のステージが解放。問題内容と難易度はステージごとに切り替わります。
        </p>
        <div className="quiz-stage-single">
          <button
            className="quiz-stage-nav-btn"
            disabled={!canGoPrev}
            onClick={() => setStageNumber(stageNumber - 1)}
            type="button"
          >
            ◀
          </button>
          <button
            className="button-choice quiz-stage-card quiz-stage-card-single"
            data-active={!isViewingLocked}
            data-locked={isViewingLocked}
            disabled={isViewingLocked}
            onClick={() => restart(stageNumber)}
            type="button"
          >
            <span className="quiz-stage-label">{isViewingLocked ? `🔒 ${viewingStage.stage}` : viewingStage.stage}</span>
            <span className="quiz-stage-count">{viewingStage.title}</span>
            <span className="quiz-stage-detail">
              {isViewingLocked
                ? `STAGE ${stageNumber - 1} で累計 ${QUIZ_SESSION_SIZE} 問正解で開放`
                : `${viewingStage.detail} ・ 累計 ${formatCount(getStageProgressCount({ correctByStage: snapshot.history.quizStageProgress.correctByStage }, stageNumber))} / ${QUIZ_SESSION_SIZE}`}
            </span>
          </button>
          <button
            className="quiz-stage-nav-btn"
            disabled={!canGoNext}
            onClick={() => setStageNumber(stageNumber + 1)}
            type="button"
          >
            ▶
          </button>
        </div>
      </Card>

      {loadingSession ? (
        <Card>
          <p className="helper-text">クイズセッションを準備しています...</p>
        </Card>
      ) : sessionError ? (
        <Card>
          <p className="helper-text">{sessionError}</p>
          <button className="button-outline" onClick={() => restart()} type="button">
            再試行
          </button>
        </Card>
      ) : finished ? (
        <Card>
          <div className="quiz-result">
            <div className="progress-big">{session ? Math.round((score / Math.max(session.questionCount, 1)) * 100) : 0}%</div>
            <p className="progress-caption">
              {score} / {questionTotal} 問正解
            </p>
            <p className="helper-text">
              SNS でこの結果をシェアすると、今回の正解数は 1.2 倍で集計されます。ボーナスは1結果につき1回までです。
            </p>
            {submittingResult ? <p className="helper-text">結果を保存しています...</p> : null}
            {submitError ? <p className="helper-text">{submitError}</p> : null}
            <div className="quiz-result-actions">
              <button
                className="button-outline"
                onClick={() => {
                  if (!session) {
                    return;
                  }

                  setSharePayload(
                    buildQuizResultShare({
                      sessionId: session.sessionId,
                      score,
                      questionCount: questionTotal,
                      currentTitle: snapshot.history.currentTitle,
                    }),
                  );
                }}
                type="button"
              >
                シェアで1.2倍
              </button>
              <button className="button-primary" onClick={() => restart()} type="button">
                もう一度チャレンジ
              </button>
              <Link className="button-outline inline-button" href="/">
                ホームに戻る
              </Link>
            </div>
          </div>
        </Card>
      ) : currentQuestion ? (
        <Card>
          <div className="quiz-progress-row">
            <span className="pill">{currentQuestion.category}</span>
            <span className="helper-text">{currentIndex + 1} / {questionTotal}</span>
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
                  onClick={() => toggleAnswer(index)}
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
              onClick={() => void judgeAnswer()}
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
              <button className="button-primary" onClick={next} type="button">
                {currentIndex + 1 >= questionTotal ? "結果を見る" : "次の問題へ"}
              </button>
            </>
          ) : null}
        </Card>
      ) : null}
      <ShareModal onClose={() => setSharePayload(null)} onShareBonus={handleShareBonus} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
