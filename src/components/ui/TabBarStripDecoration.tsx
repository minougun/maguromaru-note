"use client";

import clsx from "clsx";

import { MAIN_NAV_TABS } from "@/lib/main-tabs";

type TabBarStripDecorationProps = {
  /** オンボーディング用モックは幅が狭いため文字を一段小さくする */
  compact?: boolean;
};

/**
 * タブ帯の見た目（ラベル・区切り・背景）。SVG では環境によって text が描画されないため DOM で描画する。
 */
export function TabBarStripDecoration({ compact = false }: TabBarStripDecorationProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx("main-tab-strip-decor", compact && "main-tab-strip-decor--compact")}
    >
      {MAIN_NAV_TABS.map((tab) => (
        <div className="main-tab-strip-decor-cell" key={tab.href}>
          <span className="main-tab-strip-decor-label">{tab.stripLabel}</span>
        </div>
      ))}
    </div>
  );
}
