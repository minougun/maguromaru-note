"use client";

import { useState } from "react";

import type { PartId } from "@/lib/domain/types";
import { seededParts } from "@/lib/domain/seed";

interface MapRegionDef {
  id: PartId;
  type: "circle" | "ellipse";
  cx: number;
  cy: number;
  r?: number;
  rx?: number;
  ry?: number;
  /** Show label + leader line (for parts not labeled in the illustration) */
  showLabel?: { lx: number; ly: number };
}

// Positions matched to tuna-map.jpg illustration
const MAP_REGIONS: MapRegionDef[] = [
  { id: "noten", type: "circle", cx: 148, cy: 82, r: 22 },
  { id: "hoho", type: "ellipse", cx: 130, cy: 195, rx: 26, ry: 20 },
  { id: "kama", type: "ellipse", cx: 155, cy: 285, rx: 28, ry: 18 },
  { id: "chutoro", type: "ellipse", cx: 310, cy: 100, rx: 70, ry: 24 },
  { id: "akami", type: "ellipse", cx: 360, cy: 190, rx: 75, ry: 35 },
  { id: "otoro", type: "ellipse", cx: 265, cy: 278, rx: 40, ry: 20, showLabel: { lx: 265, ly: 320 } },
  { id: "senaka", type: "ellipse", cx: 440, cy: 105, rx: 36, ry: 22, showLabel: { lx: 440, ly: 58 } },
  { id: "haramo", type: "ellipse", cx: 390, cy: 278, rx: 55, ry: 22, showLabel: { lx: 390, ly: 322 } },
];

const partsById = new Map(seededParts.map((p) => [p.id, p]));

interface TunaMapProps {
  collectedPartIds: PartId[];
}

export function TunaMap({ collectedPartIds }: TunaMapProps) {
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
        <svg viewBox="0 0 603 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="まぐろ部位マップ">
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a0e08" />
              <stop offset="100%" stopColor="#0d0805" />
            </linearGradient>
            <filter id="glowF" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="603" height="370" fill="url(#bgGrad)" />

          <image
            href="/tuna-map.jpg"
            width="603"
            height="370"
            preserveAspectRatio="xMidYMid slice"
            opacity="0.85"
          />

          {/* regions (circles/ellipses only, no labels) */}
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
                {/* Label for parts not shown in the illustration */}
                {r.showLabel ? (
                  <>
                    <line x1={r.showLabel.lx} y1={r.showLabel.ly + 8} x2={r.cx} y2={r.cy} stroke="var(--cream-faint, #c4a878)" strokeWidth="1.2" opacity="0.7" fill="none" />
                    <rect
                      x={r.showLabel.lx - 28}
                      y={r.showLabel.ly - 12}
                      rx="10"
                      ry="10"
                      width="56"
                      height="20"
                      fill={eaten ? part.color : "rgba(80,80,80,0.7)"}
                      fillOpacity={eaten ? 0.9 : 0.6}
                      stroke={eaten ? part.color : "rgba(150,150,150,0.4)"}
                      strokeWidth="1"
                    />
                    <text
                      x={r.showLabel.lx}
                      y={r.showLabel.ly + 2}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill={eaten ? "#0d0805" : "#ccc"}
                      fontFamily="Noto Sans JP, sans-serif"
                    >
                      {part.name}
                    </text>
                  </>
                ) : null}
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
