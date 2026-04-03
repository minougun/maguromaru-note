"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { VisitLogCardDynamic } from "@/components/logs/VisitLogCardDynamic";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { clearAuthCallbackQueryParams } from "@/lib/auth-callback-ui";
import { menuStockLabels, type MenuStockStatus } from "@/lib/domain/constants";
import type { VisitRecord } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildCasualMissions, buildMyPageSummary, buildNextTitleProgress } from "@/lib/mypage";
import { buildPastLogShare, type SharePayload } from "@/lib/share/share";
import { formatCount } from "@/lib/utils/format";

const homeTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tokyo",
});
const yenFormatter = new Intl.NumberFormat("ja-JP");

function storeStatusMeta(status: "open" | "busy" | "closing_soon" | "closed") {
  switch (status) {
    case "open":
      return { label: "営業中", className: "badge badge-open" };
    case "busy":
      return { label: "混雑中", className: "badge badge-busy" };
    case "closing_soon":
      return { label: "まもなく終了", className: "badge badge-closing" };
    case "closed":
      return { label: "本日終了", className: "badge badge-closed" };
  }
}

function menuItemStock(
  itemId: string,
  status: "open" | "busy" | "closing_soon" | "closed" | "unset",
  menuItemStatuses: Record<string, MenuStockStatus>,
): MenuStockStatus {
  const row = menuItemStatuses[itemId];
  if (row === "unset") return "unset";
  if (status === "closed") return "soldout";
  if (row == null) return "available";
  return row;
}

export function HomeScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "linked" || auth === "error") {
      clearAuthCallbackQueryParams();
    }
  }, []);

  const openShare = useCallback((log: VisitRecord) => {
    setSharePayload(buildPastLogShare(log));
  }, []);

  if (loading) {
    return <ScreenState description="ホーム情報を読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "ホーム画面を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  const storeStatus = snapshot.home.storeStatus.status;
  const statusBadge = storeStatus === "unset" ? null : storeStatusMeta(storeStatus);
  const formatHm = (iso: string) => homeTimeFormatter.format(new Date(iso));
  const showStoreLastUpdated = snapshot.home.showStaffUpdateTimestamps && storeStatus !== "unset";
  const sideData = snapshot.home.sideData;
  const weatherText = `${sideData.weather.icon} ${Math.round(sideData.weather.temperature)}℃ ${sideData.weather.label}`;
  const myPageSummary = buildMyPageSummary(snapshot);
  const nextTitleProgress = buildNextTitleProgress(myPageSummary);
  const casualMissions = buildCasualMissions(snapshot);
  const casualMissionCompletedCount = casualMissions.filter((mission) => mission.completed).length;
  const titleSummary = myPageSummary.currentTitle
    ? `${myPageSummary.currentTitle.icon} ${myPageSummary.currentTitle.name}`
    : "称号なし";
  const progressBits = [
    nextTitleProgress?.remainingVisits ? `来店あと${formatCount(nextTitleProgress.remainingVisits)}回` : null,
    nextTitleProgress?.remainingCollectedParts ? `${nextTitleProgress.remainingCollectedParts}部位` : null,
    nextTitleProgress?.remainingQuizCorrect ? `${nextTitleProgress.remainingQuizCorrect}問正解` : null,
  ].filter(Boolean);

  return (
    <>
      <SectionTitle subtitle="Store status" title="営業状況" />
      <Card>
        <div className="weather-bar weather-bar-merged">
          <span className="weather-bar-primary">{weatherText}</span>
          {snapshot.home.storeStatus.weather_comment ? (
            <span className="weather-bar-secondary">{snapshot.home.storeStatus.weather_comment}</span>
          ) : (
            <span className="weather-bar-secondary status-summary">
              {statusBadge ? <span className={statusBadge.className}>{statusBadge.label}</span> : null}
              {showStoreLastUpdated ? (
                <span className="status-updated-text">最終更新時間 {formatHm(snapshot.home.storeStatus.updated_at)}</span>
              ) : null}
            </span>
          )}
        </div>
        {snapshot.home.storeStatus.status_note ? (
          <p className="status-note">{snapshot.home.storeStatus.status_note}</p>
        ) : (
          <p className="helper-text">混雑状況や売り切れ情報はここに表示されます。</p>
        )}
      </Card>

      {snapshot.home.storeStatus.recommendation ? (
        <>
          <SectionTitle subtitle="Recommendation" title="本日のおすすめ" />
          <Card glow>
            <p className="recommendation-copy">{snapshot.home.storeStatus.recommendation}</p>
          </Card>
        </>
      ) : null}

      <Card aria-label="まぐろ丸Botの日替わり豆知識" className="ai-store-blurb-card">
        <p className="ai-store-blurb-label">まぐろ丸Bot 今日の豆知識</p>
        <p className="ai-store-blurb-body">{sideData.trivia.trivia}</p>
        <p className="ai-store-blurb-meta">日替わり豆知識 · {sideData.trivia.date}</p>
      </Card>

      <SectionTitle subtitle="Easy goals" title="ミッション" />
      <Card className="casual-mission-card">
        <div className="casual-mission-card-head">
          <p className="casual-mission-card-title">ミッション</p>
          <span className="casual-mission-card-count">
            {casualMissionCompletedCount} / {casualMissions.length} 達成
          </span>
        </div>
        <div className="casual-mission-list">
          {casualMissions.map((mission) => (
            <div className={`casual-mission-item ${mission.completed ? "completed" : ""}`} key={mission.id}>
              <div>
                <div className="casual-mission-label">{mission.label}</div>
                <div className="casual-mission-progress">{mission.progressLabel}</div>
              </div>
              <span className={`badge ${mission.completed ? "badge-available" : "badge-unset"}`}>
                {mission.completed ? "達成" : "進行中"}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <NorenBanner label="本日の入荷状況" />
      <Card className="stock-card">
        <div className="stock-card-head">
          <div className="stock-store-mark" aria-hidden="true">
            丼
          </div>
          {snapshot.home.showStaffUpdateTimestamps && snapshot.home.menuStockUpdatedAt ? (
            <div className="stock-updated-chip">最終更新時間 {formatHm(snapshot.home.menuStockUpdatedAt)}</div>
          ) : null}
        </div>

        {snapshot.menuItems.map((item) => {
          const stock = menuItemStock(item.id, snapshot.home.storeStatus.status, snapshot.home.menuItemStatuses);
          const stockMeta = menuStockLabels[stock];
          const isSoldout = stock === "soldout";
          return (
            <div className={`stock-item ${isSoldout ? "soldout-row" : ""}`} key={item.id}>
              <div>
                <div className="stock-item-name">{item.name}</div>
                <div className="stock-item-price">¥{yenFormatter.format(item.price)}</div>
              </div>
              <span className={stockMeta.className}>{stockMeta.text}</span>
            </div>
          );
        })}
        <p className="stock-footnote">※ 店舗スタッフが更新しています</p>
      </Card>

      <SectionTitle subtitle="Recent logs" title="最近の記録" />
      {snapshot.home.recentLogs.length > 0 ? (
        <div className="stack-list">
          {snapshot.home.recentLogs.map((log) => (
            <VisitLogCardDynamic key={log.id} log={log} onShare={openShare} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="helper-text">まだ記録がありません。今日の丼を記録するとここに並びます。</p>
        </Card>
      )}

      <SectionTitle subtitle="Member perks" title="常連メリット" />
      <Card className="loyalty-card" glow>
        <div className="loyalty-card-head">
          <div>
            <p className="loyalty-card-label">今のあなた</p>
            <p className="loyalty-card-title">{titleSummary}</p>
          </div>
          <div className="loyalty-card-chip">来店 {formatCount(myPageSummary.visitCount)}回</div>
        </div>
        <p className="loyalty-card-copy">
          記録はメニューを選ぶだけでもOK。SNSにシェアすると、その記録の来店回数が <strong>1.2倍</strong> で集計されます。
        </p>
        <div className="loyalty-card-progress">
          {nextTitleProgress ? (
            <>
              <p className="loyalty-card-progress-label">
                次の称号: {nextTitleProgress.title.icon} {nextTitleProgress.title.name}
              </p>
              <p className="loyalty-card-progress-body">{progressBits.join(" / ")} で到達</p>
            </>
          ) : (
            <>
              <p className="loyalty-card-progress-label">称号コンプリート達成中</p>
              <p className="loyalty-card-progress-body">あとは記録と図鑑を育てて、自分の好みを深掘りできます。</p>
            </>
          )}
        </div>
        <div className="loyalty-card-actions">
          <Link className="button-primary loyalty-card-link" href="/record">
            かんたん記録へ
          </Link>
          <Link className="button-outline loyalty-card-link" href="/titles">
            称号を見る
          </Link>
        </div>
      </Card>

      <ShareModalDynamic onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
