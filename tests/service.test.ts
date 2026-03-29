import assert from "node:assert/strict";
import test from "node:test";

import {
  seededMenuItemStatuses,
  seededQuizSessions,
  seededQuizStats,
  seededShareBonusEvents,
  seededStoreStatus,
  seededVisitLogParts,
  seededVisitLogs,
} from "@/lib/domain/seed";
import { createMockViewerContext, writeMockState } from "@/lib/mock/store";
import { getUnlockedQuizStageNumbers, isQuizStageUnlocked } from "@/lib/quiz-stages";
import { getCurrentTitle } from "@/lib/titles";
import {
  checkQuizAnswer,
  claimShareBonus,
  createQuizSessionForViewer,
  deleteVisit,
  getAppSnapshot,
  recordVisit,
  submitQuizSession,
  updateStoreStatus,
} from "@/lib/services/app-service";

test("getCurrentTitle requires both visit count and quiz correct answers", () => {
  assert.equal(getCurrentTitle(1, 0, 0)?.id, "beginner");
  assert.equal(getCurrentTitle(3, 5, 200)?.id, "akami_fan");
  assert.equal(getCurrentTitle(5, 5, 500)?.id, "chutoro");
  assert.equal(getCurrentTitle(10, 6, 750)?.id, "hunter");
  assert.equal(getCurrentTitle(20, 6, 1000)?.id, "master");
  assert.equal(getCurrentTitle(10, 4, 900)?.id, "beginner");
  assert.equal(getCurrentTitle(0, 8, 2000), null);
});

test("recordVisit rejects payload without menu selection", async () => {
  await assert.rejects(
    () =>
      recordVisit({
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        memo: "x",
        photoDataUrl: null,
      }),
    /Invalid option/,
  );
});

test("recordVisit rejects invalid extra key payload", async () => {
  await assert.rejects(
    () =>
      recordVisit({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        memo: "x",
        photoDataUrl: null,
        extra: true,
      }),
    /Unrecognized key/,
  );
});

test("deleteVisit rejects invalid uuid", async () => {
  await assert.rejects(() => deleteVisit("not-a-uuid"), /Invalid UUID/);
});

test("submitQuizSession rejects empty answers", async () => {
  await assert.rejects(
    () =>
      submitQuizSession({
        sessionId: "10000000-0000-4000-8000-000000000001",
        answers: [],
      }),
    /回答が空です/,
  );
});

test("mock viewer is not admin by default", () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
  delete process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;

  try {
    assert.equal(createMockViewerContext().role, "user");
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_ADMIN = previous;
    }
  }
});

test("updateStoreStatus rejects unauthorized mutation in mock mode by default", async () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
  delete process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;

  try {
    await assert.rejects(
      () =>
        updateStoreStatus({
          recommendation: "今日はまぐろ丼がおすすめ",
          status: "busy",
          statusNote: "少し並びます",
          weatherComment: "雨なので足元注意",
          menuStocks: {
            maguro_don: "available",
            maguro_don_mini: "available",
            tokujo_don: "few",
            tokujo_don_mini: "soldout",
          },
        }),
      /管理者のみ更新できます/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_ADMIN = previous;
    }
  }
});

test("mock viewer becomes admin only when explicitly enabled", () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
  process.env.MAGUROMARU_ENABLE_MOCK_ADMIN = "true";

  try {
    assert.equal(createMockViewerContext().role, "admin");
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_ADMIN = previous;
    }
  }
});

test("updateStoreStatus succeeds in mock mode only when explicitly enabled", async () => {
  const previous = process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
  process.env.MAGUROMARU_ENABLE_MOCK_ADMIN = "true";

  try {
    const result = await updateStoreStatus({
      recommendation: "今日はまぐろ丼がおすすめ",
      status: "busy",
      statusNote: "少し並びます",
      weatherComment: "雨なので足元注意",
      menuStocks: {
        maguro_don: "available",
        maguro_don_mini: "few",
        tokujo_don: "few",
        tokujo_don_mini: "soldout",
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.storeStatus.status, "busy");
    assert.equal(result.menuItemStatuses.maguro_don_mini, "few");
  } finally {
    if (previous === undefined) {
      delete process.env.MAGUROMARU_ENABLE_MOCK_ADMIN;
    } else {
      process.env.MAGUROMARU_ENABLE_MOCK_ADMIN = previous;
    }
  }
});

test("quiz session is server-scored and cannot be submitted twice", async () => {
  const session = await createQuizSessionForViewer({ stageNumber: 1 });
  assert.equal(session.questions.length, 10);
  assert.equal(typeof session.questions[0]?.answerProof, "string");

  const first = await submitQuizSession({
    sessionId: session.sessionId,
    answers: Array.from({ length: 10 }, () => [0]),
  });
  assert.equal(first.ok, true);
  assert.equal(first.results.length, 10);

  await assert.rejects(
    () =>
      submitQuizSession({
        sessionId: session.sessionId,
        answers: Array.from({ length: 10 }, () => [0]),
      }),
    /すでに保存済み/,
  );
});

function pickWrongQuizSelection(correctIndexes: number[]): number[] {
  const sorted = [...correctIndexes].sort((a, b) => a - b);
  if (sorted.length >= 2) {
    return [sorted[0]!];
  }
  const c = sorted[0] ?? 0;
  return [(c + 1) % 4];
}

test("quiz stage 2 stays locked when stage 1 only scored 5/10 in two separate sessions", async () => {
  await writeMockState({
    menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
    quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
    visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
    visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
    storeStatus: { ...seededStoreStatus },
    quizStats: [{ ...seededQuizStats }],
    shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
  });

  for (let round = 0; round < 2; round++) {
    const s = await createQuizSessionForViewer({ stageNumber: 1 });
    const answers: number[][] = [];
    for (let i = 0; i < s.questions.length; i++) {
      const q = s.questions[i]!;
      const probe = await checkQuizAnswer({
        sessionId: s.sessionId,
        questionId: q.id,
        answerProof: q.answerProof,
        answerIndexes: [0],
      });
      const correctIdxs = probe.result.correctIndexes;
      answers.push(i < 5 ? [...correctIdxs] : pickWrongQuizSelection(correctIdxs));
    }
    const sub = await submitQuizSession({ sessionId: s.sessionId, answers });
    assert.equal(sub.score, 5);
  }

  await assert.rejects(() => createQuizSessionForViewer({ stageNumber: 2 }), /前のステージを10問すべて正解/);
});

test("quiz stages unlock only after a perfect clear (10/10) on the previous stage", () => {
  assert.deepEqual(getUnlockedQuizStageNumbers({ correctByStage: { 1: 0, 2: 0, 3: 0 } }), [1]);
  assert.equal(isQuizStageUnlocked(2, { correctByStage: { 1: 10, 2: 0, 3: 0 } }), true);
  assert.equal(isQuizStageUnlocked(2, { correctByStage: { 1: 5, 2: 0, 3: 0 } }), false);
  assert.equal(isQuizStageUnlocked(3, { correctByStage: { 1: 10, 2: 9, 3: 0 } }), false);
  assert.equal(isQuizStageUnlocked(3, { correctByStage: { 1: 10, 2: 10, 3: 0 } }), true);
});

test("createQuizSessionForViewer rejects locked stages", async () => {
  await writeMockState({
    menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
    quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
    visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
    visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
    storeStatus: { ...seededStoreStatus },
    quizStats: [{ ...seededQuizStats, total_correct_answers: 999, total_answered_questions: 999, quizzes_completed: 0, best_score: 999, best_question_count: 50 }],
    shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
  });

  await assert.rejects(
    () => createQuizSessionForViewer({ stageNumber: 100 }),
    /前のステージを10問すべて正解していないため/,
  );
});

test("checkQuizAnswer returns immediate correctness and explanation", async () => {
  const session = await createQuizSessionForViewer({ stageNumber: 1 });
  const firstQuestion = session.questions[0];
  const result = await checkQuizAnswer({
    sessionId: session.sessionId,
    questionId: firstQuestion.id,
    answerIndexes: [0],
    answerProof: firstQuestion.answerProof,
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.question.id, firstQuestion.id);
  assert.equal(typeof result.result.correct, "boolean");
  assert.equal(typeof result.result.explanation, "string");
});

test("checkQuizAnswer rejects question ids outside the active session", async () => {
  const session = await createQuizSessionForViewer({ stageNumber: 1 });

  await assert.rejects(
    () =>
      checkQuizAnswer({
        sessionId: session.sessionId,
        questionId: "not-in-session-question",
        answerIndexes: [0],
        answerProof: session.questions[0].answerProof,
      }),
    /問題の照合に失敗しました/,
  );
});

test("checkQuizAnswer rejects tampered proof tokens", async () => {
  const session = await createQuizSessionForViewer({ stageNumber: 1 });

  await assert.rejects(
    () =>
      checkQuizAnswer({
        sessionId: session.sessionId,
        questionId: session.questions[0].id,
        answerIndexes: [0],
        answerProof: `${session.questions[0].answerProof}x`,
      }),
    /回答の判定トークンが不正です/,
  );
});

test("claimShareBonus boosts visit counts only once per visit record", async () => {
  const snapshotBefore = await getAppSnapshot();
  const created = await recordVisit({
    menuItemId: "maguro_don",
    visitedAt: "2026-03-29",
    partIds: ["akami"],
    memo: "share bonus test",
    photoDataUrl: null,
  });
  assert.ok(created.record);

  const first = await claimShareBonus({
    targetType: "visit_log",
    targetId: created.id,
    channel: "x",
  });
  assert.equal(first.ok, true);
  assert.equal(first.alreadyClaimed, false);
  assert.equal(first.bonusVisitCount, 0.2);

  const second = await claimShareBonus({
    targetType: "visit_log",
    targetId: created.id,
    channel: "line",
  });
  assert.equal(second.ok, true);
  assert.equal(second.alreadyClaimed, true);

  const snapshotAfter = await getAppSnapshot();
  assert.equal(snapshotAfter.history.visitCount, Number((snapshotBefore.history.visitCount + 1.2).toFixed(1)));
  assert.equal(snapshotAfter.history.logs.find((entry) => entry.id === created.id)?.shareBonusClaimed, true);
});

test("claimShareBonus boosts quiz correct answers only once per result", async () => {
  const snapshotBefore = await getAppSnapshot();
  const session = await createQuizSessionForViewer({ stageNumber: 1 });
  const submitted = await submitQuizSession({
    sessionId: session.sessionId,
    answers: session.questions.map(() => [0]),
  });

  const first = await claimShareBonus({
    targetType: "quiz_session",
    targetId: session.sessionId,
    channel: "x",
  });
  assert.equal(first.ok, true);
  assert.equal(first.alreadyClaimed, false);
  assert.equal(first.bonusCorrectAnswers, (submitted.score * 2) / 10);

  const second = await claimShareBonus({
    targetType: "quiz_session",
    targetId: session.sessionId,
    channel: "line",
  });
  assert.equal(second.ok, true);
  assert.equal(second.alreadyClaimed, true);

  const snapshotAfter = await getAppSnapshot();
  assert.equal(snapshotAfter.history.quizStats.totalCorrectAnswers, snapshotBefore.history.quizStats.totalCorrectAnswers + submitted.score + (submitted.score * 0.2));
});

test("claimShareBonus rejects unknown targets", async () => {
  await assert.rejects(
    () =>
      claimShareBonus({
        targetType: "visit_log",
        targetId: "10000000-0000-4000-8000-999999999999",
        channel: "x",
      }),
    /シェア対象の記録が見つかりません/,
  );
});
