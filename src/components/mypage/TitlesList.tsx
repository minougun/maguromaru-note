import { Card } from "@/components/ui/Card";
import type { MyPageSummary } from "@/lib/domain/types";

export function TitlesList({ summary }: { summary: MyPageSummary }) {
  return (
    <Card>
      {summary.titles.map((title) => (
        <div className={`title-row ${title.current ? "current" : ""} ${title.unlocked ? "" : "locked"}`} key={title.id}>
          <div className="title-icon">{title.unlocked ? title.icon : "🔒"}</div>
          <div style={{ flex: 1 }}>
            <div className="title-name">{title.name}</div>
            <div className="title-meta">{title.unlocked ? " " : `来店${title.required_visits}回で解放`}</div>
          </div>
          {title.current ? (
            <span className="pill">使用中</span>
          ) : title.unlocked ? (
            <span className="pill pill-muted">解放済み</span>
          ) : (
            <span className="pill pill-muted">ロック中</span>
          )}
        </div>
      ))}
    </Card>
  );
}
