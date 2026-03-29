import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const QuizScreen = dynamic(
  () => import("@/components/screens/QuizScreen").then((m) => ({ default: m.QuizScreen })),
  {
    loading: () => (
      <ScreenState description="まぐろクイズの画面を読み込んでいます。" title="読み込み中" />
    ),
  },
);

export default function QuizPage() {
  return <QuizScreen />;
}
