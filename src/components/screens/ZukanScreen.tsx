"use client";

import { useState } from "react";

import { ShareModal } from "@/components/share/ShareModal";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildZukanShare, type SharePayload } from "@/lib/share/share";
import { PartsList } from "@/components/zukan/PartsList";
import { ProgressCard } from "@/components/zukan/ProgressCard";
import { TunaMap } from "@/components/zukan/TunaMap";

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

  return (
    <>
      <NorenBanner label="まぐろ図鑑" />
      <ProgressCard
        onShare={() => setSharePayload(buildZukanShare(collectedParts, snapshot.zukan.totalCount))}
        summary={snapshot.zukan}
      />
      <SectionTitle subtitle="Tuna map" title="部位マップ" />
      <TunaMap collectedPartIds={snapshot.zukan.collectedPartIds} parts={snapshot.parts} />
      <SectionTitle subtitle="All parts" title="部位一覧" />
      <PartsList collectedPartIds={snapshot.zukan.collectedPartIds} parts={snapshot.parts} />
      <ShareModal onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
