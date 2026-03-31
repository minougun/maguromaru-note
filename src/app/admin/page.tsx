import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { ScreenState } from "@/components/ui/ScreenState";
import { getViewerContextSafe } from "@/lib/services/app-service";

export const dynamic = "force-dynamic";

const AdminScreen = nextDynamic(
  () => import("@/components/screens/AdminScreen").then((m) => ({ default: m.AdminScreen })),
  {
    loading: () => <ScreenState description="管理画面を読み込んでいます。" title="読み込み中" />,
  },
);

export default async function Page() {
  const viewer = await getViewerContextSafe();
  if (!viewer || viewer.role !== "admin") {
    redirect("/");
  }

  return <AdminScreen />;
}
