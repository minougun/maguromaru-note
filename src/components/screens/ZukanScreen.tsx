"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useUiPreferences } from "@/components/providers/UiPreferencesProvider";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PartDetailProfileBlock } from "@/components/zukan/PartDetailProfile";
import { PartMenuInsightBlock } from "@/components/zukan/PartMenuInsight";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildZukanShare, type SharePayload } from "@/lib/share/share";

const TunaMap = dynamic(
  () => import("@/components/TunaMap").then((m) => ({ default: m.TunaMap })),
  {
    loading: () => (
      <div
        aria-busy="true"
        className="card zukan-map-tuna-loading"
        style={{
          aspectRatio: "1365 / 768",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "100%",
        }}
      >
        <p className="helper-text">部位マップを読み込んでいます…</p>
      </div>
    ),
  },
);

export function ZukanScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const { preferences } = useUiPreferences();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  if (loading) {
    return <ScreenState description="図鑑データを読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "図鑑を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  const collectedPartIds = new Set(snapshot.zukan.collectedPartIds);
  const collectedParts = snapshot.parts.filter((part) => collectedPartIds.has(part.id));
  const missingParts = snapshot.parts.filter((part) => !collectedPartIds.has(part.id));
  const progress = Math.round((snapshot.zukan.collectedCount / Math.max(snapshot.zukan.totalCount, 1)) * 100);

  return (
    <>
      <NorenBanner label="まぐろ図鑑" />
      <Card glow>
        <p className="progress-label">コンプリート進捗</p>
        <div className="progress-big">{progress}%</div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-caption">
          {snapshot.zukan.collectedCount} / {snapshot.zukan.totalCount} 部位
        </p>
        <button className="button-outline" onClick={() => setSharePayload(buildZukanShare(collectedParts, snapshot.zukan.totalCount))} type="button">
          図鑑の進捗をシェア
        </button>
      </Card>
      {snapshot.zukan.isComplete ? (
        <Card>
          <p className="complete-banner">
            全{snapshot.zukan.totalCount}部位コンプリートおめでとうございます🎉シェアして自慢❗️
          </p>
        </Card>
      ) : null}

      <SectionTitle subtitle="Tuna map" title="部位マップ" />
      <TunaMap
        collectedPartIds={snapshot.zukan.collectedPartIds}
        globalPartInsights={snapshot.zukan.globalPartInsights}
        partInsights={snapshot.zukan.partInsights}
        partProfiles={snapshot.zukan.partProfiles}
        parts={snapshot.parts}
      />

      <SectionTitle subtitle="All parts" title="部位一覧" />
      <Card>
        <p className="helper-text">
          {preferences.density === "detail"
            ? "詳細表示では、一覧でも部位メモと出やすいメニューを確認できます。"
            : "一覧はシンプル表示です。詳しい食感や出やすいメニューは、上の部位マップをタップして確認できます。"}
        </p>
      </Card>

      <div className="zukan-list-section">
        <div className="zukan-list-section-head">
          <h3 className="zukan-list-section-title">食べた部位</h3>
          <span className="zukan-list-section-count">{collectedParts.length}部位</span>
        </div>
        <div className="parts-grid">
          {collectedParts.map((part) => (
            <article className="part-list-card collected" key={part.id}>
              <div className="part-list-card-head">
                <div className="part-name">{part.name}</div>
                <span className="badge badge-available">記録済み</span>
              </div>
              <div className="part-list-meta-row">
                <span className="part-list-meta-chip">{part.area}</span>
                <span className="part-list-meta-chip">レア度 {"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}</span>
              </div>
              <div className="plist-desc">{part.description}</div>
              {preferences.density === "detail" ? (
                <>
                  <PartDetailProfileBlock profile={snapshot.zukan.partProfiles[part.id]} />
                  <PartMenuInsightBlock
                    globalInsight={snapshot.zukan.globalPartInsights[part.id]}
                    insight={snapshot.zukan.partInsights[part.id]}
                  />
                </>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      <div className="zukan-list-section">
        <div className="zukan-list-section-head">
          <h3 className="zukan-list-section-title">これから集めたい部位</h3>
          <span className="zukan-list-section-count">{missingParts.length}部位</span>
        </div>
        <div className="parts-grid">
          {missingParts.map((part) => (
            <article className="part-list-card missing" key={part.id}>
              <div className="part-list-card-head">
                <div className="part-name">{part.name}</div>
                <span className="badge badge-unset">未記録</span>
              </div>
              <div className="part-list-meta-row">
                <span className="part-list-meta-chip">{part.area}</span>
                <span className="part-list-meta-chip">レア度 {"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}</span>
              </div>
              <div className="plist-desc">まだ食べていません</div>
            </article>
          ))}
        </div>
      </div>

      <ShareModalDynamic onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
