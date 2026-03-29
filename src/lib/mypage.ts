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
