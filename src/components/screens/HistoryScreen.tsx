"use client";

import { useState } from "react";

import { VisitLogCard } from "@/components/logs/VisitLogCard";
import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import type { VisitRecord } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildPastLogShare, type SharePayload } from "@/lib/share/share";
import { buildFreshSupabaseAuthHeaders } from "@/lib/supabase/browser";
import { formatCount } from "@/lib/utils/format";

export function HistoryScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (loading) {
    return <ScreenState description="履歴を読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "履歴を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  async function handleDelete(log: VisitRecord) {
    const ok = window.confirm(`${log.visitedAt} の記録を削除しますか？`);
    if (!ok) {
      return;
    }

    setDeletingId(log.id);
    const response = await fetch(`/api/visit-logs/${log.id}`, {
      headers: await buildFreshSupabaseAuthHeaders(),
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setDeletingId(null);

    if (!response.ok) {
      window.alert(payload?.error ?? "削除に失敗しました。");
      return;
    }

    await refresh();
  }

  async function handleShareBonus(payload: SharePayload, channel: "x" | "line" | "instagram") {
    if (!payload.bonusTarget) {
      return;
    }

    const response = await fetch("/api/share-bonuses", {
      method: "POST",
      headers: await buildFreshSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        targetType: payload.bonusTarget.targetType,
        targetId: payload.bonusTarget.targetId,
        channel,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { error?: string; alreadyClaimed?: boolean; bonusVisitCount?: number; bonusCorrectAnswers?: number }
      | null;

    if (!response.ok) {
      window.alert(result?.error ?? "シェアボーナスの記録に失敗しました。");
      return;
    }

    if (result?.alreadyClaimed) {
      window.alert("この記録のシェアボーナスは受取済みです。");
      return;
    }

    await refresh();
    if ((result?.bonusVisitCount ?? 0) > 0) {
      window.alert(`来店回数ボーナス +${formatCount(result?.bonusVisitCount ?? 0)}回 を反映しました。`);
    }
  }

  return (
    <>
      <NorenBanner label="食べた履歴" />
      <Card glow>
        <div className="history-summary">
          <div>
            <div className="summary-label">来店回数</div>
            <div className="summary-value">{formatCount(snapshot.history.visitCount)}回</div>
          </div>
          <div>
            <div className="summary-label">正解済みの問題数</div>
            <div className="summary-value">{formatCount(snapshot.history.quizStats.totalCorrectAnswers)}問</div>
          </div>
          <div>
            <div className="summary-label">現在の称号</div>
            <div className="summary-title">
              {snapshot.history.currentTitle ? `${snapshot.history.currentTitle.icon} ${snapshot.history.currentTitle.name}` : "称号なし"}
            </div>
          </div>
        </div>
        <ShareBonusCallout variant="visit" />
      </Card>
      {snapshot.history.logs.length > 0 ? (
        <div className="stack-list">
          {snapshot.history.logs.map((log) => (
            <VisitLogCard
              deleting={deletingId === log.id}
              key={log.id}
              log={log}
              onDelete={handleDelete}
              onShare={(nextLog) => setSharePayload(buildPastLogShare(nextLog))}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="helper-text">まだ履歴がありません。記録を作るとここに残ります。</p>
        </Card>
      )}
      <ShareModalDynamic onClose={() => setSharePayload(null)} onShareBonus={handleShareBonus} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
