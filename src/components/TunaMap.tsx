"use client";

import { memo, useState } from "react";

import tunaMapBase from "@/assets/zukan-tuna-map.webp";

import { mapDisplayColorForPart } from "@/lib/domain/part-brand-colors";
import { mapOverlayTintHex } from "@/lib/map-overlay-tint";
import type { Part, PartId } from "@/lib/domain/types";

type RegionShape =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "path"; d: string };

interface MapRegionDef {
  key: string;
  partIds: PartId[];
  shape: RegionShape;
  label: {
    x: number;
    y: number;
    text?: string;
  };
  labelWidth?: number;
  /** リーダー線の終点（部位の見た目の中心付近） */
  lineTo: { x: number; y: number };
}

/** 参考: `スクリーンショット 2026-03-31 160835.png` のラベル帯 */
const MAP_LABEL_BG = "#701d1d";
const MAP_LABEL_TEXT = "#ffffff";
const MAP_LEADER_STROKE = "#701d1d";

/**
 * viewBox 1365×768。ベース画＋記録済みクリップ用の色付き画（同一クロップ）。
 * 各部位は `zukan-tuna-map-reveal.webp` 上の色塗りに沿うよう、
 * 脳天・目裏・ほほ・腹周りなどは、参考画像に合わせた手調整の path を使う。
 * 赤身・中トロ（背）は広い塗りで輪郭自動生成が階段状に崩れやすいため手調整の path を維持。
 * WebP を差し替えた場合は scripts/build-map-regions-from-reveal.py で参考 path を再生成できる。
 */
const MAP_REGIONS: MapRegionDef[] = [
  {
    key: "noten",
    partIds: ["noten"],
    shape: {
      type: "path",
      d: "M 245,246 L 309,236 L 346,243 L 341,269 L 286,279 L 252,271 Z",
    },
    label: { x: 228, y: 92 },
    lineTo: { x: 294, y: 254 },
  },
  {
    key: "meura",
    partIds: ["meura"],
    shape: {
      type: "path",
      d: "M 190,289 L 234,281 L 265,286 L 258,308 L 214,317 L 188,308 Z",
    },
    label: { x: 155, y: 288 },
    lineTo: { x: 230, y: 298 },
  },
  {
    key: "hoho",
    partIds: ["hoho"],
    shape: {
      type: "path",
      d: "M 228,401 L 240,443 L 279,467 L 310,463 L 333,441 L 338,410 L 330,384 L 309,371 L 276,378 L 243,391 Z",
    },
    label: { x: 92, y: 486 },
    lineTo: { x: 283, y: 419 },
  },
  {
    key: "chutoro-back",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d: "M 350,230 L 421,219 L 502,214 L 579,214 L 645,219 L 700,227 L 728,238 L 719,285 L 650,284 L 575,281 L 496,281 L 424,286 L 372,292 L 354,278 Z",
    },
    label: { x: 668, y: 82, text: "中トロ（背）" },
    labelWidth: 200,
    lineTo: { x: 584, y: 248 },
  },
  {
    key: "akami",
    partIds: ["akami"],
    shape: {
      type: "path",
      d: "M 507,322 L 549,304 L 621,302 L 699,309 L 774,323 L 832,344 L 861,377 L 842,411 L 791,436 L 721,449 L 639,447 L 570,439 L 525,421 L 494,383 Z",
    },
    label: { x: 1040, y: 336 },
    lineTo: { x: 699, y: 380 },
  },
  {
    key: "belly-chutoro",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d: "M 792,507 L 838,478 L 915,458 L 949,463 L 942,487 L 859,512 Z",
    },
    label: { x: 1008, y: 608, text: "中トロ（腹）" },
    labelWidth: 210,
    lineTo: { x: 878, y: 482 },
  },
  {
    key: "belly-otoro-rear",
    partIds: ["otoro"],
    shape: {
      type: "path",
      d: "M 542,552 L 556,485 L 603,471 L 666,465 L 725,467 L 777,476 L 771,496 L 742,519 L 705,534 L 665,545 L 614,551 Z",
    },
    label: { x: 808, y: 628, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 670, y: 491 },
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    shape: {
      type: "path",
      d: "M 360,539 L 386,470 L 429,457 L 482,457 L 533,469 L 542,488 L 523,520 L 490,541 L 451,549 L 407,547 L 372,541 Z",
    },
    label: { x: 352, y: 692, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 458, y: 492 },
  },
];

interface TunaMapProps {
  parts: Part[];
  collectedPartIds: PartId[];
}

function tunaMapPropsEqual(prev: TunaMapProps, next: TunaMapProps): boolean {
  if (prev.parts === next.parts && prev.collectedPartIds === next.collectedPartIds) {
    return true;
  }
  if (prev.collectedPartIds.length !== next.collectedPartIds.length) return false;
  for (let i = 0; i < prev.collectedPartIds.length; i++) {
    if (prev.collectedPartIds[i] !== next.collectedPartIds[i]) return false;
  }
  if (prev.parts.length !== next.parts.length) return false;
  for (let i = 0; i < prev.parts.length; i++) {
    const a = prev.parts[i]!;
    const b = next.parts[i]!;
    if (
      a.id !== b.id ||
      a.color !== b.color ||
      a.name !== b.name ||
      a.area !== b.area ||
      a.rarity !== b.rarity ||
      a.description !== b.description
    ) {
      return false;
    }
  }
  return true;
}

function regionEaten(region: MapRegionDef, collected: Set<PartId>): boolean {
  return region.partIds.some((id) => collected.has(id));
}

function regionPrimaryPart(region: MapRegionDef, partsById: Map<PartId, Part>, collected: Set<PartId>): Part | null {
  const firstCollected = region.partIds.find((id) => collected.has(id));
  const id = firstCollected ?? region.partIds[0];
  return partsById.get(id!) ?? null;
}

function filledShapeEl(r: MapRegionDef["shape"], fill: string, opacity: string) {
  if (r.type === "ellipse") {
    return <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={fill} opacity={opacity} />;
  }
  return <path d={r.d} fill={fill} opacity={opacity} />;
}

function hitShapeEl(r: MapRegionDef["shape"]) {
  if (r.type === "ellipse") {
    return <ellipse cx={r.cx} cy={r.cy} rx={(r.rx ?? 30) + 12} ry={(r.ry ?? 20) + 12} fill="transparent" />;
  }
  return <path d={r.d} fill="transparent" />;
}

function selectionOutlineEl(r: MapRegionDef["shape"]) {
  const stroke = "#ffffff";
  if (r.type === "ellipse") {
    return (
      <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill="none" stroke={stroke} strokeWidth="3" opacity="0.95" />
    );
  }
  return <path d={r.d} fill="none" stroke={stroke} strokeWidth="3" opacity="0.95" />;
}

function TunaMapInner({ parts, collectedPartIds }: TunaMapProps) {
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
          <image href={tunaMapBase.src} width="1365" height="768" preserveAspectRatio="xMidYMid meet" />

          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;
            const eaten = regionEaten(r, collected);
            if (!eaten) return null;
            const primary = regionPrimaryPart(r, partsById, collected);
            const tint = primary ? mapOverlayTintHex(mapDisplayColorForPart(primary)) : null;
            const tintOpacity =
              primary?.id === "otoro" || primary?.id === "chutoro" ? "0.72" : "0.64";
            if (tint == null) return null;
            return <g key={`fill-${r.key}`}>{filledShapeEl(r.shape, tint, tintOpacity)}</g>;
          })}

          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;

            const primary = regionPrimaryPart(r, partsById, collected);
            if (!primary) return null;

            const isSelected = selectedRegionKey === r.key;
            const lw = (r.labelWidth ?? 152) / 2;
            const { x: lx, y: ly } = r.lineTo;

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
                  x2={lx}
                  y2={ly}
                  stroke={MAP_LEADER_STROKE}
                  strokeWidth="3"
                  opacity="0.92"
                  fill="none"
                />
                {isSelected ? selectionOutlineEl(r.shape) : null}
                <rect
                  x={r.label.x - lw}
                  y={r.label.y - 26}
                  rx="22"
                  ry="22"
                  width={lw * 2}
                  height="52"
                  fill={MAP_LABEL_BG}
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1"
                />
                <text
                  x={r.label.x}
                  y={r.label.y + 8}
                  textAnchor="middle"
                  fontSize={r.label.text && r.label.text.length > 5 ? 22 : 28}
                  fontWeight="700"
                  fill={MAP_LABEL_TEXT}
                  fontFamily="Noto Sans JP, sans-serif"
                >
                  {labelForRegion(r)}
                </text>
                {hitShapeEl(r.shape)}
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
                <span className="map-detail-name">{part.name}</span>
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
                    <span className="map-detail-name">{part.name}</span>
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

export const TunaMap = memo(TunaMapInner, tunaMapPropsEqual);
