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

function buildContrastSummary(insight: PartMenuInsight | undefined, globalInsight: PartMenuInsight | undefined) {
  const personalTop = insight?.menuStats[0];
  const globalTop = globalInsight?.menuStats[0];

  if (!personalTop && !globalTop) {
    return null;
  }

  if (personalTop && globalTop) {
    if (personalTop.menuItemId === globalTop.menuItemId) {
      return `あなたもみんなも、いま一番当たりやすいのは「${personalTop.menuItemName}」です。`;
    }
    return `あなたは「${personalTop.menuItemName}」派、みんなは「${globalTop.menuItemName}」派です。`;
  }

  if (personalTop) {
    return `あなたの記録では「${personalTop.menuItemName}」が一番当たりやすいです。`;
  }

  return `みんなの記録では「${globalTop?.menuItemName}」が一番当たりやすいです。`;
}

export function PartMenuInsightBlock({
  insight,
  globalInsight,
}: {
  insight: PartMenuInsight | undefined;
  globalInsight?: PartMenuInsight | undefined;
}) {
  const contrastSummary = buildContrastSummary(insight, globalInsight);

  return (
    <div className="part-insight-block">
      {contrastSummary ? <p className="part-insight-compare">{contrastSummary}</p> : null}
      <PartMenuInsightSection
        emptyText="まだデータ不足です。記録が増えると、どのメニューで出やすいかが分かります。"
        insight={insight}
        title="あなたの記録では出やすいメニュー"
      />
      {globalInsight ? (
        <div className="part-insight-global">
          <PartMenuInsightSection
            emptyText="全体傾向はまだ集計中です。"
            insight={globalInsight}
            title="みんなの記録では出やすいメニュー"
          />
        </div>
      ) : null}
    </div>
  );
}
