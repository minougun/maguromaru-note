import { quizQuestionsPerStage } from "@/lib/domain/constants";

/** 1セッションの問題数。`quiz.ts`（巨大な問題バンク）を引かずに参照する。 */
export const QUIZ_SESSION_SIZE = quizQuestionsPerStage;
