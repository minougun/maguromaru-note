"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

import type { VisitLogCardProps } from "@/components/logs/VisitLogCard";

const VisitLogCardLazy = dynamic(
  () => import("@/components/logs/VisitLogCard").then((m) => ({ default: m.VisitLogCard })),
  {
    loading: () => (
      <article aria-busy="true" className="card">
        <p className="helper-text">記録カードを読み込んでいます…</p>
      </article>
    ),
  },
);

export const VisitLogCardDynamic = memo(function VisitLogCardDynamic(props: VisitLogCardProps) {
  return <VisitLogCardLazy {...props} />;
});
