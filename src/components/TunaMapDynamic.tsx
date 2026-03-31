"use client";

import dynamic from "next/dynamic";
import type { TunaMapProps } from "./TunaMap";

// Lazy-load the heavy map on client only when needed to reduce initial bundle.
const TunaMapLazy = dynamic(() => import("./TunaMap").then((m) => m.TunaMap), { ssr: false });
export function TunaMapDynamic(props: TunaMapProps) {
  return <TunaMapLazy {...props} />;
}
