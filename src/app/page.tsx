import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const HomeScreen = dynamic(
  () => import("@/components/screens/HomeScreen").then((m) => ({ default: m.HomeScreen })),
  {
    loading: () => <ScreenState description="ホームを読み込んでいます。" title="読み込み中" />,
  },
);

export default function Page() {
  return <HomeScreen />;
}
