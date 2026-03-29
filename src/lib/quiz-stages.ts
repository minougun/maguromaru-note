import { quizQuestionsPerStage, quizStageCount, quizStagesPerTier } from "@/lib/domain/constants";

export const QUIZ_STAGE_CONFIGS = Array.from({ length: quizStageCount }, (_, index) => {
  const stageNumber = index + 1;
  const tier = Math.floor(index / quizStagesPerTier) + 1;
  const stage = `STAGE ${stageNumber}`;

  switch (tier) {
    case 1:
      return {
        stageNumber,
        tier,
        stage,
        title: "部位入門",
        detail: "まぐろの部位を覚える 10 問",
        difficultyLabel: "やさしい",
      };
    case 2:
      return {
        stageNumber,
        tier,
        stage,
        title: "魚種と生態",
        detail: "まぐろの種類と生態を学ぶ 10 問",
        difficultyLabel: "ふつう",
      };
    case 3:
      return {
        stageNumber,
        tier,
        stage,
        title: "漁と流通",
        detail: "漁法・流通・品質の知識 10 問",
        difficultyLabel: "むずかしい",
      };
    case 4:
      return {
        stageNumber,
        tier,
        stage,
        title: "食と文化",
        detail: "食べ方・栄養・雑学を問う 10 問",
        difficultyLabel: "かなりむずかしい",
      };
    default:
      return {
        stageNumber,
        tier,
        stage,
        title: "まぐろマスター",
        detail: "全カテゴリ混合の最難関 10 問",
        difficultyLabel: "最難関",
      };
  }
});

type QuizStageProgressInput = {
  correctByStage: Record<number, number>;
};

export function createEmptyQuizStageProgress() {
  return Object.fromEntries(
    Array.from({ length: quizStageCount }, (_, index) => [index + 1, 0]),
  ) as Record<number, number>;
}

/** そのステージで一度でも正解した設問のユニーク数（0〜10）。10 に達すると次ステージが解放対象。 */
export function getStageProgressCount(progress: QuizStageProgressInput, stageNumber: number) {
  return progress.correctByStage[stageNumber] ?? 0;
}

export function getUnlockedQuizStageNumbers(progress: QuizStageProgressInput) {
  const unlocked: number[] = [1];

  for (let stageNumber = 2; stageNumber <= quizStageCount; stageNumber += 1) {
    const previousStageNumber = stageNumber - 1;
    if (getStageProgressCount(progress, previousStageNumber) < quizQuestionsPerStage) {
      break;
    }
    unlocked.push(stageNumber);
  }

  return unlocked;
}

export function isQuizStageUnlocked(stageNumber: number, progress: QuizStageProgressInput) {
  return getUnlockedQuizStageNumbers(progress).includes(stageNumber);
}

export function getHighestUnlockedQuizStageNumber(progress: QuizStageProgressInput) {
  const unlocked = getUnlockedQuizStageNumbers(progress);
  return unlocked[unlocked.length - 1] ?? 1;
}

export function getQuizStageConfig(stageNumber: number) {
  return QUIZ_STAGE_CONFIGS.find((stage) => stage.stageNumber === stageNumber) ?? QUIZ_STAGE_CONFIGS[0];
}
