import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const RecordScreen = dynamic(
  () => import("@/components/screens/RecordScreen").then((m) => ({ default: m.RecordScreen })),
  {
    loading: () => <ScreenState description="記録画面を読み込んでいます。" title="読み込み中" />,
  },
);

export default function Page() {
  return <RecordScreen />;
}
