import { Card } from "@/components/ui/Card";
import { formatDisplayDate } from "@/lib/utils/date";
import type { VisitRecord } from "@/lib/domain/types";

export function RecentLogs({
  logs,
  onShare,
}: {
  logs: VisitRecord[];
  onShare: (log: VisitRecord) => void;
}) {
  return (
    <>
      {logs.map((log) => (
        <Card className="log-card" key={log.id}>
          <div className="log-date">{formatDisplayDate(log.visitedAt)}</div>
          <div className="tags">
            {log.parts.map((part) => (
              <span
                className="tag"
                key={part.id}
                style={{
                  background: `${part.color}33`,
                  color: part.color,
                }}
              >
                {part.name}
              </span>
            ))}
          </div>
          <p className="log-memo">{log.memo ?? "メモなし"}</p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="button-subtle" onClick={() => onShare(log)} type="button">
              🔗 シェア
            </button>
          </div>
        </Card>
      ))}
    </>
  );
}
