import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const MyPageScreen = dynamic(
  () => import("@/components/screens/MyPageScreen").then((m) => ({ default: m.MyPageScreen })),
  {
    loading: () => <ScreenState description="マイページを読み込んでいます。" title="読み込み中" />,
  },
);

export default function Page() {
  return <MyPageScreen />;
}
