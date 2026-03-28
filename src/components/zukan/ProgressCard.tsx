import { Card } from "@/components/ui/Card";
import type { ZukanSummary } from "@/lib/domain/types";

export function ProgressCard({
  summary,
  onShare,
}: {
  summary: ZukanSummary;
  onShare: () => void;
}) {
  const percent = Math.round((summary.collectedCount / Math.max(summary.totalCount, 1)) * 100);

  return (
    <Card glow>
      <div className="progress-big">{percent}%</div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-caption">
        {summary.collectedCount} / {summary.totalCount} 部位
      </p>
      <button className="button-outline" onClick={onShare} type="button">
        🐟 図鑑の進捗をシェア
      </button>
    </Card>
  );
}
