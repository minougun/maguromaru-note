import type { QuizQuestionCategory } from "@/lib/quiz-types";

export type SessionQuestion = {
  id: string;
  category: QuizQuestionCategory;
  question: string;
  options: [string, string, string, string];
  answerProof: string;
};

export type QuizSessionPayload = {
  sessionId: string;
  stageNumber: number;
  questionCount: number;
  questions: SessionQuestion[];
  expiresAt: string;
};

export type QuizResultPayload = {
  ok: true;
  score: number;
  questionCount: number;
  results: Array<{
    question: SessionQuestion;
    selectedIndexes: number[];
    correct: boolean;
    correctIndex: number;
    correctIndexes: number[];
    explanation: string;
  }>;
};

export type QuizAnswerCheckPayload = {
  ok: true;
  result: {
    question: SessionQuestion;
    selectedIndexes: number[];
    correct: boolean;
    correctIndex: number;
    correctIndexes: number[];
    explanation: string;
  };
};

export type QuizAnswerFeedback = QuizAnswerCheckPayload["result"];

export type ErrorPayload = {
  error?: string;
};

export function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === "object" && value !== null && "error" in value;
}
