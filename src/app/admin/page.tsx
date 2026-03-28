import { redirect } from "next/navigation";

import { AdminScreen } from "@/components/screens/AdminScreen";
import { getViewerContext } from "@/lib/services/app-service";

export default async function Page() {
  const viewer = await getViewerContext();
  if (viewer.role !== "staff") {
    redirect("/");
  }

  return <AdminScreen />;
}
