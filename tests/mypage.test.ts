import assert from "node:assert/strict";
import test from "node:test";

import { defaultMenuStockById } from "@/lib/domain/constants";
import { seededMenuItems, seededParts, seededStoreStatus } from "@/lib/domain/seed";
import type { AppSnapshot, VisitRecord } from "@/lib/domain/types";
import { buildCasualMissions, buildMyPageSummary, buildNextTitleProgress, calculateVisitStreakWeeks } from "@/lib/mypage";

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
      menuStockUpdatedAt: null,
      storeStatus: seededStoreStatus,
      showStaffUpdateTimestamps: true,
      aiStoreBlurb: null,
      sideData: {
        weather: {
          temperature: 20,
          code: 0,
          icon: "☀️",
          label: "快晴",
        },
        trivia: {
          trivia: "まぐろの部位は個性が豊かです。",
          date: "2026-04-03",
        },
        fetchedAt: "2026-04-03T00:00:00.000Z",
      },
      recentLogs: [],
    },
    history: {
      visitCount: 50,
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
        requiredVisits: 50,
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
      partInsights: {},
      globalPartInsights: {},
      partProfiles: {},
    },
    canManageAdmin: false,
  };

  const summary = buildMyPageSummary(snapshot);

  assert.equal(summary.currentTitle?.name, "中とろ通");
  assert.equal(summary.streakWeeks, 2);
  assert.equal(summary.titles.find((title) => title.id === "kozou")?.unlocked, true);
  assert.equal(summary.titles.find((title) => title.id === "beginner")?.unlocked, true);
  assert.equal(summary.titles.find((title) => title.id === "akami_fan")?.unlocked, true);
  assert.equal(summary.titles.find((title) => title.id === "chutoro")?.current, true);
  assert.equal(summary.titles.find((title) => title.id === "hunter")?.requirementText, "来店75回・6部位・750問正解で解放");
});

test("buildNextTitleProgress returns remaining requirements for the next locked title", () => {
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
      menuStockUpdatedAt: null,
      storeStatus: seededStoreStatus,
      showStaffUpdateTimestamps: true,
      aiStoreBlurb: null,
      sideData: {
        weather: {
          temperature: 20,
          code: 0,
          icon: "☀️",
          label: "快晴",
        },
        trivia: {
          trivia: "まぐろの部位は個性が豊かです。",
          date: "2026-04-03",
        },
        fetchedAt: "2026-04-03T00:00:00.000Z",
      },
      recentLogs: [],
    },
    history: {
      visitCount: 10,
      quizStats: {
        totalCorrectAnswers: 35,
        totalAnsweredQuestions: 70,
        quizzesCompleted: 2,
        bestScore: 18,
        bestQuestionCount: 20,
        accuracyRate: 50,
      },
      quizStageProgress: {
        correctByStage: {
          1: 10,
        },
      },
      currentTitle: {
        id: "beginner",
        name: "まぐろ入門者",
        icon: "🎣",
        requiredVisits: 10,
        requiredCollectedParts: 0,
        requiredQuizCorrect: 0,
      },
      logs: [createVisitRecord("1", "2026-03-29")],
      shareBonus: {
        bonusVisitCount: 0,
        bonusCorrectAnswers: 0,
        sharedVisitLogIds: [],
        sharedQuizSessionIds: [],
      },
    },
    zukan: {
      collectedPartIds: ["otoro", "chutoro"],
      collectedCount: 2,
      totalCount: seededParts.length,
      isComplete: false,
      partInsights: {},
      globalPartInsights: {},
      partProfiles: {},
    },
    canManageAdmin: false,
  };

  const progress = buildNextTitleProgress(buildMyPageSummary(snapshot));

  assert.equal(progress?.title.id, "akami_fan");
  assert.equal(progress?.remainingVisits, 10);
  assert.equal(progress?.remainingCollectedParts, 3);
  assert.equal(progress?.remainingQuizCorrect, 165);
});

test("buildCasualMissions builds low-frequency-friendly progress goals", () => {
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
      menuStockUpdatedAt: null,
      storeStatus: seededStoreStatus,
      showStaffUpdateTimestamps: true,
      aiStoreBlurb: null,
      sideData: {
        weather: {
          temperature: 20,
          code: 0,
          icon: "☀️",
          label: "快晴",
        },
        trivia: {
          trivia: "まぐろの部位は個性が豊かです。",
          date: "2026-04-03",
        },
        fetchedAt: "2026-04-03T00:00:00.000Z",
      },
      recentLogs: [],
    },
    history: {
      visitCount: 10,
      quizStats: {
        totalCorrectAnswers: 8,
        totalAnsweredQuestions: 12,
        quizzesCompleted: 1,
        bestScore: 8,
        bestQuestionCount: 10,
        accuracyRate: 67,
      },
      quizStageProgress: { correctByStage: { 1: 8 } },
      currentTitle: {
        id: "beginner",
        name: "まぐろ入門者",
        icon: "🎣",
        requiredVisits: 10,
        requiredCollectedParts: 0,
        requiredQuizCorrect: 0,
      },
      logs: [createVisitRecord("1", "2026-03-29")],
      shareBonus: {
        bonusVisitCount: 0,
        bonusCorrectAnswers: 0,
        sharedVisitLogIds: [],
        sharedQuizSessionIds: [],
      },
    },
    zukan: {
      collectedPartIds: ["otoro", "chutoro"],
      collectedCount: 2,
      totalCount: seededParts.length,
      isComplete: false,
      partInsights: {},
      globalPartInsights: {},
      partProfiles: {},
    },
    canManageAdmin: false,
  };

  const missions = buildCasualMissions(snapshot);

  assert.deepEqual(
    missions.map((mission) => ({ id: mission.id, completed: mission.completed, progressLabel: mission.progressLabel })),
    [
      { id: "first_record", completed: true, progressLabel: "達成済み" },
      { id: "collect_three_parts", completed: false, progressLabel: "2 / 3" },
      { id: "quiz_ten_correct", completed: false, progressLabel: "8 / 10" },
      { id: "first_share", completed: false, progressLabel: "あと1回" },
    ],
  );
});
