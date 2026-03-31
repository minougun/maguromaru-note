import dynamic from "next/dynamic";

import { ScreenState } from "@/components/ui/ScreenState";

const ZukanScreen = dynamic(
  () => import("@/components/screens/ZukanScreen").then((m) => ({ default: m.ZukanScreen })),
  {
    loading: () => <ScreenState description="図鑑を読み込んでいます。" title="読み込み中" />,
  },
);

export default function Page() {
  return <ZukanScreen />;
}
