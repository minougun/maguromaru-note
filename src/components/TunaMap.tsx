"use client";

import { useId, useState } from "react";

import tunaMapBase from "@/assets/zukan-tuna-map.webp";
import tunaMapReveal from "@/assets/zukan-tuna-map-reveal.webp";

import { mapDisplayColorForPart } from "@/lib/domain/part-brand-colors";
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
        // 上: y 減で拡張 / 下: y 増で拡張（akami 上縁より上に抑える）。3 サブパスで 560,212 を共有
        "M 373,232 L 388,229 L 434,221 L 462,218 L 491,215 L 536,212 L 550,212 L 553,218 L 556,229 L 559,246 L 560,263 L 560,266 L 558,288 L 405,310 L 403,312 L 395,300 L 374,258 Z " +
        "M 560,212 L 761,207 L 766,207 L 792,213 L 797,221 L 797,223 L 770,306 L 768,308 L 589,292 L 568,288 L 566,284 L 561,246 L 560,228 Z " +
        // 尾側は手描きで x≈1087 まで伸ばしていたため魚体・地色にはみ出しやすい。reveal 上の flood（930,298 付近）に合わせた閉曲線
        "M 909,280 L 928,304 L 950,308 L 927,312 L 934,341 L 990,356 L 975,304 Z",
    },
    label: { x: 668, y: 82, text: "中トロ（背）" },
    labelWidth: 200,
    lineTo: { x: 658, y: 258 },
  },
  {
    key: "akami",
    partIds: ["akami"],
    shape: {
      type: "path",
      // 尾びれ付近の細長い塗りはクリップ対象外（部位ラベル・記録対象としない）
      d: "M 499,327 L 523,303 L 557,299 L 561,299 L 607,300 L 662,302 L 686,304 L 732,309 L 816,321 L 834,325 L 843,328 L 894,394 L 891,403 L 828,446 L 792,468 L 558,452 L 529,422 Z",
    },
    label: { x: 1040, y: 336 },
    lineTo: { x: 738, y: 382 },
  },
  // 腹の中トロ polygon が大トロと重なるため、先に中トロを描いてから大トロを上に載せる（さもなくば reveal が大トロを潰す）
  {
    key: "belly-chutoro",
    partIds: ["chutoro"],
    shape: {
      type: "path",
      // 下端は reveal の薄ピンクが続く範囲まで延ばし（尾側大トロブロックの上縁付近まで）。銀帯手前ギリギリまで拡大
      d: "M 746,552 L 772,448 L 916,434 L 1005,407 L 992,460 L 875,536 L 752,554 Z",
    },
    label: { x: 1008, y: 608, text: "中トロ（腹）" },
    labelWidth: 210,
    lineTo: { x: 886, y: 478 },
  },
  {
    key: "belly-otoro-rear",
    partIds: ["otoro"],
    shape: {
      type: "path",
      // 尾側・頭側の境界は同じ座標で接続。上縁は直線の継ぎ目を C で滑らかに（選択時の黒線のV字解消）
      d: "M 560,557 L 562,472 L 568,474 C 648,458 724,448 794,456 L 800,456 L 801,457 L 801,459 L 800,470 L 796,482 L 788,496 L 775,510 L 755,524 L 732,536 L 704,546 L 672,552 L 640,555 L 608,557 L 572,557 Z",
    },
    label: { x: 808, y: 628, text: "大トロ" },
    labelWidth: 132,
    lineTo: { x: 696, y: 486 },
  },
  {
    key: "belly-otoro-front",
    partIds: ["otoro"],
    shape: {
      type: "path",
      // 562,472 は belly-otoro-rear と共有。419→562 の長辺を C で腹の弧に近づける
      d: "M 395,543 L 414,462 L 415,461 L 417,460 L 419,460 C 488,448 528,458 562,472 L 558,498 L 548,520 L 532,540 L 510,552 L 485,556 L 455,556 L 428,552 L 405,548 Z",
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
            const primary = regionPrimaryPart(r, partsById, collected);
            const tint = primary ? mapDisplayColorForPart(primary) : null;
            const tintOpacity =
              primary?.id === "otoro" || primary?.id === "chutoro" ? "0.56" : "0.48";
            return (
              <g key={`reveal-${r.key}`} clipPath={`url(#${clipId(r.key)})`}>
                <image href={tunaMapReveal.src} width="1365" height="768" preserveAspectRatio="xMidYMid meet" />
                {tint != null ? (
                  <rect width="1365" height="768" fill={tint} opacity={tintOpacity} />
                ) : null}
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
            const displayColor = mapDisplayColorForPart(primary);

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
                {isSelected ? selectionOutlineEl(r.shape, displayColor) : null}
                <rect
                  x={r.label.x - lw}
                  y={r.label.y - 26}
                  rx="22"
                  ry="22"
                  width={lw * 2}
                  height="52"
                  fill={eaten ? displayColor : "rgba(55,38,32,0.92)"}
                  stroke={eaten ? displayColor : "rgba(196,168,120,0.45)"}
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
                <span className="map-detail-name" style={{ color: isCollected ? mapDisplayColorForPart(part) : "var(--cream)" }}>
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
                    <span className="map-detail-name" style={{ color: isCollected ? mapDisplayColorForPart(part) : "var(--cream)" }}>
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
