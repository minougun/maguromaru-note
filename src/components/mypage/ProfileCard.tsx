import { Card } from "@/components/ui/Card";
import type { MyPageSummary } from "@/lib/domain/types";

export function ProfileCard({
  summary,
  onShare,
}: {
  summary: MyPageSummary;
  onShare: () => void;
}) {
  return (
    <Card glow>
      <div className="profile-hero">
        <div className="profile-icon">{summary.currentTitle.icon}</div>
        <h2 className="profile-title">{summary.currentTitle.name}</h2>
        <p className="profile-sub">
          来店 {summary.visitCount}回 ・ {summary.collectedCount}部位コンプ
        </p>
        <button className="button-outline" onClick={onShare} type="button">
          📣 称号をシェア
        </button>
      </div>
    </Card>
  );
}
