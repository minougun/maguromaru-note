import assert from "node:assert/strict";
import test from "node:test";

import {
  MOCK_USER_ID,
  seededMenuItemStatuses,
  seededQuizSessions,
  seededQuizStats,
  seededShareBonusEvents,
  seededStoreStatus,
  seededVisitLogParts,
  seededVisitLogs,
} from "@/lib/domain/seed";
import { createMockViewerContext, writeMockState } from "@/lib/mock/store";
import { QUIZ_QUESTIONS } from "@/lib/quiz";
import { getUnlockedQuizStageNumbers, isQuizStageUnlocked } from "@/lib/quiz-stages";
import { getCurrentTitle } from "@/lib/titles";
import { isMissingAuthAdminUserError } from "@/lib/services/anonymous-link-service";
import {
  checkQuizAnswer,
  claimShareBonus,
  createQuizSessionForViewer,
  deleteVisit,
  getAppSnapshot,
  isMissingVisitLogPartSubjectiveColumnsError,
  normalizeVisitLogPartRows,
  recordVisit,
  submitQuizSession,
  updateStoreStatus,
} from "@/lib/services/app-service";
import { resetHomeSideDataServerCacheForTest } from "@/lib/home-side-data-server";

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

test("legacy visit_log_parts rows are normalized with null subjective fields", () => {
  assert.deepEqual(
    normalizeVisitLogPartRows([
      {
        id: "20000000-0000-4000-8000-000000000201",
        visit_log_id: "10000000-0000-4000-8000-000000000201",
        part_id: "akami",
      },
    ]),
    [
      {
        id: "20000000-0000-4000-8000-000000000201",
        visit_log_id: "10000000-0000-4000-8000-000000000201",
        part_id: "akami",
        fat_level: null,
        texture_level: null,
        satisfaction: null,
        want_again: null,
      },
    ],
  );
});

test("visit_log_parts subjective column detection only matches legacy schema errors", () => {
  assert.equal(
    isMissingVisitLogPartSubjectiveColumnsError("Could not find the 'fat_level' column of 'visit_log_parts' in the schema cache"),
    true,
  );
  assert.equal(
    isMissingVisitLogPartSubjectiveColumnsError("column visit_log_parts.texture_level does not exist"),
    true,
  );
  assert.equal(isMissingVisitLogPartSubjectiveColumnsError("permission denied for table visit_log_parts"), false);
});

test("anonymous-link missing-user detection matches auth admin not-found responses", () => {
  assert.equal(isMissingAuthAdminUserError("User not found"), true);
  assert.equal(isMissingAuthAdminUserError("user not found"), true);
  assert.equal(isMissingAuthAdminUserError("permission denied"), false);
  assert.equal(isMissingAuthAdminUserError(undefined), false);
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

test("home snapshot embeds side data for first paint", async () => {
  const snapshot = await getAppSnapshot(undefined, "home");

  assert.equal(typeof snapshot.home.sideData.weather.icon, "string");
  assert.equal(typeof snapshot.home.sideData.trivia.trivia, "string");
  assert.match(snapshot.home.sideData.trivia.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(snapshot.home.recentLogs.length <= 3);
});

test("home scope skips global part insights while zukan scope keeps them", async () => {
  resetHomeSideDataServerCacheForTest();

  const homeSnapshot = await getAppSnapshot(undefined, "home");
  const zukanSnapshot = await getAppSnapshot(undefined, "zukan");

  assert.deepEqual(homeSnapshot.zukan.globalPartInsights, {});
  assert.ok(Array.isArray(zukanSnapshot.zukan.globalPartInsights.otoro?.menuStats));
});

test("recordVisit stores per-part subjective tasting notes", async () => {
  try {
    await writeMockState({
      menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
      quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
      visitLogs: [],
      visitLogParts: [],
      storeStatus: { ...seededStoreStatus },
      quizStats: [{ ...seededQuizStats }],
      shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
    });

    await recordVisit({
      menuItemId: "tokujo_don",
      visitedAt: "2026-04-03",
      partIds: ["otoro"],
      partTastings: [
        {
          partId: "otoro",
          fatLevel: "rich",
          textureLevel: "melty",
          satisfaction: 5,
          wantAgain: true,
        },
      ],
      memo: "",
      photoDataUrl: null,
    });

    const snapshot = await getAppSnapshot(undefined, "zukan");
    assert.deepEqual(snapshot.zukan.partProfiles.otoro?.subjectiveSummary, {
      tastingCount: 1,
      dominantFatLevelLabel: "濃厚",
      dominantTextureLabel: "とろける",
      averageSatisfaction: 5,
      wantAgainRate: 100,
    });
  } finally {
    await writeMockState({
      menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
      quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
      visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
      visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
      storeStatus: { ...seededStoreStatus },
      quizStats: [{ ...seededQuizStats }],
      shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
    });
  }
});

test("zukan snapshot includes per-part menu appearance insights from personal history", async () => {
  try {
    await writeMockState({
      menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
      quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
      visitLogs: [
        {
          id: "10000000-0000-4000-8000-000000000101",
          user_id: MOCK_USER_ID,
          menu_item_id: "maguro_don",
          visited_at: "2026-03-20",
          memo: null,
          photo_url: null,
          created_at: "2026-03-20T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000102",
          user_id: MOCK_USER_ID,
          menu_item_id: "maguro_don",
          visited_at: "2026-03-21",
          memo: null,
          photo_url: null,
          created_at: "2026-03-21T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000103",
          user_id: MOCK_USER_ID,
          menu_item_id: "maguro_don",
          visited_at: "2026-03-22",
          memo: null,
          photo_url: null,
          created_at: "2026-03-22T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000104",
          user_id: MOCK_USER_ID,
          menu_item_id: "maguro_don_mini",
          visited_at: "2026-03-23",
          memo: null,
          photo_url: null,
          created_at: "2026-03-23T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000105",
          user_id: MOCK_USER_ID,
          menu_item_id: "maguro_don_mini",
          visited_at: "2026-03-24",
          memo: null,
          photo_url: null,
          created_at: "2026-03-24T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000106",
          user_id: MOCK_USER_ID,
          menu_item_id: "tokujo_don",
          visited_at: "2026-03-25",
          memo: null,
          photo_url: null,
          created_at: "2026-03-25T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000107",
          user_id: MOCK_USER_ID,
          menu_item_id: "tokujo_don",
          visited_at: "2026-03-26",
          memo: null,
          photo_url: null,
          created_at: "2026-03-26T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000108",
          user_id: "00000000-0000-4000-8000-000000000099",
          menu_item_id: "maguro_don",
          visited_at: "2026-03-27",
          memo: null,
          photo_url: null,
          created_at: "2026-03-27T12:00:00.000Z",
        },
        {
          id: "10000000-0000-4000-8000-000000000109",
          user_id: "00000000-0000-4000-8000-000000000099",
          menu_item_id: "maguro_don",
          visited_at: "2026-03-28",
          memo: null,
          photo_url: null,
          created_at: "2026-03-28T12:00:00.000Z",
        },
      ],
      visitLogParts: [
        { id: "20000000-0000-4000-8000-000000000101", visit_log_id: "10000000-0000-4000-8000-000000000101", part_id: "otoro", fat_level: "rich", texture_level: "melty", satisfaction: 5, want_again: true },
        { id: "20000000-0000-4000-8000-000000000102", visit_log_id: "10000000-0000-4000-8000-000000000102", part_id: "akami", fat_level: "light", texture_level: "firm", satisfaction: 3, want_again: false },
        { id: "20000000-0000-4000-8000-000000000103", visit_log_id: "10000000-0000-4000-8000-000000000103", part_id: "akami", fat_level: "light", texture_level: "firm", satisfaction: 4, want_again: true },
        { id: "20000000-0000-4000-8000-000000000104", visit_log_id: "10000000-0000-4000-8000-000000000104", part_id: "otoro", fat_level: "balanced", texture_level: "smooth", satisfaction: 4, want_again: true },
        { id: "20000000-0000-4000-8000-000000000105", visit_log_id: "10000000-0000-4000-8000-000000000105", part_id: "akami", fat_level: "balanced", texture_level: "smooth", satisfaction: 4, want_again: true },
        { id: "20000000-0000-4000-8000-000000000106", visit_log_id: "10000000-0000-4000-8000-000000000106", part_id: "otoro", fat_level: "rich", texture_level: "melty", satisfaction: 5, want_again: true },
        { id: "20000000-0000-4000-8000-000000000107", visit_log_id: "10000000-0000-4000-8000-000000000107", part_id: "otoro", fat_level: "rich", texture_level: "melty", satisfaction: 5, want_again: true },
        { id: "20000000-0000-4000-8000-000000000108", visit_log_id: "10000000-0000-4000-8000-000000000108", part_id: "otoro", fat_level: "balanced", texture_level: "smooth", satisfaction: 4, want_again: true },
        { id: "20000000-0000-4000-8000-000000000109", visit_log_id: "10000000-0000-4000-8000-000000000109", part_id: "otoro", fat_level: "balanced", texture_level: "smooth", satisfaction: 4, want_again: true },
      ],
      storeStatus: { ...seededStoreStatus },
      quizStats: [{ ...seededQuizStats }],
      shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
    });

    const snapshot = await getAppSnapshot(undefined, "zukan");
    const otoroInsight = snapshot.zukan.partInsights.otoro;
    const otoroGlobalInsight = snapshot.zukan.globalPartInsights.otoro;
    const meuraInsight = snapshot.zukan.partInsights.meura;
    const akamiProfile = snapshot.zukan.partProfiles.akami;
    const meuraProfile = snapshot.zukan.partProfiles.meura;

    assert.ok(otoroInsight);
    assert.equal(otoroInsight.totalAppearances, 4);
    assert.deepEqual(otoroInsight.menuStats.slice(0, 3), [
      {
        menuItemId: "tokujo_don",
        menuItemName: "特上まぐろ丼（大とろ入り）",
        appearances: 2,
        totalMenuVisits: 2,
        appearanceRate: 100,
      },
      {
        menuItemId: "maguro_don_mini",
        menuItemName: "まぐろ丼ミニ",
        appearances: 1,
        totalMenuVisits: 2,
        appearanceRate: 50,
      },
      {
        menuItemId: "maguro_don",
        menuItemName: "まぐろ丼",
        appearances: 1,
        totalMenuVisits: 3,
        appearanceRate: 33,
      },
    ]);
    assert.deepEqual(otoroGlobalInsight?.menuStats.slice(0, 3), [
      {
        menuItemId: "tokujo_don",
        menuItemName: "特上まぐろ丼（大とろ入り）",
        appearances: 2,
        totalMenuVisits: 2,
        appearanceRate: 100,
      },
      {
        menuItemId: "maguro_don",
        menuItemName: "まぐろ丼",
        appearances: 3,
        totalMenuVisits: 5,
        appearanceRate: 60,
      },
      {
        menuItemId: "maguro_don_mini",
        menuItemName: "まぐろ丼ミニ",
        appearances: 1,
        totalMenuVisits: 2,
        appearanceRate: 50,
      },
    ]);
    assert.deepEqual(meuraInsight, {
      partId: "meura",
      totalAppearances: 0,
      menuStats: [],
    });
    assert.deepEqual(akamiProfile, {
      partId: "akami",
      rarityLabel: "比較的出会いやすい",
      rarityMemo: "比較的出会いやすい基準部位で、ほかの部位との違いを測る軸にもなります。",
      textureMemo: "筋肉質でほどよい弾力があり、噛むほど旨みが広がるタイプです。",
      fatMemo: "脂は控えめで、香りと鉄っぽい旨みを楽しむすっきり寄りの部位です。",
      firstCollectedAt: "2026-03-21",
      subjectiveSummary: {
        tastingCount: 3,
        dominantFatLevelLabel: "あっさり",
        dominantTextureLabel: "弾力あり",
        averageSatisfaction: 3.7,
        wantAgainRate: 67,
      },
      recentTastings: [
        {
          visitedAt: "2026-03-24",
          menuItemName: "まぐろ丼ミニ",
          fatLevelLabel: "ちょうどいい",
          textureLevelLabel: "なめらか",
          satisfaction: 4,
          wantAgain: true,
        },
        {
          visitedAt: "2026-03-22",
          menuItemName: "まぐろ丼",
          fatLevelLabel: "あっさり",
          textureLevelLabel: "弾力あり",
          satisfaction: 4,
          wantAgain: true,
        },
        {
          visitedAt: "2026-03-21",
          menuItemName: "まぐろ丼",
          fatLevelLabel: "あっさり",
          textureLevelLabel: "弾力あり",
          satisfaction: 3,
          wantAgain: false,
        },
      ],
    });
    assert.equal(meuraProfile?.firstCollectedAt, null);
    assert.equal(meuraProfile?.subjectiveSummary.tastingCount, 0);
    assert.deepEqual(meuraProfile?.recentTastings, []);
  } finally {
    await writeMockState({
      menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
      quizSessions: seededQuizSessions.map((entry) => ({ ...entry })),
      visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
      visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
      storeStatus: { ...seededStoreStatus },
      quizStats: [{ ...seededQuizStats }],
      shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
    });
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

test("quiz stage 2 unlocks when 10 distinct stage-1 questions were cleared across two sessions", async () => {
  const stage1QuestionIds = QUIZ_QUESTIONS.filter((q) => q.stageNumber === 1)
    .slice(0, 10)
    .map((q) => q.id);
  assert.equal(stage1QuestionIds.length, 10);
  const now = new Date().toISOString();
  const exp = new Date(Date.now() + 86400000).toISOString();

  await writeMockState({
    menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
    quizSessions: [
      {
        id: "00000000-0000-4000-8000-000000000011",
        user_id: MOCK_USER_ID,
        question_count: 10,
        question_ids: stage1QuestionIds,
        score: 5,
        correct_question_ids: stage1QuestionIds.slice(0, 5),
        submitted_at: now,
        created_at: now,
        expires_at: exp,
      },
      {
        id: "00000000-0000-4000-8000-000000000012",
        user_id: MOCK_USER_ID,
        question_count: 10,
        question_ids: stage1QuestionIds,
        score: 5,
        correct_question_ids: stage1QuestionIds.slice(5, 10),
        submitted_at: now,
        created_at: now,
        expires_at: exp,
      },
    ],
    visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
    visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
    storeStatus: { ...seededStoreStatus },
    quizStats: [{ ...seededQuizStats }],
    shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
  });

  const s2 = await createQuizSessionForViewer({ stageNumber: 2 });
  assert.equal(s2.stageNumber, 2);
});

test("quiz stage 2 stays locked when only 5 distinct stage-1 questions were ever cleared", async () => {
  const stage1QuestionIds = QUIZ_QUESTIONS.filter((q) => q.stageNumber === 1)
    .slice(0, 10)
    .map((q) => q.id);
  const now = new Date().toISOString();
  const exp = new Date(Date.now() + 86400000).toISOString();
  const sameFive = stage1QuestionIds.slice(0, 5);

  await writeMockState({
    menuItemStatuses: seededMenuItemStatuses.map((entry) => ({ ...entry })),
    quizSessions: [
      {
        id: "00000000-0000-4000-8000-000000000021",
        user_id: MOCK_USER_ID,
        question_count: 10,
        question_ids: stage1QuestionIds,
        score: 5,
        correct_question_ids: sameFive,
        submitted_at: now,
        created_at: now,
        expires_at: exp,
      },
      {
        id: "00000000-0000-4000-8000-000000000022",
        user_id: MOCK_USER_ID,
        question_count: 10,
        question_ids: stage1QuestionIds,
        score: 5,
        correct_question_ids: sameFive,
        submitted_at: now,
        created_at: now,
        expires_at: exp,
      },
    ],
    visitLogs: seededVisitLogs.map((entry) => ({ ...entry })),
    visitLogParts: seededVisitLogParts.map((entry) => ({ ...entry })),
    storeStatus: { ...seededStoreStatus },
    quizStats: [{ ...seededQuizStats }],
    shareBonusEvents: seededShareBonusEvents.map((entry) => ({ ...entry })),
  });

  await assert.rejects(() => createQuizSessionForViewer({ stageNumber: 2 }), /正解済みの問題数が10問に達していない/);
});

test("quiz stages unlock only after 10 mastered questions on the previous stage", () => {
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
    /正解済みの問題数が10問に達していない/,
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

test("checkQuizAnswer requires an owned session even when answerProof is present", async () => {
  const session = await createQuizSessionForViewer({ stageNumber: 1 });

  await assert.rejects(
    () =>
      checkQuizAnswer({
        sessionId: "10000000-0000-4000-8000-000000000099",
        questionId: session.questions[0].id,
        answerIndexes: [0],
        answerProof: session.questions[0].answerProof,
      }),
    /クイズセッションが見つかりません/,
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
