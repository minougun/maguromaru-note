"use client";

import Image from "next/image";

import { mapDisplayColorForPart } from "@/lib/domain/part-brand-colors";
import type { VisitRecord } from "@/lib/domain/types";
import { formatDisplayDate } from "@/lib/utils/date";

export function VisitLogCard({
  log,
  onDelete,
  onShare,
  deleting = false,
}: {
  log: VisitRecord;
  onShare: (log: VisitRecord) => void;
  onDelete?: (log: VisitRecord) => void;
  deleting?: boolean;
}) {
  return (
    <article className="card">
      <div className="visit-card-head">
        <div>
          <div className="log-date">{formatDisplayDate(log.visitedAt)}</div>
          <div className="menu-name">{log.menuItem.name}</div>
        </div>
        <div className="pill pill-muted">{new Intl.NumberFormat("ja-JP").format(log.menuItem.price)}円</div>
      </div>
      {log.photoUrl ? (
        <Image
          alt={`${log.menuItem.name} の写真`}
          className="visit-photo"
          height={240}
          src={log.photoUrl}
          unoptimized
          width={398}
        />
      ) : null}
      <div className="tags">
        {log.parts.length > 0 ? (
          log.parts.map((part) => {
            const c = mapDisplayColorForPart(part);
            return (
              <span className="tag" key={part.id} style={{ backgroundColor: `${c}22`, borderColor: `${c}66` }}>
                {part.name}
              </span>
            );
          })
        ) : (
          <span className="tag">部位メモなし</span>
        )}
      </div>
      {log.memo ? <div className="log-memo">{log.memo}</div> : null}
      <div className="log-actions">
        <button className="button-subtle" onClick={() => onShare(log)} type="button">
          {log.shareBonusClaimed ? "🔗 シェア済み" : "📣 シェア（来店1.2倍）"}
        </button>
        {onDelete ? (
          <button className="button-subtle danger-button" disabled={deleting} onClick={() => onDelete(log)} type="button">
            {deleting ? "削除中..." : "削除"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
