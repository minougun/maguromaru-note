"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { QUIZ_QUESTIONS, QUIZ_SESSION_SIZES, createQuizSession } from "@/lib/quiz";
import { buildSupabaseAuthHeaders } from "@/lib/supabase/browser";

export function QuizScreen() {
  const auth = useAuthState();
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [questionCount, setQuestionCount] = useState<(typeof QUIZ_SESSION_SIZES)[number]>(10);
  const [sessionSeed, setSessionSeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [submittedSessionKey, setSubmittedSessionKey] = useState<string | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const session = useMemo(() => createQuizSession(questionCount, sessionSeed), [questionCount, sessionSeed]);
  const currentQuestion = session[currentIndex];
  const answered = selectedIndex !== null;
  const finished = currentIndex >= session.length;
  const categoryCount = new Set(QUIZ_QUESTIONS.map((question) => question.category)).size;
  const sessionKey = `${questionCount}-${sessionSeed}`;

  useEffect(() => {
    if (!finished || submittedSessionKey === sessionKey) {
      return;
    }

    let cancelled = false;

    async function submit() {
      setSubmittingResult(true);
      setSubmitError(null);
      const response = await fetch("/api/quiz-results", {
        method: "POST",
        headers: buildSupabaseAuthHeaders(auth.accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          questionCount,
          correctCount: score,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setSubmitError(payload?.error ?? "クイズ結果の保存に失敗しました。");
        setSubmittingResult(false);
        return;
      }

      setSubmittedSessionKey(sessionKey);
      setSubmittingResult(false);
      await refresh();
    }

    void submit();
    return () => {
      cancelled = true;
    };
  }, [auth.accessToken, finished, questionCount, refresh, score, sessionKey, submittedSessionKey]);

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

  function restart(nextCount = questionCount) {
    setQuestionCount(nextCount);
    setSessionSeed((value) => value + 1);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setScore(0);
    setSubmittedSessionKey(null);
    setSubmitError(null);
  }

  function answer(index: number) {
    if (answered || !currentQuestion) {
      return;
    }

    setSelectedIndex(index);
    if (index === currentQuestion.answerIndex) {
      setScore((value) => value + 1);
    }
  }

  function next() {
    if (!currentQuestion) {
      return;
    }

    setSelectedIndex(null);
    setCurrentIndex((value) => value + 1);
  }

  return (
    <>
      <NorenBanner label="まぐろクイズ" />
      <Card glow>
        <div className="quiz-hero">
          <div>
            <div className="summary-label">問題プール</div>
            <div className="summary-value">{QUIZ_QUESTIONS.length}問</div>
          </div>
          <div>
            <div className="summary-label">カテゴリ</div>
            <div className="summary-title">{categoryCount}種類</div>
          </div>
        </div>
        <p className="helper-text">
          問題はローカル生成なのでアプリの負荷は軽いままです。称号は来店回数と累計正解数の両方で決まります。
        </p>
        <div className="quiz-hero quiz-stats-panel">
          <div>
            <div className="summary-label">累計正解</div>
            <div className="summary-value">{snapshot.history.quizStats.totalCorrectAnswers}問</div>
          </div>
          <div>
            <div className="summary-label">現在の称号</div>
            <div className="summary-title">
              {snapshot.history.currentTitle
                ? `${snapshot.history.currentTitle.icon} ${snapshot.history.currentTitle.name}`
                : "来店とクイズで解放"}
            </div>
          </div>
        </div>
        <div className="quiz-count-row">
          {QUIZ_SESSION_SIZES.map((count) => (
            <button
              className="button-choice"
              data-active={questionCount === count}
              key={count}
              onClick={() => restart(count)}
              type="button"
            >
              {count}問
            </button>
          ))}
        </div>
      </Card>

      {finished ? (
        <Card>
          <div className="quiz-result">
            <div className="progress-big">{Math.round((score / Math.max(session.length, 1)) * 100)}%</div>
            <p className="progress-caption">
              {score} / {session.length} 問正解
            </p>
            <p className="helper-text">
              累計 {snapshot.history.quizStats.totalCorrectAnswers} 問正解 / 来店 {snapshot.history.visitCount} 回
            </p>
            {submittingResult ? <p className="helper-text">結果を保存しています...</p> : null}
            {submitError ? <p className="helper-text">{submitError}</p> : null}
            <div className="quiz-result-actions">
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
            <span className="helper-text">
              {currentIndex + 1} / {session.length}
            </span>
          </div>
          <h2 className="quiz-question">{currentQuestion.question}</h2>
          <div className="quiz-options">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = answered && index === currentQuestion.answerIndex;
              const isWrong = answered && index === selectedIndex && index !== currentQuestion.answerIndex;
              return (
                <button
                  className={`quiz-option ${answered ? "locked" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  disabled={answered}
                  key={`${currentQuestion.id}-${option}`}
                  onClick={() => answer(index)}
                  type="button"
                >
                  <span className="quiz-option-label">{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {answered ? (
            <>
              <div className={`quiz-answer-note ${selectedIndex === currentQuestion.answerIndex ? "correct" : "wrong"}`}>
                {selectedIndex === currentQuestion.answerIndex ? "正解です。" : "不正解です。"}
              </div>
              <p className="log-memo">{currentQuestion.explanation}</p>
              <button className="button-primary" onClick={next} type="button">
                {currentIndex + 1 >= session.length ? "結果を見る" : "次の問題へ"}
              </button>
            </>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
