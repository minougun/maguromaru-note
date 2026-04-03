"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { VisitLogCardDynamic } from "@/components/logs/VisitLogCardDynamic";
import { useAuthState } from "@/components/providers/AuthProvider";
import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import type { HistoryVisitLogsResponse, VisitRecord } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { FetchJsonError, fetchJsonWithAuth } from "@/lib/http/fetch-json";
import { withAppBasePath } from "@/lib/public-path";
import { buildPastLogShare, type SharePayload } from "@/lib/share/share";
import { formatCount } from "@/lib/utils/format";

const HISTORY_DELETE_REFRESH_SCOPES = ["history", "home", "zukan", "mypage", "quiz"] as const;
const HISTORY_SHARE_REFRESH_SCOPES = ["history", "mypage", "quiz"] as const;

export function HistoryScreen() {
  const auth = useAuthState();
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extraLogs, setExtraLogs] = useState<VisitRecord[]>([]);
  const [nextHistoryPage, setNextHistoryPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const pageMeta = snapshot?.history.visitLogsPage;
  const baseLogs = useMemo(() => snapshot?.history.logs ?? [], [snapshot]);
  const displayedLogs = useMemo(() => [...baseLogs, ...extraLogs], [baseLogs, extraLogs]);
  const totalPages = pageMeta ? Math.max(1, Math.ceil(pageMeta.totalCount / pageMeta.pageSize)) : 1;
  const hasMoreHistory = pageMeta != null && nextHistoryPage <= totalPages;

  useEffect(() => {
    if (pageMeta?.page === 1) {
      setExtraLogs([]);
      setNextHistoryPage(2);
      setLoadMoreError(null);
    }
  }, [pageMeta?.page, pageMeta?.totalCount, snapshot?.viewer.userId]);

  const loadMoreHistory = useCallback(async () => {
    if (!pageMeta || !hasMoreHistory || loadingMore || !auth.ready) {
      return;
    }

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextHistoryPage));
      params.set("page_size", String(pageMeta.pageSize));
      const url = `${withAppBasePath("/api/history-logs")}?${params.toString()}`;
      const data = await fetchJsonWithAuth<HistoryVisitLogsResponse>(
        url,
        { method: "GET", cache: "no-store" },
        { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
      );
      setExtraLogs((prev) => {
        const ids = new Set([...baseLogs, ...prev].map((entry) => entry.id));
        const merged = [...prev];
        for (const log of data.logs) {
          if (!ids.has(log.id)) {
            merged.push(log);
          }
        }
        return merged;
      });
      setNextHistoryPage(data.page.page + 1);
    } catch (err) {
      setLoadMoreError(err instanceof FetchJsonError ? err.message : "追加の履歴を読み込めませんでした。");
    } finally {
      setLoadingMore(false);
    }
  }, [auth.accessToken, auth.ready, auth.usingSupabase, baseLogs, hasMoreHistory, loadingMore, nextHistoryPage, pageMeta]);

  const openShare = useCallback((nextLog: VisitRecord) => {
    setSharePayload(buildPastLogShare(nextLog));
  }, []);

  const handleDelete = useCallback(
    async (log: VisitRecord) => {
      const ok = window.confirm(`${log.visitedAt} の記録を削除しますか？`);
      if (!ok) {
        return;
      }

      setDeletingId(log.id);
      try {
        await fetchJsonWithAuth<{ ok?: true }>(
          withAppBasePath(`/api/visit-logs/${log.id}`),
          { method: "DELETE", cache: "no-store" },
          { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
        );
      } catch (err) {
        window.alert(err instanceof FetchJsonError ? err.message : "削除に失敗しました。");
        setDeletingId(null);
        return;
      }
      setDeletingId(null);

      await refresh(HISTORY_DELETE_REFRESH_SCOPES);
    },
    [auth.accessToken, auth.usingSupabase, refresh],
  );

  const handleShareBonus = useCallback(
    async (payload: SharePayload, channel: "x" | "line" | "instagram") => {
      if (!payload.bonusTarget) {
        return;
      }

      let result: {
        error?: string;
        alreadyClaimed?: boolean;
        bonusVisitCount?: number;
        bonusCorrectAnswers?: number;
      };
      try {
        result = await fetchJsonWithAuth(
          withAppBasePath("/api/share-bonuses"),
          {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetType: payload.bonusTarget.targetType,
              targetId: payload.bonusTarget.targetId,
              channel,
            }),
          },
          { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
        );
      } catch (err) {
        window.alert(err instanceof FetchJsonError ? err.message : "シェアボーナスの記録に失敗しました。");
        return;
      }

      if (result?.alreadyClaimed) {
        window.alert("この記録のシェアボーナスは受取済みです。");
        return;
      }

      await refresh(HISTORY_SHARE_REFRESH_SCOPES);
      if ((result?.bonusVisitCount ?? 0) > 0) {
        window.alert(`来店回数ボーナス +${formatCount(result?.bonusVisitCount ?? 0)}回 を反映しました。`);
      }
    },
    [auth.accessToken, auth.usingSupabase, refresh],
  );

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
      {displayedLogs.length > 0 ? (
        <>
          <div className="stack-list">
            {displayedLogs.map((log) => (
              <VisitLogCardDynamic
                deleting={deletingId === log.id}
                key={log.id}
                log={log}
                onDelete={handleDelete}
                onShare={openShare}
              />
            ))}
          </div>
          {loadMoreError ? <p className="helper-text">{loadMoreError}</p> : null}
          {hasMoreHistory ? (
            <div className="history-load-more">
              <button
                className="button-outline"
                disabled={loadingMore}
                onClick={() => void loadMoreHistory()}
                type="button"
              >
                {loadingMore ? "読み込み中…" : "さらに読む"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <Card>
          <p className="helper-text">まだ履歴がありません。記録を作るとここに残ります。</p>
        </Card>
      )}
      <ShareModalDynamic onClose={() => setSharePayload(null)} onShareBonus={handleShareBonus} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
