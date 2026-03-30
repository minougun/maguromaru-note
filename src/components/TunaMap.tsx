"use client";

import { useId, useState } from "react";

import tunaMapBase from "@/assets/zukan-tuna-map.webp";
import tunaMapReveal from "@/assets/zukan-tuna-map-reveal.webp";

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
    /** 未指定なら partIds[0] の名前 */
    text?: string;
  };
  /** ラベル枠の幅（長い文言用） */
  labelWidth?: number;
}

/**
 * viewBox 1365×768。
 * ベース画（未記録時の見た目）と、同寸法・同一クロップの「色付き」画を積層する。
 * 記録済み部位だけ clipPath（楕円＝旧マップと同じヒット領域）で上層を切り出して表示する。
 * 参照元 PNG:
 * - ベース: Gemini_Generated_Image_5bs0vj5bs0vj5bs0.png
 * - 色付き: Gemini_Generated_Image_gkdhirgkdhirgkdh.png
 * （`src/assets/` の WebP は scripts/generate-zukan-map-webp.py で再生成可能）
 */
const MAP_REGIONS: MapRegionDef[] = [
  { key: "noten", partIds: ["noten"], type: "ellipse", cx: 292, cy: 178, rx: 48, ry: 30, label: { x: 228, y: 92 } },
  { key: "hoho", partIds: ["hoho"], type: "ellipse", cx: 206, cy: 426, rx: 52, ry: 40, label: { x: 92, y: 486 } },
  { key: "meura", partIds: ["meura"], type: "ellipse", cx: 238, cy: 342, rx: 42, ry: 32, label: { x: 158, y: 262 } },
  {
    key: "chutoro-back",
    partIds: ["chutoro"],
    type: "ellipse",
    cx: 712,
    cy: 248,
    rx: 208,
    ry: 70,
    label: { x: 668, y: 82, text: "中トロ（背）" },
    labelWidth: 200,
  },
  { key: "akami", partIds: ["akami"], type: "ellipse", cx: 718, cy: 394, rx: 238, ry: 90, label: { x: 1040, y: 336 } },
  {
    key: "belly-otoro-rear",
    partIds: ["otoro"],
    type: "ellipse",
    cx: 678,
    cy: 548,
    rx: 78,
    ry: 52,
    label: { x: 808, y: 628, text: "大トロ" },
    labelWidth: 132,
  },
  {
    key: "belly-chutoro",
    partIds: ["chutoro"],
    type: "ellipse",
    cx: 802,
    cy: 548,
    rx: 78,
    ry: 52,
    label: { x: 1008, y: 608, text: "中トロ（腹）" },
    labelWidth: 210,
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    type: "ellipse",
    cx: 438,
    cy: 556,
    rx: 112,
    ry: 48,
    label: { x: 352, y: 692, text: "大トロ" },
    labelWidth: 132,
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

function clipShapeEl(r: MapRegionDef) {
  if (r.type === "circle") {
    return <circle cx={r.cx} cy={r.cy} r={r.r} />;
  }
  return <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} />;
}

export function TunaMap({ parts, collectedPartIds }: TunaMapProps) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const collected = new Set(collectedPartIds);
  const [selectedRegionKey, setSelectedRegionKey] = useState<string | null>(null);
  const clipUid = useId().replace(/:/g, "");

  const selectedRegion = selectedRegionKey ? MAP_REGIONS.find((r) => r.key === selectedRegionKey) : null;

  function clipId(key: string) {
    return `${clipUid}-clip-${key}`;
  }

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
            {MAP_REGIONS.map((r) => (
              <clipPath id={clipId(r.key)} key={`clip-${r.key}`}>
                {clipShapeEl(r)}
              </clipPath>
            ))}
          </defs>

          <image href={tunaMapBase.src} width="1365" height="768" preserveAspectRatio="xMidYMid meet" />

          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;
            const eaten = regionEaten(r, collected);
            if (!eaten) return null;
            return (
              <g key={`reveal-${r.key}`} clipPath={`url(#${clipId(r.key)})`}>
                <image href={tunaMapReveal.src} width="1365" height="768" preserveAspectRatio="xMidYMid meet" />
              </g>
            );
          })}

          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;

            const eaten = regionEaten(r, collected);
            const primary = regionPrimaryPart(r, partsById, collected);
            if (!primary) return null;

            const isSelected = selectedRegionKey === r.key;
            const lw = (r.labelWidth ?? 152) / 2;

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
                {isSelected ? (
                  r.type === "circle" ? (
                    <circle
                      cx={r.cx}
                      cy={r.cy}
                      r={r.r}
                      fill="none"
                      stroke={primary.color}
                      strokeWidth="3"
                      opacity="0.95"
                    />
                  ) : (
                    <ellipse
                      cx={r.cx}
                      cy={r.cy}
                      rx={r.rx}
                      ry={r.ry}
                      fill="none"
                      stroke={primary.color}
                      strokeWidth="3"
                      opacity="0.95"
                    />
                  )
                ) : null}
                <rect
                  x={r.label.x - lw}
                  y={r.label.y - 26}
                  rx="22"
                  ry="22"
                  width={lw * 2}
                  height="52"
                  fill={eaten ? primary.color : "rgba(55,38,32,0.92)"}
                  stroke={eaten ? primary.color : "rgba(196,168,120,0.45)"}
                  strokeWidth="2"
                />
                <text
                  x={r.label.x}
                  y={r.label.y + 8}
                  textAnchor="middle"
                  fontSize={r.label.text && r.label.text.length > 5 ? 22 : 28}
                  fontWeight="700"
                  fill={eaten ? "#0d0805" : "#f2e4c7"}
                  fontFamily="Noto Sans JP, sans-serif"
                >
                  {labelForRegion(r)}
                </text>
                {r.type === "circle" ? (
                  <circle cx={r.cx} cy={r.cy} r={(r.r ?? 20) + 10} fill="transparent" />
                ) : (
                  <ellipse cx={r.cx} cy={r.cy} rx={(r.rx ?? 30) + 10} ry={(r.ry ?? 20) + 10} fill="transparent" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="map-hint">タップで部位の詳細を表示 ・ 記録済みの部位だけ色付きイラストが重なります</p>

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
                <span className="map-detail-rarity">
                  レア度: {"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}
                </span>
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
                    <span className="map-detail-rarity">
                      レア度: {"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}
                    </span>
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
