"use client";

import { tunaMapDefinition } from "@/lib/zukan-map";
import type { Part, PartId } from "@/lib/domain/types";

export function TunaMap({
  parts,
  collectedPartIds,
}: {
  parts: Part[];
  collectedPartIds: PartId[];
}) {
  const collectedSet = new Set(collectedPartIds);

  function showPartAlert(part: Part, eaten: boolean) {
    const rarity = "★".repeat(part.rarity) + "☆".repeat(3 - part.rarity);
    window.alert(`${part.name}（${part.area}）\nレア度: ${rarity}\n\n${part.description}\n\n${eaten ? "✓ 記録済み" : "？ まだ食べていません"}`);
  }

  return (
    <div className="map-wrap">
      <svg aria-label="まぐろ部位マップ" role="img" viewBox="0 0 603 370" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#1a0e08" />
            <stop offset="100%" stopColor="#0d0805" />
          </linearGradient>
          <filter height="180%" id="glowF" width="180%" x="-40%" y="-40%">
            <feGaussianBlur result="b" stdDeviation="4" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect fill="url(#bgGrad)" height="370" width="603" />
        <image height="370" href="/tuna-placeholder.svg" opacity="0.86" preserveAspectRatio="xMidYMid slice" width="603" />
        <g fill="none" opacity="0.7" stroke="var(--cream-faint)" strokeWidth="1.2">
          {Object.entries(tunaMapDefinition).map(([id, def]) => (
            <line key={`line-${id}`} x1={def.lx} x2={def.cx} y1={def.ly + 8} y2={def.cy} />
          ))}
        </g>
        {parts.map((part) => {
          const def = tunaMapDefinition[part.id as keyof typeof tunaMapDefinition];
          const eaten = collectedSet.has(part.id);
          const labelBackground = eaten ? part.color : "#666";
          const labelText = eaten ? "#0d0805" : "#ccc";
          const sharedProps = {
            fill: eaten ? part.color : "transparent",
            fillOpacity: eaten ? 0.45 : 0,
            stroke: eaten ? part.color : "#888",
            strokeDasharray: eaten ? undefined : "4 4",
            strokeWidth: 2,
            filter: eaten ? "url(#glowF)" : undefined,
            onClick: () => showPartAlert(part, eaten),
            style: { cursor: "pointer" },
          };

          return (
            <g key={part.id}>
              {def.type === "circle" ? (
                <circle {...sharedProps} cx={def.cx} cy={def.cy} r={def.r} />
              ) : (
                <ellipse {...sharedProps} cx={def.cx} cy={def.cy} rx={def.rx} ry={def.ry} />
              )}
              <rect
                fill={labelBackground}
                fillOpacity={eaten ? 0.95 : 0.5}
                height="22"
                rx="10"
                ry="10"
                stroke={eaten ? part.color : "#888"}
                width="76"
                x={def.lx - 38}
                y={def.ly - 14}
              />
              <text
                fill={labelText}
                fontFamily='"Noto Sans JP", sans-serif'
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                x={def.lx}
                y={def.ly + 2}
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
