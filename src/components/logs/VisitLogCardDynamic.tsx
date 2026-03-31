"use client";

import dynamic from "next/dynamic";

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

export function VisitLogCardDynamic(props: VisitLogCardProps) {
  return <VisitLogCardLazy {...props} />;
}
