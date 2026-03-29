"use client";

import { useState } from "react";

import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { TunaMapDynamic } from "@/components/TunaMapDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildZukanShare, type SharePayload } from "@/lib/share/share";

export function ZukanScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
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

  const collectedParts = snapshot.parts.filter((part) => snapshot.zukan.collectedPartIds.includes(part.id));
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
          <p className="complete-banner">全{snapshot.zukan.totalCount}部位コンプリートです。次は履歴をシェアして自慢しましょう。</p>
        </Card>
      ) : null}

      <SectionTitle subtitle="Tuna map" title="部位マップ" />
      <TunaMapDynamic collectedPartIds={snapshot.zukan.collectedPartIds} parts={snapshot.parts} />

      <SectionTitle subtitle="All parts" title="部位一覧" />
      <div className="parts-grid">
        {snapshot.parts.map((part) => {
          const collected = snapshot.zukan.collectedPartIds.includes(part.id);
          return (
            <article className={`part-list-card ${collected ? "collected" : "missing"}`} key={part.id}>
              <div className="part-name">{collected ? part.name : `？ ${part.name}`}</div>
              <div className="part-area">
                {part.area} / {"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}
              </div>
              <div className="plist-desc">{collected ? part.description : "まだ食べていません"}</div>
            </article>
          );
        })}
      </div>

      <ShareModalDynamic onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
