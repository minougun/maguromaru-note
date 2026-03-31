import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const HistoryScreen = dynamic(
  () => import("@/components/screens/HistoryScreen").then((m) => ({ default: m.HistoryScreen })),
  {
    loading: () => <ScreenState description="履歴を読み込んでいます。" title="読み込み中" />,
  },
);

export default function Page() {
  return <HistoryScreen />;
}
