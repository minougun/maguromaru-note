"use client";

import { useState } from "react";

import tunaMapBackground from "@/assets/zukan-tuna-map.webp";

import type { Part, PartId } from "@/lib/domain/types";

interface MapRegionDef {
  /** React の key（同一 partId を複数領域に使うため必須） */
  key: string;
  /** このシェイプが表す部位（腹の一括りは複数） */
  partIds: PartId[];
  type: "circle" | "ellipse";
  cx: number;
  cy: number;
  r?: number;
  rx?: number;
  ry?: number;
  label: {
    x: number;
    y: number;
    /** 未指定なら partIds から名称を結合 */
    text?: string;
  };
  /** ラベル枠の幅（長い文言用） */
  labelWidth?: number;
}

/**
 * viewBox 1365×768。背景は `src/assets/zukan-tuna-map.webp`（幅 1365 に最適化済み）。
 * ラベル・楕円位置は参考解剖図（714×429px、例: Downloads/655546.jpg）を縦横それぞれ線形スケールして合わせている。
 * 腹は前から「大トロ」「大トロ・中トロ」「中とろ（後腹）」。中とろは背のブロックでもハイライト。
 */
const REF_W = 714;
const REF_H = 429;
const VB_W = 1365;
const VB_H = 768;

function sx(x: number): number {
  return (x * VB_W) / REF_W;
}
function sy(y: number): number {
  return (y * VB_H) / REF_H;
}

const MAP_REGIONS: MapRegionDef[] = [
  {
    key: "noten",
    partIds: ["noten"],
    type: "ellipse",
    cx: sx(182),
    cy: sy(110),
    rx: sx(34),
    ry: sy(22),
    label: { x: sx(90), y: sy(56) },
  },
  {
    key: "hoho",
    partIds: ["hoho"],
    type: "ellipse",
    cx: sx(120),
    cy: sy(235),
    rx: sx(46),
    ry: sy(36),
    label: { x: sx(60), y: sy(278) },
  },
  {
    key: "meura",
    partIds: ["meura"],
    type: "ellipse",
    cx: sx(200),
    cy: sy(162),
    rx: sx(38),
    ry: sy(30),
    label: { x: sx(138), y: sy(128) },
  },
  {
    key: "chutoro-back",
    partIds: ["chutoro"],
    type: "ellipse",
    cx: sx(400),
    cy: sy(118),
    rx: sx(128),
    ry: sy(40),
    label: { x: sx(357), y: sy(52) },
  },
  {
    key: "akami",
    partIds: ["akami"],
    type: "ellipse",
    cx: sx(392),
    cy: sy(208),
    rx: sx(152),
    ry: sy(50),
    label: { x: sx(450), y: sy(210) },
    labelWidth: 168,
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    type: "ellipse",
    cx: sx(285),
    cy: sy(320),
    rx: sx(74),
    ry: sy(36),
    label: { x: sx(272), y: sy(398), text: "大トロ" },
    labelWidth: 132,
  },
  {
    key: "belly-otoro-chutoro-mid",
    partIds: ["otoro", "chutoro"],
    type: "ellipse",
    cx: sx(432),
    cy: sy(315),
    rx: sx(86),
    ry: sy(34),
    label: { x: sx(448), y: sy(392), text: "大トロ・中トロ" },
    labelWidth: 248,
  },
  {
    key: "belly-chutoro-rear",
    partIds: ["chutoro"],
    type: "ellipse",
    cx: sx(538),
    cy: sy(308),
    rx: sx(70),
    ry: sy(32),
    label: { x: sx(548), y: sy(382) },
    labelWidth: 168,
  },
];

interface TunaMapProps {
  parts: Part[];
  collectedPartIds: PartId[];
}

function regionEaten(region: MapRegionDef, collected: Set<PartId>): boolean {
  return region.partIds.some((id) => collected.has(id));
}

function regionPrimaryPart(region: MapRegionDef, partsById: Map<PartId, Part>, collected: Set<PartId>): Part | null {
  const firstCollected = region.partIds.find((id) => collected.has(id));
  const id = firstCollected ?? region.partIds[0];
  return partsById.get(id!) ?? null;
}

export function TunaMap({ parts, collectedPartIds }: TunaMapProps) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const collected = new Set(collectedPartIds);
  const [selectedRegionKey, setSelectedRegionKey] = useState<string | null>(null);

  const selectedRegion = selectedRegionKey ? MAP_REGIONS.find((r) => r.key === selectedRegionKey) : null;

  function handleTapRegion(region: MapRegionDef) {
    setSelectedRegionKey((current) => (current === region.key ? null : region.key));
  }

  function labelForRegion(r: MapRegionDef): string {
    if (r.label.text) return r.label.text;
    const names = r.partIds.map((id) => partsById.get(id)?.name).filter(Boolean);
    return names.join("・") || "";
  }

  function ariaForRegion(r: MapRegionDef): string {
    const eaten = regionEaten(r, collected);
    const base = labelForRegion(r);
    return `${base}${eaten ? "（いずれか記録済み）" : ""}`;
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
            href={tunaMapBackground.src}
            width="1365"
            height="768"
            preserveAspectRatio="xMidYMid meet"
          />

          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;

            const eaten = regionEaten(r, collected);
            const primary = regionPrimaryPart(r, partsById, collected);
            if (!primary) return null;

            const isSelected = selectedRegionKey === r.key;
            const fill = eaten ? primary.color : "transparent";
            const fillOpacity = eaten ? (isSelected ? 0.6 : 0.4) : 0;
            const stroke = eaten ? primary.color : "#000000";
            const strokeDasharray = eaten ? "none" : "6 5";
            const strokeWidth = eaten ? (isSelected ? 3 : 2) : isSelected ? 5.25 : 4.5;
            const filterAttr = eaten ? "url(#glowF)" : undefined;

            return (
              <g
                key={r.key}
                onClick={() => handleTapRegion(r)}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={ariaForRegion(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleTapRegion(r);
                }}
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
                {r.type === "circle" ? (
                  <circle cx={r.cx} cy={r.cy} r={(r.r ?? 20) + 10} fill="transparent" />
                ) : (
                  <ellipse cx={r.cx} cy={r.cy} rx={(r.rx ?? 30) + 10} ry={(r.ry ?? 20) + 10} fill="transparent" />
                )}
              </g>
            );
          })}
          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;

            const eaten = regionEaten(r, collected);
            const primary = regionPrimaryPart(r, partsById, collected);
            if (!primary) return null;

            const lw = (r.labelWidth ?? 152) / 2;
            const labelText = labelForRegion(r);
            if (!labelText) return null;

            return (
              <g key={`${r.key}-labels`} aria-hidden="true" onClick={() => handleTapRegion(r)} style={{ cursor: "pointer" }}>
                <line
                  className="map-label-leader"
                  x1={r.label.x}
                  y1={r.label.y + 18}
                  x2={r.cx}
                  y2={r.cy}
                />
                <rect
                  className={eaten ? "map-label-pill map-label-pill--eaten" : "map-label-pill"}
                  x={r.label.x - lw}
                  y={r.label.y - 26}
                  rx="22"
                  ry="22"
                  width={lw * 2}
                  height="52"
                  fill={eaten ? primary.color : undefined}
                  stroke={eaten ? primary.color : undefined}
                />
                <text
                  className={eaten ? "map-label-text map-label-text--eaten" : "map-label-text"}
                  x={r.label.x}
                  y={r.label.y + 8}
                  textAnchor="middle"
                  fontSize={r.label.text && r.label.text.length > 5 ? 22 : 28}
                  fontWeight="700"
                  fontFamily="Noto Sans JP, sans-serif"
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="map-hint">タップで部位の詳細を表示 ・ 色付き＝食べた部位</p>

      {selectedRegion && selectedRegion.partIds.length === 1 ? (
        (() => {
          const pid = selectedRegion.partIds[0]!;
          const part = partsById.get(pid);
          if (!part) return null;
          const isCollected = collected.has(pid);
          return (
            <div className="map-detail-card">
              <div className="map-detail-header">
                <span className="map-detail-name" style={{ color: isCollected ? part.color : "var(--cream)" }}>
                  {part.name}
                </span>
                <span className="map-detail-area">{part.area}</span>
                <span className="map-detail-rarity">{"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}</span>
              </div>
              <p className="map-detail-desc">{isCollected ? part.description : "まだ食べていません"}</p>
              {isCollected ? (
                <span className="badge badge-available">記録済み</span>
              ) : (
                <span className="badge badge-soldout">未記録</span>
              )}
            </div>
          );
        })()
      ) : null}

      {selectedRegion && selectedRegion.partIds.length > 1 ? (
        <div className="map-detail-card map-detail-card--multi">
          <ul className="map-detail-multi-list">
            {selectedRegion.partIds.map((pid) => {
              const part = partsById.get(pid);
              if (!part) return null;
              const isCollected = collected.has(pid);
              return (
                <li className="map-detail-multi-item" key={pid}>
                  <div className="map-detail-header">
                    <span className="map-detail-name" style={{ color: isCollected ? part.color : "var(--cream)" }}>
                      {part.name}
                    </span>
                    <span className="map-detail-area">{part.area}</span>
                    <span className="map-detail-rarity">{"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}</span>
                  </div>
                  <p className="map-detail-desc">{isCollected ? part.description : "まだ食べていません"}</p>
                  {isCollected ? (
                    <span className="badge badge-available">記録済み</span>
                  ) : (
                    <span className="badge badge-soldout">未記録</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
