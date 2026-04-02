"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { QuizStageHubCard } from "@/components/quiz/QuizStageHubCard";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { FetchJsonError, fetchJsonWithAuth } from "@/lib/http/fetch-json";
import { withAppBasePath } from "@/lib/public-path";
import {
  isErrorPayload,
  type ErrorPayload,
  type QuizAnswerCheckPayload,
  type QuizResultPayload,
  type QuizSessionPayload,
} from "@/lib/quiz-session-api-types";
import { buildQuizResultShare, type SharePayload } from "@/lib/share/share";
import { formatCount } from "@/lib/utils/format";

const QuizPlayPanel = dynamic(
  () => import("@/components/quiz/QuizPlayPanel").then((m) => ({ default: m.QuizPlayPanel })),
  {
    loading: () => (
      <Card>
        <p className="helper-text">出題画面を読み込んでいます…</p>
      </Card>
    ),
  },
);

const QuizResultPanel = dynamic(
  () => import("@/components/quiz/QuizResultPanel").then((m) => ({ default: m.QuizResultPanel })),
  {
    loading: () => (
      <Card>
        <p className="helper-text">結果画面を読み込んでいます…</p>
      </Card>
    ),
  },
);

const QUIZ_RESULT_REFRESH_SCOPES = ["quiz", "history", "mypage"] as const;

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
      await refresh(QUIZ_RESULT_REFRESH_SCOPES);
    }

    void submit(session);
    return () => {
      cancelled = true;
    };
  }, [answers, auth.accessToken, auth.usingSupabase, currentIndex, refresh, result, session, sessionError]);

  const restart = useCallback(function restart(nextStageNumber = stageNumber) {
    setResult(null);
    setStageNumber(nextStageNumber);
    setSessionVersion((value) => value + 1);
  }, [stageNumber]);

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

  const currentQuestion = session?.questions[currentIndex] ?? null;

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

    await refresh(QUIZ_RESULT_REFRESH_SCOPES);
    window.alert(`正解数ボーナス +${formatCount(resultPayload?.bonusCorrectAnswers ?? 0)}問 を反映しました。`);
  }

  const questionTotal = session?.questionCount ?? 0;
  const finished = Boolean(session) && currentIndex >= questionTotal;
  const score = result?.score ?? 0;

  return (
    <>
      <NorenBanner label="まぐろクイズ" />
      <ShareBonusCallout variant="quiz" />
      <QuizStageHubCard
        onRestartStage={restart}
        onStageNumberChange={setStageNumber}
        snapshot={snapshot}
        stageNumber={stageNumber}
      />

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
      ) : finished && session ? (
        <QuizResultPanel
          onRestart={restart}
          onShare={() => {
            setSharePayload(
              buildQuizResultShare({
                sessionId: session.sessionId,
                score,
                questionCount: questionTotal,
                currentTitle: snapshot.history.currentTitle,
              }),
            );
          }}
          questionTotal={questionTotal}
          score={score}
          session={session}
          submitError={submitError}
          submittingResult={submittingResult}
        />
      ) : currentQuestion ? (
        <QuizPlayPanel
          answerError={answerError}
          answerFeedback={answerFeedback}
          checkingAnswer={checkingAnswer}
          currentIndex={currentIndex}
          currentQuestion={currentQuestion}
          onJudge={judgeAnswer}
          onNext={next}
          onToggleAnswer={toggleAnswer}
          questionTotal={questionTotal}
          selectedIndexes={selectedIndexes}
        />
      ) : null}
      <ShareModalDynamic onClose={() => setSharePayload(null)} onShareBonus={handleShareBonus} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
