import type { Metadata } from "next";

import "@/app/globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AppSnapshotProvider } from "@/components/providers/AppSnapshotProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "まぐろ丸ノート",
  description: "海鮮丼まぐろ丸の公式Webアプリ",
  icons: {
    icon: [{ url: "/maguromaru-mark.webp", type: "image/webp" }],
    apple: "/maguromaru-mark.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <AppSnapshotProvider>
            <AppShell>{children}</AppShell>
          </AppSnapshotProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
