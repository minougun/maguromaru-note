"use client";

import { useEffect } from "react";

/**
 * ルート layout 自体の失敗時のみ。globals の読み込みに依存しない最小 UI。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const description =
    error.message?.trim() ||
    (error.digest ? `参照: ${error.digest}` : "予期しない問題が発生しました。");

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#1b2d4f",
          color: "#b9cae0",
          fontFamily:
            'system-ui, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: 12 }}>
            表示できませんでした
          </strong>
          <p style={{ margin: "0 0 20px", lineHeight: 1.55, fontSize: "0.95rem" }}>
            {description}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: 10,
              padding: "12px 22px",
              fontSize: "1rem",
              fontWeight: 600,
              background: "#e8b44c",
              color: "#1a1408",
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
