import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const TitlesScreen = dynamic(
  () => import("@/components/screens/TitlesScreen").then((m) => ({ default: m.TitlesScreen })),
  {
    loading: () => <ScreenState description="称号情報を読み込んでいます。" title="読み込み中" />,
  },
);

export default function Page() {
  return <TitlesScreen />;
}
