"use client";

import { useState } from "react";

import type { Part, PartId } from "@/lib/domain/types";

interface MapRegionDef {
  id: PartId;
  type: "circle" | "ellipse";
  cx: number;
  cy: number;
  r?: number;
  rx?: number;
  ry?: number;
  label: {
    x: number;
    y: number;
  };
}

/**
 * viewBox 1365×768（`/zukan-tuna-map.webp` / `public/tuna-map-base.svg` と同一想定）。
 * ラベル位置は部位図（頭左・腹下に大とろ・中とろ、体軸中央に赤身）に合わせる。
 */
const MAP_REGIONS: MapRegionDef[] = [
  { id: "noten", type: "ellipse", cx: 292, cy: 178, rx: 48, ry: 30, label: { x: 228, y: 92 } },
  { id: "hoho", type: "ellipse", cx: 206, cy: 426, rx: 52, ry: 40, label: { x: 92, y: 486 } },
  { id: "meura", type: "ellipse", cx: 238, cy: 342, rx: 42, ry: 32, label: { x: 158, y: 262 } },
  { id: "chutoro", type: "ellipse", cx: 788, cy: 532, rx: 136, ry: 56, label: { x: 1002, y: 628 } },
  { id: "akami", type: "ellipse", cx: 718, cy: 394, rx: 238, ry: 90, label: { x: 1040, y: 336 } },
  { id: "otoro", type: "ellipse", cx: 448, cy: 550, rx: 118, ry: 50, label: { x: 402, y: 694 } },
];

interface TunaMapProps {
  parts: Part[];
  collectedPartIds: PartId[];
}

export function TunaMap({ parts, collectedPartIds }: TunaMapProps) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const collected = new Set(collectedPartIds);
  const [selectedPartId, setSelectedPartId] = useState<PartId | null>(null);

  const selectedPart = selectedPartId ? partsById.get(selectedPartId) : null;
  const isSelectedCollected = selectedPartId ? collected.has(selectedPartId) : false;

  function handleTap(id: PartId) {
    setSelectedPartId((current) => (current === id ? null : id));
  }

  return (
    <div>
      <div className="map-wrap">
        <svg viewBox="0 0 1365 768" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="まぐろ部位マップ">
          <defs>
            <filter id="glowF" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <image
            href="/zukan-tuna-map.webp"
            width="1365"
            height="768"
            preserveAspectRatio="xMidYMid meet"
          />

          {MAP_REGIONS.map((r) => {
            const part = partsById.get(r.id);
            if (!part) return null;
            const eaten = collected.has(r.id);
            const isSelected = selectedPartId === r.id;
            const fill = eaten ? part.color : "transparent";
            const fillOpacity = eaten ? (isSelected ? 0.6 : 0.4) : 0;
            const stroke = eaten ? part.color : "rgba(0,0,0,0.6)";
            const strokeDasharray = eaten ? "none" : "4 4";
            const strokeWidth = isSelected ? 3 : 2;
            const filterAttr = eaten ? "url(#glowF)" : undefined;

            return (
              <g
                key={r.id}
                onClick={() => handleTap(r.id)}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={`${part.name}${eaten ? "（記録済み）" : ""}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTap(r.id); }}
              >
                {r.type === "circle" ? (
                  <circle
                    cx={r.cx}
                    cy={r.cy}
                    r={r.r}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    filter={filterAttr}
                  />
                ) : (
                  <ellipse
                    cx={r.cx}
                    cy={r.cy}
                    rx={r.rx}
                    ry={r.ry}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    filter={filterAttr}
                  />
                )}
                {/* Invisible hit area for easier tapping */}
                {r.type === "circle" ? (
                  <circle cx={r.cx} cy={r.cy} r={(r.r ?? 20) + 10} fill="transparent" />
                ) : (
                  <ellipse cx={r.cx} cy={r.cy} rx={(r.rx ?? 30) + 10} ry={(r.ry ?? 20) + 10} fill="transparent" />
                )}
                <line
                  x1={r.label.x}
                  y1={r.label.y + 18}
                  x2={r.cx}
                  y2={r.cy}
                  stroke="rgba(92,63,45,0.72)"
                  strokeWidth="4"
                  opacity="0.9"
                  fill="none"
                />
                <rect
                  x={r.label.x - 76}
                  y={r.label.y - 26}
                  rx="22"
                  ry="22"
                  width="152"
                  height="52"
                  fill={eaten ? part.color : "rgba(55,38,32,0.92)"}
                  stroke={eaten ? part.color : "rgba(196,168,120,0.45)"}
                  strokeWidth="2"
                />
                <text
                  x={r.label.x}
                  y={r.label.y + 8}
                  textAnchor="middle"
                  fontSize="28"
                  fontWeight="700"
                  fill={eaten ? "#0d0805" : "#f2e4c7"}
                  fontFamily="Noto Sans JP, sans-serif"
                >
                  {part.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="map-hint">タップで部位の詳細を表示 ・ 色付き＝食べた部位</p>

      {selectedPart ? (
        <div className="map-detail-card">
          <div className="map-detail-header">
            <span className="map-detail-name" style={{ color: isSelectedCollected ? selectedPart.color : "var(--cream)" }}>
              {selectedPart.name}
            </span>
            <span className="map-detail-area">{selectedPart.area}</span>
            <span className="map-detail-rarity">{"★".repeat(selectedPart.rarity) + "☆".repeat(3 - selectedPart.rarity)}</span>
          </div>
          <p className="map-detail-desc">
            {isSelectedCollected ? selectedPart.description : "まだ食べていません"}
          </p>
          {isSelectedCollected ? (
            <span className="badge badge-available">記録済み</span>
          ) : (
            <span className="badge badge-soldout">未記録</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
