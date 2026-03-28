import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { latestUpdatedAt } from "@/lib/share/share";
import type { HomePageData } from "@/lib/domain/types";

function formatUpdatedAt(input: string) {
  if (!input) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}

export function MenuStatusCard({ home }: { home: HomePageData }) {
  const updatedAt = latestUpdatedAt(home.menuStatus);

  return (
    <Card>
      <p className="section-sub" style={{ margin: "0 0 8px" }}>
        Realtime は Supabase 接続時に有効
      </p>
      {home.menuStatus.map((entry) => (
        <div className={`menu-row ${entry.status === "soldout" ? "soldout-row" : ""}`} key={entry.menuItem.id}>
          <div style={{ flex: 1 }}>
            <div className="menu-name">{entry.menuItem.name}</div>
            <div className="helper-text">¥{entry.menuItem.price.toLocaleString("ja-JP")}</div>
          </div>
          <StatusBadge status={entry.status} />
        </div>
      ))}
      <div className="menu-meta" style={{ marginTop: 8, textAlign: "right" }}>
        更新 {formatUpdatedAt(updatedAt)}
      </div>
      <p className="helper-text" style={{ marginTop: 10 }}>
        ※ 店舗スタッフが更新しています
      </p>
    </Card>
  );
}
