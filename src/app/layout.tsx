import type { Metadata } from "next";

import "@/app/globals.css";
import "@/app/light-only.css";
import { AppShellRouter } from "@/components/layout/AppShellRouter";
import { AppSnapshotProvider } from "@/components/providers/AppSnapshotProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";

export const metadata: Metadata = {
  title: "まぐろ丸ノート",
  description: "海鮮丼まぐろ丸の公式Webアプリ",
  icons: {
    icon: [{ url: "/maguromaru-mark.png", type: "image/png" }],
    apple: "/maguromaru-mark.png",
  },
};

/** 本番キャッシュや「反映されない」調査用。開発者ツールで body の data-mgn-revision を確認 */
const mgnRevision =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
  "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning data-theme="light" style={{ colorScheme: "light" }}>
      <body data-mgn-revision={mgnRevision} data-theme="light" suppressHydrationWarning>
        <AuthProvider>
          <UiPreferencesProvider>
            <AppSnapshotProvider>
              <AppShellRouter>{children}</AppShellRouter>
            </AppSnapshotProvider>
          </UiPreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
