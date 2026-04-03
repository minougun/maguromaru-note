import { TITLES } from "@/lib/domain/constants";
import type { AppSnapshot, Title, VisitRecord } from "@/lib/domain/types";

export type MyPageTitleState = Title & {
  current: boolean;
  unlocked: boolean;
  requirementText: string;
};

export interface MyPageSummary {
  collectedCount: number;
  currentTitle: Title | null;
  streakWeeks: number;
  titles: MyPageTitleState[];
  totalCorrectAnswers: number;
  visitCount: number;
}

export interface NextTitleProgress {
  title: Title;
  remainingVisits: number;
  remainingCollectedParts: number;
  remainingQuizCorrect: number;
}

export interface CasualMission {
  id: "first_record" | "collect_three_parts" | "quiz_ten_correct" | "first_share";
  label: string;
  progressLabel: string;
  completed: boolean;
}

function buildRequirementText(title: Title) {
  const conditions = [`来店${title.requiredVisits}回`];

  if (title.requiredCollectedParts > 0) {
    conditions.push(`${title.requiredCollectedParts}部位`);
  }

  if (title.requiredQuizCorrect > 0) {
    conditions.push(`${title.requiredQuizCorrect}問正解`);
  }

  return `${conditions.join("・")}で解放`;
}

function getWeekStartKey(input: string) {
  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = (date.getUTCDay() + 6) % 7;

  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

export function calculateVisitStreakWeeks(logs: VisitRecord[]) {
  if (logs.length === 0) {
    return 0;
  }

  const weekKeys = new Set(logs.map((log) => getWeekStartKey(log.visitedAt)));
  const latestWeekStart = [...weekKeys].sort((left, right) => right.localeCompare(left))[0];

  if (!latestWeekStart) {
    return 0;
  }

  let streak = 0;
  let cursor = latestWeekStart;

  while (weekKeys.has(cursor)) {
    streak += 1;
    const date = new Date(`${cursor}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 7);
    cursor = date.toISOString().slice(0, 10);
  }

  return streak;
}

export function buildMyPageSummary(snapshot: AppSnapshot): MyPageSummary {
  const visitCount = snapshot.history.visitCount;
  const collectedCount = snapshot.zukan.collectedCount;
  const totalCorrectAnswers = snapshot.history.quizStats.totalCorrectAnswers;
  const currentTitle = snapshot.history.currentTitle;

  return {
    visitCount,
    collectedCount,
    totalCorrectAnswers,
    currentTitle,
    streakWeeks: calculateVisitStreakWeeks(snapshot.history.logs),
    titles: TITLES.map((title) => {
      const unlocked =
        visitCount >= title.requiredVisits &&
        collectedCount >= title.requiredCollectedParts &&
        totalCorrectAnswers >= title.requiredQuizCorrect;

      return {
        ...title,
        unlocked,
        current: currentTitle?.id === title.id,
        requirementText: buildRequirementText(title),
      };
    }),
  };
}

export function buildNextTitleProgress(summary: MyPageSummary): NextTitleProgress | null {
  const nextTitle = summary.titles.find((title) => !title.unlocked);
  if (!nextTitle) {
    return null;
  }

  return {
    title: nextTitle,
    remainingVisits: Math.max(0, nextTitle.requiredVisits - summary.visitCount),
    remainingCollectedParts: Math.max(0, nextTitle.requiredCollectedParts - summary.collectedCount),
    remainingQuizCorrect: Math.max(0, nextTitle.requiredQuizCorrect - summary.totalCorrectAnswers),
  };
}

export function buildCasualMissions(snapshot: AppSnapshot): CasualMission[] {
  const shareCount =
    snapshot.history.shareBonus.sharedVisitLogIds.length + snapshot.history.shareBonus.sharedQuizSessionIds.length;

  return [
    {
      id: "first_record",
      label: "はじめての記録を残す",
      progressLabel: snapshot.history.logs.length > 0 ? "達成済み" : "あと1回",
      completed: snapshot.history.logs.length > 0,
    },
    {
      id: "collect_three_parts",
      label: "部位を3つ集める",
      progressLabel: `${Math.min(snapshot.zukan.collectedCount, 3)} / 3`,
      completed: snapshot.zukan.collectedCount >= 3,
    },
    {
      id: "quiz_ten_correct",
      label: "クイズで10問正解する",
      progressLabel: `${Math.min(snapshot.history.quizStats.totalCorrectAnswers, 10)} / 10`,
      completed: snapshot.history.quizStats.totalCorrectAnswers >= 10,
    },
    {
      id: "first_share",
      label: "シェアボーナスを受け取る",
      progressLabel: shareCount > 0 ? "達成済み" : "あと1回",
      completed: shareCount > 0,
    },
  ];
}
