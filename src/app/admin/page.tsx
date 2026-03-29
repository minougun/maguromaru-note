import { redirect } from "next/navigation";

import { AdminScreen } from "@/components/screens/AdminScreen";
import { getViewerContextSafe } from "@/lib/services/app-service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await getViewerContextSafe();
  if (!viewer || viewer.role !== "admin") {
    redirect("/");
  }

  return <AdminScreen />;
}
