import { TITLES } from "@/lib/domain/constants";
import type { Title } from "@/lib/domain/types";

export function getCurrentTitle(
  visitCount: number,
  collectedPartCount: number,
  totalCorrectAnswers: number,
): Title | null {
  for (let index = TITLES.length - 1; index >= 0; index -= 1) {
    const title = TITLES[index];
    if (
      visitCount >= title.requiredVisits &&
      collectedPartCount >= title.requiredCollectedParts &&
      totalCorrectAnswers >= title.requiredQuizCorrect
    ) {
      return title;
    }
  }

  return null;
}
