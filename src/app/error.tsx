"use client";

import { useEffect } from "react";

import { ScreenState } from "@/components/ui/ScreenState";

export default function AppError({
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
    <ScreenState
      action={
        <button type="button" className="button-primary" onClick={() => reset()}>
          再試行
        </button>
      }
      description={description}
      title="表示できませんでした"
    />
  );
}
