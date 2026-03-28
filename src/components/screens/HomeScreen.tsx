"use client";

import { useState } from "react";

import { MenuStatusCard } from "@/components/home/MenuStatusCard";
import { RecentLogs } from "@/components/home/RecentLogs";
import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildPastLogShare, type SharePayload } from "@/lib/share/share";
import type { VisitRecord } from "@/lib/domain/types";

export function HomeScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  if (loading) {
    return <ScreenState description="記録と入荷状況を読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "データを取得できませんでした。"}
        title="表示に失敗しました"
      />
    );
  }

  function openShare(log: VisitRecord) {
    setSharePayload(buildPastLogShare(log));
  }

  return (
    <>
      <NorenBanner label="本日の入荷状況" />
      <div className="muted-banner">
        {snapshot.home.menuStatus.length > 0
          ? "在庫状況は realtime で同期されます。Supabase 未接続時は mock store を表示します。"
          : "在庫情報はまだありません。"}
      </div>
      <MenuStatusCard home={snapshot.home} />
      <SectionTitle subtitle="Recent logs" title="最近の記録" />
      {snapshot.home.recentLogs.length > 0 ? (
        <RecentLogs logs={snapshot.home.recentLogs} onShare={openShare} />
      ) : (
        <Card>
          <p className="helper-text">まだ記録がありません。今日の丼を記録するとここに並びます。</p>
        </Card>
      )}
      <ShareModal onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
