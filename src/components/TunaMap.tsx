"use client";

import { useId, useState } from "react";

import tunaMapBase from "@/assets/zukan-tuna-map.webp";
import tunaMapReveal from "@/assets/zukan-tuna-map-reveal.webp";

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

/**
 * viewBox 1365×768。ベース画＋記録済みクリップ用の色付き画（同一クロップ）。
 * 各部位は `zukan-tuna-map-reveal.webp` 上の色塗り境界に沿うよう、
 * 輪郭追従（類似色 flood + 凸包）と脳天のみ手調整ポリゴンで path を定義。
 * WebP を差し替えた場合は scripts/build-map-regions-from-reveal.py で path を再生成できる（脳天は手調整）。
 */
const MAP_REGIONS: MapRegionDef[] = [
  {
    key: "noten",
    partIds: ["noten"],
    shape: {
      type: "path",
      d: "M 262,192 L 328,186 L 342,218 L 312,238 L 252,222 Z",
    },
    label: { x: 228, y: 92 },
    lineTo: { x: 299, y: 211 },
  },
  {
    key: "meura",
    partIds: ["meura"],
    shape: {
      type: "path",
      d: "M 232,275 L 243,270 L 268,260 L 279,256 L 296,251 L 350,259 L 357,266 L 355,268 L 348,270 L 299,283 L 254,292 L 244,290 L 240,286 L 233,278 L 232,276 Z",
    },
    label: { x: 158, y: 262 },
    lineTo: { x: 294, y: 272 },
  },
  {
    key: "hoho",
    partIds: ["hoho"],
    shape: {
      type: "path",
      d: "M 92,416 L 133,350 L 148,348 L 312,332 L 329,333 L 346,335 L 348,339 L 241,475 L 176,459 L 159,453 L 123,437 L 111,431 L 101,425 L 95,420 Z",
    },
    label: { x: 92, y: 486 },
    lineTo: { x: 232, y: 405 },
  },
  {
    key: "chutoro-back",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d:
        "M 369,244 L 376,241 L 386,238 L 400,235 L 415,232 L 443,227 L 492,221 L 507,220 L 544,218 L 548,221 L 550,224 L 551,227 L 550,228 L 544,231 L 374,251 L 373,250 Z " +
        "M 956,275 L 964,265 L 1004,227 L 1022,214 L 1026,215 L 1074,263 L 1093,283 L 1090,291 L 1068,313 L 1062,314 L 1036,317 L 1000,304 L 961,286 Z",
    },
    label: { x: 668, y: 82, text: "中トロ（背）" },
    labelWidth: 200,
    lineTo: { x: 716, y: 251 },
  },
  {
    key: "akami",
    partIds: ["akami"],
    shape: {
      type: "path",
      d:
        "M 499,327 L 523,303 L 557,299 L 561,299 L 607,300 L 662,302 L 686,304 L 732,309 L 816,321 L 834,325 L 843,328 L 894,394 L 891,403 L 558,452 L 529,422 Z " +
        "M 1116,386 L 1117,379 L 1118,377 L 1128,377 L 1219,378 L 1218,380 L 1206,387 L 1117,393 L 1116,392 Z",
    },
    label: { x: 1040, y: 336 },
    lineTo: { x: 698, y: 375 },
  },
  {
    key: "belly-otoro-rear",
    partIds: ["otoro"],
    shape: {
      type: "path",
      d: "M 551,554 L 559,526 L 562,521 L 790,499 L 791,500 L 790,515 L 788,522 L 787,524 L 786,525 L 780,530 L 744,539 L 720,544 L 705,546 L 649,553 L 640,554 L 630,555 L 614,556 L 562,556 L 554,555 Z",
    },
    label: { x: 808, y: 628, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 684, y: 535 },
  },
  {
    key: "belly-chutoro",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d: "M 798,517 L 803,496 L 807,493 L 982,432 L 997,428 L 1000,429 L 1000,430 L 996,441 L 984,449 L 973,455 L 914,481 L 895,489 L 850,507 L 808,522 L 807,522 L 799,521 Z",
    },
    label: { x: 1008, y: 608, text: "中トロ（腹）" },
    labelWidth: 210,
    lineTo: { x: 901, y: 476 },
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    shape: {
      type: "path",
      d: "M 347,530 L 350,527 L 394,500 L 403,500 L 547,520 L 552,524 L 546,545 L 540,555 L 539,556 L 531,556 L 506,555 L 479,553 L 449,550 L 424,547 L 400,544 L 380,540 L 368,537 L 351,532 Z",
    },
    label: { x: 352, y: 692, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 450, y: 537 },
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

function selectionOutlineEl(r: MapRegionDef["shape"], color: string) {
  if (r.type === "ellipse") {
    return (
      <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill="none" stroke={color} strokeWidth="3" opacity="0.95" />
    );
  }
  return <path d={r.d} fill="none" stroke={color} strokeWidth="3" opacity="0.95" />;
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
                  stroke="rgba(92,63,45,0.72)"
                  strokeWidth="4"
                  opacity="0.9"
                  fill="none"
                />
                {isSelected ? selectionOutlineEl(r.shape, primary.color) : null}
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
