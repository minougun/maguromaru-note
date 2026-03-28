import type { MyPageSummary } from "@/lib/domain/types";

export function StatsGrid({ summary }: { summary: MyPageSummary }) {
  const stats = [
    { label: "来店回数", value: summary.visitCount },
    { label: "食べた部位", value: summary.collectedCount },
    { label: "連続来店週", value: summary.streakWeeks },
  ];

  return (
    <div className="stats-grid" style={{ marginBottom: 14 }}>
      {stats.map((item) => (
        <div className="stat-cell" key={item.label}>
          <div className="stat-num">{item.value}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
