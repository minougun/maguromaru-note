import type { Metadata } from "next";

import "@/app/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TabBar } from "@/components/ui/TabBar";

export const metadata: Metadata = {
  title: "まぐろ丸ノート",
  description: "海鮮丼まぐろ丸の公式Webアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <header className="app-header">
              <div className="header-row">
                <div className="logo-mark">
                  まぐろ
                  <br />
                  丸
                </div>
                <div>
                  <h1 className="header-title">まぐろ丸ノート</h1>
                  <p className="header-subtitle">海鮮丼まぐろ丸 ── 本町</p>
                </div>
              </div>
              <div className="accent-line" aria-hidden="true" />
            </header>
            <main className="screen-main">{children}</main>
            <TabBar />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
