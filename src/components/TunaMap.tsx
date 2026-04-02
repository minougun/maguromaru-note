"use client";

import { memo, useId, useState } from "react";

import tunaMapBase from "@/assets/zukan-tuna-map.webp";
import tunaMapReveal from "@/assets/zukan-tuna-map-reveal.webp";

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
 * 脳天・目裏・ほほ・腹周りなどは、参考図に合わせて手調整の path を使う。
 * 赤身・中トロ（背）は広い塗りで輪郭自動生成が階段状に崩れやすいため手調整の path を維持。
 * WebP を差し替えた場合は scripts/build-map-regions-from-reveal.py で参考 path を再生成できる。
 */
const MAP_REGIONS: MapRegionDef[] = [
  {
    key: "noten",
    partIds: ["noten"],
    shape: {
      type: "path",
      // 頭頂の輪郭内に収める。上端を少し下げて、前方寄りの短冊状に限定
      d: "M 254,244 L 316,238 L 338,242 L 332,268 L 278,279 L 252,271 Z",
    },
    label: { x: 228, y: 92 },
    lineTo: { x: 292, y: 255 },
  },
  {
    key: "meura",
    partIds: ["meura"],
    shape: {
      type: "path",
      // 参考画像寄せ: 目裏の横長パッチ。丸ではなく細い帯に近づける
      d: "M 195,286 L 240,276 L 268,284 L 263,308 L 215,319 L 191,309 Z",
    },
    label: { x: 155, y: 288 },
    lineTo: { x: 230, y: 298 },
  },
  {
    key: "hoho",
    partIds: ["hoho"],
    shape: {
      type: "path",
      d: "M 220,400 L 236,447 L 284,474 L 319,470 L 346,446 L 349,413 L 338,379 L 315,366 L 275,377 L 238,390 Z",
    },
    label: { x: 92, y: 486 },
    lineTo: { x: 289, y: 421 },
  },
  {
    key: "chutoro-back",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d:
        // 背びれ下の帯を輪郭内へ下げる。上端を抑え、後方も少し短くする
        "M 360,233 L 430,225 L 504,222 L 575,224 L 635,229 L 684,238 L 705,248 L 698,273 L 658,281 L 592,283 L 519,283 L 448,288 L 392,294 L 369,283 L 358,252 Z",
    },
    label: { x: 668, y: 82, text: "中トロ（背）" },
    labelWidth: 200,
    lineTo: { x: 565, y: 255 },
  },
  {
    key: "akami",
    partIds: ["akami"],
    shape: {
      type: "path",
      // 参考画像寄せ: 中央の厚い赤身。背腹どちらにも寄せ過ぎず胴体中央へ集約
      d: "M 487,316 L 531,298 L 607,296 L 693,304 L 775,321 L 840,346 L 873,382 L 855,412 L 808,438 L 734,452 L 640,452 L 559,442 L 504,421 L 476,380 Z",
    },
    label: { x: 1040, y: 336 },
    lineTo: { x: 704, y: 381 },
  },
  // 腹の中トロ polygon が大トロと重なるため、先に中トロを描いてから大トロを上に載せる（さもなくば reveal が大トロを潰す）
  {
    key: "belly-chutoro",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      // 腹の大トロと重ならないよう、後方寄りの小さめ帯へ絞る
      d: "M 820,510 L 862,474 L 930,455 L 952,460 L 944,482 L 860,509 Z",
    },
    label: { x: 1008, y: 608, text: "中トロ（腹）" },
    labelWidth: 210,
    lineTo: { x: 889, y: 481 },
  },
  {
    key: "belly-otoro-rear",
    partIds: ["otoro"],
    shape: {
      type: "path",
      // 参考画像寄せ: 腹後方の大トロは幅広だが尾に向けて絞る
      d: "M 550,554 L 560,480 L 603,470 L 676,463 L 742,464 L 790,473 L 789,492 L 770,515 L 741,532 L 702,545 L 658,552 L 612,556 Z",
    },
    label: { x: 808, y: 628, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 679, y: 493 },
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    shape: {
      type: "path",
      // 参考画像寄せ: 腹前方の大トロはえら後ろから腹へ落ちる扇形
      d: "M 362,542 L 388,466 L 433,454 L 490,454 L 545,468 L 555,486 L 540,516 L 512,540 L 474,552 L 431,551 L 390,545 Z",
    },
    label: { x: 352, y: 692, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 468, y: 492 },
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

function clipShapeEl(r: MapRegionDef["shape"]) {
  if (r.type === "ellipse") {
    return <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} />;
  }
  return <path d={r.d} />;
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
  const clipUid = useId().replace(/:/g, "");
  const revealImageId = `${clipUid}-reveal`;

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
            <image
              id={revealImageId}
              href={tunaMapReveal.src}
              width="1365"
              height="768"
              preserveAspectRatio="xMidYMid meet"
            />
            {MAP_REGIONS.map((r) => (
              <clipPath id={clipId(r.key)} key={`clip-${r.key}`} clipPathUnits="userSpaceOnUse">
                {clipShapeEl(r.shape)}
              </clipPath>
            ))}
          </defs>

          <image href={tunaMapBase.src} width="1365" height="768" preserveAspectRatio="xMidYMid meet" />

          {MAP_REGIONS.map((r) => {
            const hasAllParts = r.partIds.every((id) => partsById.has(id));
            if (!hasAllParts) return null;
            const eaten = regionEaten(r, collected);
            if (!eaten) return null;
            const primary = regionPrimaryPart(r, partsById, collected);
            const tint = primary ? mapOverlayTintHex(mapDisplayColorForPart(primary)) : null;
            const tintOpacity =
              primary?.id === "otoro" || primary?.id === "chutoro" ? "0.56" : "0.48";
            return (
              <g key={`reveal-${r.key}`} clipPath={`url(#${clipId(r.key)})`}>
                <use href={`#${revealImageId}`} width="1365" height="768" />
                {tint != null ? (
                  <rect width="1365" height="768" fill={tint} opacity={tintOpacity} />
                ) : null}
              </g>
            );
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
