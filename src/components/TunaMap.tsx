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
 * 各部位は `zukan-tuna-map-reveal.webp` 上の色塗りに沿うよう、
 * 脳天・目裏は楕円。ほほ・腹周りなどは flood＋外周輪郭＋RDP。
 * 赤身・中トロ（背）は広い塗りで輪郭自動生成が階段状に崩れやすいため手調整の path を維持。
 * WebP を差し替えた場合は scripts/build-map-regions-from-reveal.py で参考 path を再生成できる。
 */
const MAP_REGIONS: MapRegionDef[] = [
  {
    key: "noten",
    partIds: ["noten"],
    shape: {
      type: "ellipse",
      // 以前の目裏と同じ中心でやや大きめ（頭部〜目周りの塗りをまとめてクリップ）
      cx: 308,
      cy: 251,
      rx: 48,
      ry: 40,
    },
    label: { x: 228, y: 92 },
    lineTo: { x: 308, y: 251 },
  },
  {
    key: "meura",
    partIds: ["meura"],
    shape: {
      type: "ellipse",
      // 目とほほ肉のあいだのピンク塗り。脳天 (308,251) 楕円と角で重ならないよう左寄せ
      cx: 236,
      cy: 294,
      rx: 24,
      ry: 22,
    },
    label: { x: 155, y: 288 },
    lineTo: { x: 236, y: 294 },
  },
  {
    key: "hoho",
    partIds: ["hoho"],
    shape: {
      type: "path",
      d: "M 241,432 L 249,464 L 307,471 L 340,460 L 350,447 L 353,401 L 352,376 L 342,356 L 335,352 L 295,393 L 246,418 Z",
    },
    label: { x: 92, y: 486 },
    lineTo: { x: 303, y: 422 },
  },
  {
    key: "chutoro-back",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d:
        "M 373,252 L 388,249 L 434,241 L 462,238 L 491,235 L 536,232 L 550,232 L 553,238 L 556,249 L 559,266 L 560,283 L 560,286 L 558,290 L 405,308 L 403,308 L 395,295 L 374,255 Z " +
        "M 560,232 L 761,227 L 766,227 L 792,233 L 797,241 L 797,243 L 770,304 L 768,306 L 589,292 L 568,290 L 566,286 L 561,251 L 560,237 Z " +
        "M 925,257 L 938,240 L 993,185 L 1002,181 L 1006,184 L 1012,189 L 1087,264 L 1090,269 L 1049,310 L 1045,312 L 1035,315 L 1032,314 L 965,288 L 932,266 Z",
    },
    label: { x: 668, y: 82, text: "中トロ（背）" },
    labelWidth: 200,
    lineTo: { x: 658, y: 268 },
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
      // reveal 腹の薄ピンクを flood→外周輪郭（前後2ブロックのうち尾寄り）
      d: "M 560,517 L 565,480 L 566,477 L 567,475 L 568,474 L 794,456 L 800,456 L 801,457 L 801,459 L 800,470 L 799,480 L 797,493 L 796,494 L 793,495 L 777,499 L 763,502 L 731,508 L 689,514 L 670,516 L 659,517 L 627,519 L 607,520 L 560,520 Z",
    },
    label: { x: 808, y: 628, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 678, y: 490 },
  },
  {
    key: "belly-chutoro",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      d: "M 802,489 L 809,455 L 916,434 L 1005,407 L 1000,426 L 854,480 L 808,493 Z",
    },
    label: { x: 1008, y: 608, text: "中トロ（腹）" },
    labelWidth: 210,
    lineTo: { x: 890, y: 451 },
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    shape: {
      type: "path",
      // reveal 腹の薄ピンクを flood→外周輪郭（頭寄りブロック）
      d: "M 395,495 L 414,462 L 415,461 L 417,460 L 419,460 L 559,474 L 561,476 L 560,487 L 559,495 L 558,502 L 557,508 L 555,519 L 532,519 L 516,518 L 504,517 L 483,515 L 460,512 L 442,509 L 431,507 L 426,506 L 413,503 L 409,502 L 397,498 L 395,496 Z",
    },
    label: { x: 352, y: 692, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 482, y: 491 },
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
