import { Card } from "@/components/ui/Card";
import type { Part, PartId } from "@/lib/domain/types";

export function PartsList({
  parts,
  collectedPartIds,
}: {
  parts: Part[];
  collectedPartIds: PartId[];
}) {
  const collectedSet = new Set(collectedPartIds);

  return (
    <Card>
      {parts.map((part) => {
        const eaten = collectedSet.has(part.id);
        return (
          <div className={`plist-item ${eaten ? "" : "locked"}`} key={part.id}>
            <div className="plist-icon" style={{ background: eaten ? `${part.color}44` : undefined }}>
              {eaten ? "✓" : "？"}
            </div>
            <div style={{ flex: 1 }}>
              <div className="part-name" style={{ color: eaten ? part.color : undefined }}>
                {part.name}
              </div>
              <div className="plist-desc">{eaten ? part.description : "まだ食べていません"}</div>
            </div>
            <div className="part-rarity">{"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}</div>
          </div>
        );
      })}
    </Card>
  );
}
