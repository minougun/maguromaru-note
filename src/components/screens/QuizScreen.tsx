"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { QUIZ_SESSION_SIZE } from "@/lib/quiz-session-constants";
import type { QuizQuestionCategory } from "@/lib/quiz-types";
import { quizStageCount } from "@/lib/domain/constants";
import { QUIZ_MASTER_TITLE_FOR_PROGRESS } from "@/lib/quiz-master-progress";
import { getQuizStageConfig, getStageProgressCount, isQuizStageUnlocked } from "@/lib/quiz-stages";
import { FetchJsonError, fetchJsonWithAuth } from "@/lib/http/fetch-json";
import { withAppBasePath } from "@/lib/public-path";
import { buildQuizResultShare, type SharePayload } from "@/lib/share/share";
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
  const auth = useAuthState();
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

      let payload: QuizSessionPayload | ErrorPayload;
      try {
        payload = await fetchJsonWithAuth(
          withAppBasePath("/api/quiz-sessions"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stageNumber }),
          },
          { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        setSessionError(err instanceof FetchJsonError ? err.message : "クイズセッションの作成に失敗しました。");
        setSession(null);
        setLoadingSession(false);
        return;
      }
      if (cancelled) {
        return;
      }

      if (!payload || isErrorPayload(payload)) {
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
  }, [auth.accessToken, auth.usingSupabase, error, loading, refresh, result, sessionVersion, snapshot, stageNumber]);

  useEffect(() => {
    if (!session || result || sessionError || currentIndex < session.questions.length) {
      return;
    }

    let cancelled = false;

    async function submit(activeSession: QuizSessionPayload) {
      setSubmittingResult(true);
      setSubmitError(null);

      let payload: QuizResultPayload | ErrorPayload;
      try {
        payload = await fetchJsonWithAuth(
          withAppBasePath("/api/quiz-results"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: activeSession.sessionId,
              answers,
            }),
          },
          { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        setSubmitError(err instanceof FetchJsonError ? err.message : "クイズ結果の保存に失敗しました。");
        setSubmittingResult(false);
        return;
      }
      if (cancelled) {
        return;
      }

      if (!payload || isErrorPayload(payload)) {
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
  }, [answers, auth.accessToken, auth.usingSupabase, currentIndex, refresh, result, session, sessionError]);

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

    let payload: QuizAnswerCheckPayload | ErrorPayload;
    try {
      payload = await fetchJsonWithAuth(
        withAppBasePath("/api/quiz-answer-check"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            questionId: currentQuestion.id,
            answerIndexes: selectedIndexes,
            answerProof: currentQuestion.answerProof,
          }),
        },
        { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
      );
    } catch (err) {
      setAnswerError(err instanceof FetchJsonError ? err.message : "回答の判定に失敗しました。");
      setCheckingAnswer(false);
      return;
    }

    if (!payload || isErrorPayload(payload)) {
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

    let resultPayload: { error?: string; alreadyClaimed?: boolean; bonusCorrectAnswers?: number };
    try {
      resultPayload = await fetchJsonWithAuth(
        withAppBasePath("/api/share-bonuses"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: payload.bonusTarget.targetType,
            targetId: payload.bonusTarget.targetId,
            channel,
          }),
        },
        { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
      );
    } catch (err) {
      window.alert(err instanceof FetchJsonError ? err.message : "シェアボーナスの記録に失敗しました。");
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
  const viewingStage = getQuizStageConfig(stageNumber);
  const isViewingLocked = !isQuizStageUnlocked(stageNumber, {
    correctByStage: snapshot.history.quizStageProgress.correctByStage,
  });
  const canGoPrev = stageNumber > 1;
  const canGoNext = stageNumber < quizStageCount;

  return (
    <>
      <NorenBanner label="まぐろクイズ" />
      <ShareBonusCallout variant="quiz" />
      <Card glow>
        {(() => {
          const totalCorrect = snapshot.history.quizStats.totalCorrectAnswers;
          const goal = QUIZ_MASTER_TITLE_FOR_PROGRESS.requiredQuizCorrect;
          const pct = Math.min(Math.round((totalCorrect / goal) * 100), 100);
          const reached = totalCorrect >= goal;
          const name = QUIZ_MASTER_TITLE_FOR_PROGRESS.name;
          return (
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
          );
        })()}
        <p className="helper-text quiz-unlock-hint">
          各ステージ10問。全ての問題に正解すると次のステージが解放されます。
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
                ? `STAGE ${stageNumber - 1} で全ての問題に正解すると開放`
                : `${viewingStage.detail} ・ 正解済み${formatCount(getStageProgressCount({ correctByStage: snapshot.history.quizStageProgress.correctByStage }, stageNumber))}/${QUIZ_SESSION_SIZE}`}
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
            <ShareBonusCallout variant="quiz" />
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
                SNSでシェア（正解数1.2倍）
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
      <ShareModalDynamic onClose={() => setSharePayload(null)} onShareBonus={handleShareBonus} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
