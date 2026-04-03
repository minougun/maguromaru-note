"use client";

import type { PartMenuInsight } from "@/lib/domain/types";

const MIN_MENU_VISITS_FOR_CONFIDENCE = 3;
const MAX_ROWS = 3;

function PartMenuInsightSection({
  title,
  insight,
  emptyText,
}: {
  title: string;
  insight: PartMenuInsight | undefined;
  emptyText: string;
}) {
  if (!insight || insight.totalAppearances === 0 || insight.menuStats.length === 0) {
    return (
      <>
        <p className="part-insight-title">{title}</p>
        <p className="part-insight-empty">{emptyText}</p>
      </>
    );
  }

  return (
    <>
      <p className="part-insight-title">{title}</p>
      <ul className="part-insight-list">
        {insight.menuStats.slice(0, MAX_ROWS).map((stat) => (
          <li className="part-insight-item" key={stat.menuItemId}>
            <div className="part-insight-row">
              <span className="part-insight-menu">{stat.menuItemName}</span>
              <span className="part-insight-rate">{stat.appearanceRate}%</span>
            </div>
            <div className="part-insight-meta">
              {stat.appearances}/{stat.totalMenuVisits}回の記録で確認
              {stat.totalMenuVisits < MIN_MENU_VISITS_FOR_CONFIDENCE ? " ・ 参考値" : ""}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PartMenuInsightBlock({
  insight,
  globalInsight,
}: {
  insight: PartMenuInsight | undefined;
  globalInsight?: PartMenuInsight | undefined;
}) {
  return (
    <div className="part-insight-block">
      <PartMenuInsightSection
        emptyText="まだデータ不足です。記録が増えると、どの丼で出やすいかが分かります。"
        insight={insight}
        title="あなたの記録では出やすい丼"
      />
      {globalInsight ? (
        <div className="part-insight-global">
          <PartMenuInsightSection
            emptyText="全体傾向はまだ集計中です。"
            insight={globalInsight}
            title="みんなの記録では出やすい丼"
          />
        </div>
      ) : null}
    </div>
  );
}
