import assert from "node:assert/strict";
import test from "node:test";

import { defaultMenuStockById } from "@/lib/domain/constants";
import { seededMenuItems, seededParts, seededStoreStatus } from "@/lib/domain/seed";
import type { AppSnapshot, VisitRecord } from "@/lib/domain/types";
import { buildMyPageSummary, calculateVisitStreakWeeks } from "@/lib/mypage";

function createVisitRecord(id: string, visitedAt: string): VisitRecord {
  return {
    id,
    visitedAt,
    createdAt: `${visitedAt}T12:00:00.000Z`,
    memo: null,
    photoUrl: null,
    menuItem: seededMenuItems[0],
    parts: [seededParts[0]],
    shareBonusClaimed: false,
  };
}

test("calculateVisitStreakWeeks counts consecutive weekly visits from the latest week", () => {
  const logs = [
    createVisitRecord("1", "2026-03-29"),
    createVisitRecord("2", "2026-03-22"),
    createVisitRecord("3", "2026-03-15"),
    createVisitRecord("4", "2026-02-28"),
  ];

  assert.equal(calculateVisitStreakWeeks(logs), 3);
});

test("buildMyPageSummary marks unlocked and current titles from snapshot progress", () => {
  const snapshot: AppSnapshot = {
    viewer: {
      userId: "user-1",
      email: null,
      role: "user",
      isMock: true,
    },
    parts: seededParts,
    menuItems: seededMenuItems,
    home: {
      menuItemStatuses: defaultMenuStockById,
      storeStatus: seededStoreStatus,
      recentLogs: [],
    },
    history: {
      visitCount: 5,
      quizStats: {
        totalCorrectAnswers: 500,
        totalAnsweredQuestions: 700,
        quizzesCompleted: 12,
        bestScore: 48,
        bestQuestionCount: 50,
        accuracyRate: 71,
      },
      quizStageProgress: {
        correctByStage: {
          10: 10,
          20: 20,
          30: 0,
          40: 0,
          50: 0,
        },
      },
      currentTitle: {
        id: "chutoro",
        name: "中とろ通",
        icon: "🍣",
        requiredVisits: 5,
        requiredCollectedParts: 5,
        requiredQuizCorrect: 500,
      },
      logs: [
        createVisitRecord("1", "2026-03-29"),
        createVisitRecord("2", "2026-03-22"),
      ],
      shareBonus: {
        bonusVisitCount: 0,
        bonusCorrectAnswers: 0,
        sharedVisitLogIds: [],
        sharedQuizSessionIds: [],
      },
    },
    zukan: {
      collectedPartIds: ["otoro", "chutoro", "akami", "noten", "kama"],
      collectedCount: 5,
      totalCount: seededParts.length,
      isComplete: false,
    },
    canManageAdmin: false,
  };

  const summary = buildMyPageSummary(snapshot);

  assert.equal(summary.currentTitle?.name, "中とろ通");
  assert.equal(summary.streakWeeks, 2);
  assert.equal(summary.titles.find((title) => title.id === "beginner")?.unlocked, true);
  assert.equal(summary.titles.find((title) => title.id === "akami_fan")?.unlocked, true);
  assert.equal(summary.titles.find((title) => title.id === "chutoro")?.current, true);
  assert.equal(summary.titles.find((title) => title.id === "hunter")?.requirementText, "来店10回・6部位・750問正解で解放");
});
