"use client";

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
  lx: number;
  ly: number;
}

const MAP_REGIONS: MapRegionDef[] = [
  { id: "noten", type: "circle", cx: 85, cy: 80, r: 28, lx: 85, ly: 28 },
  { id: "hoho", type: "circle", cx: 105, cy: 190, r: 24, lx: 105, ly: 238 },
  { id: "kama", type: "ellipse", cx: 190, cy: 205, rx: 35, ry: 24, lx: 190, ly: 252 },
  { id: "akami", type: "ellipse", cx: 310, cy: 105, rx: 58, ry: 26, lx: 310, ly: 56 },
  { id: "chutoro", type: "ellipse", cx: 300, cy: 175, rx: 52, ry: 22, lx: 370, ly: 175 },
  { id: "otoro", type: "ellipse", cx: 305, cy: 240, rx: 52, ry: 22, lx: 305, ly: 285 },
  { id: "senaka", type: "ellipse", cx: 420, cy: 112, rx: 42, ry: 24, lx: 420, ly: 65 },
  { id: "haramo", type: "ellipse", cx: 415, cy: 237, rx: 44, ry: 22, lx: 415, ly: 282 },
];

const partsById = new Map(seededParts.map((p) => [p.id, p]));

interface TunaMapProps {
  collectedPartIds: PartId[];
}

export function TunaMap({ collectedPartIds }: TunaMapProps) {
  const collected = new Set(collectedPartIds);

  return (
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

        {/* silhouette placeholder */}
        <text x="301" y="340" textAnchor="middle" fontSize="11" fill="#555" fontFamily="Noto Sans JP, sans-serif">
          🐟 まぐろ部位マップ
        </text>

        {/* leader lines */}
        <g fill="none" stroke="var(--cream-faint, #c4a878)" strokeWidth="1.2" opacity="0.7">
          {MAP_REGIONS.map((r) => (
            <line key={`line-${r.id}`} x1={r.lx} y1={r.ly + 8} x2={r.cx} y2={r.cy} />
          ))}
        </g>

        {/* regions and labels */}
        {MAP_REGIONS.map((r) => {
          const part = partsById.get(r.id);
          if (!part) return null;
          const eaten = collected.has(r.id);
          const fill = eaten ? part.color : "transparent";
          const fillOpacity = eaten ? 0.45 : 0;
          const stroke = eaten ? part.color : "#888";
          const strokeDasharray = eaten ? "none" : "4 4";
          const filterAttr = eaten ? "url(#glowF)" : undefined;

          const labelBg = eaten ? part.color : "#666";
          const labelBgOpacity = eaten ? 0.95 : 0.5;
          const labelTextFill = eaten ? "#0d0805" : "#ccc";

          return (
            <g key={r.id}>
              {r.type === "circle" ? (
                <circle
                  cx={r.cx}
                  cy={r.cy}
                  r={r.r}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeWidth="2"
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
                  strokeWidth="2"
                  strokeDasharray={strokeDasharray}
                  filter={filterAttr}
                />
              )}
              <rect
                x={r.lx - 38}
                y={r.ly - 14}
                rx="10"
                ry="10"
                width="76"
                height="22"
                fill={labelBg}
                fillOpacity={labelBgOpacity}
                stroke={eaten ? part.color : "#888"}
                strokeWidth="1"
              />
              <text
                x={r.lx}
                y={r.ly + 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={labelTextFill}
                fontFamily="Noto Sans JP, sans-serif"
              >
                {part.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
