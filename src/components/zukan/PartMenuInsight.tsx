"use client";

import type { PartMenuInsight } from "@/lib/domain/types";

const MIN_MENU_VISITS_FOR_CONFIDENCE = 3;
const MAX_ROWS = 3;

export function PartMenuInsightBlock({ insight }: { insight: PartMenuInsight | undefined }) {
  if (!insight || insight.totalAppearances === 0 || insight.menuStats.length === 0) {
    return (
      <div className="part-insight-block">
        <p className="part-insight-title">あなたの記録では出やすい丼</p>
        <p className="part-insight-empty">まだデータ不足です。記録が増えると、どの丼で出やすいかが分かります。</p>
      </div>
    );
  }

  return (
    <div className="part-insight-block">
      <p className="part-insight-title">あなたの記録では出やすい丼</p>
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
    </div>
  );
}
