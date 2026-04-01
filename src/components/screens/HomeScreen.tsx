"use client";

import { useEffect, useState } from "react";

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
import { buildPastLogShare, type SharePayload } from "@/lib/share/share";
import { fetchOsakaHonmachiWeatherSafe } from "@/lib/weather";

interface DailyTrivia {
  success: boolean;
  trivia: string;
  date: string;
}

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
  const [weatherText, setWeatherText] = useState("天気を取得中...");
  const [dailyTrivia, setDailyTrivia] = useState<DailyTrivia | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "linked" || auth === "error") {
      clearAuthCallbackQueryParams();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      const weather = await fetchOsakaHonmachiWeatherSafe();
      if (cancelled) {
        return;
      }
      setWeatherText(`${weather.icon} ${Math.round(weather.temperature)}℃ ${weather.label}`);
    }

    /** スナップショット取得と帯域を奪い合わないよう、描画後のアイドル時に開始 */
    const start = () => {
      if (!cancelled) void loadWeather();
    };

    let idleCallbackId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (typeof requestIdleCallback !== "undefined") {
      idleCallbackId = requestIdleCallback(start, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(start, 1);
    }

    return () => {
      cancelled = true;
      if (idleCallbackId !== undefined && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
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
  const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  });
  const formatHm = (iso: string) => timeFormatter.format(new Date(iso));
  const showStoreLastUpdated =
    snapshot.home.showStaffUpdateTimestamps && storeStatus !== "unset";
  const yen = new Intl.NumberFormat("ja-JP");

  function openShare(log: VisitRecord) {
    setSharePayload(buildPastLogShare(log));
  }

  return (
    <>
      <SectionTitle subtitle="Store status" title="営業状況" />
      <Card>
        <div className="weather-bar weather-bar-merged">
          <span>{weatherText}</span>
          {snapshot.home.storeStatus.weather_comment ? (
            <span>{snapshot.home.storeStatus.weather_comment}</span>
          ) : (
            <span className="status-summary">
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

      <NorenBanner label="本日の入荷状況" />
      <Card
        aria-label={
          snapshot.home.aiStoreBlurb
            ? "まぐろ丸Botのコメント"
            : "まぐろ丸Bot。更新があるとここにコメントが表示されます。"
        }
        className={
          snapshot.home.aiStoreBlurb
            ? "ai-store-blurb-card"
            : "ai-store-blurb-card ai-store-blurb-card--placeholder"
        }
      >
        <p className="ai-store-blurb-label">まぐろ丸Bot（自動生成・AI）</p>
        {snapshot.home.aiStoreBlurb ? (
          <>
            <p className="ai-store-blurb-body">{snapshot.home.aiStoreBlurb.body}</p>
            <p className="ai-store-blurb-meta">
              {snapshot.home.aiStoreBlurb.kind === "closing_summary" ? "本日のまとめ" : "入荷の様子"}
              {" · "}
              {formatHm(snapshot.home.aiStoreBlurb.createdAt)}
            </p>
          </>
        ) : (
          <>
            <p className="ai-store-blurb-placeholder-lead">
              入荷や営業の更新があると、Bot がここに短いコメントを表示します。
            </p>
            <p className="ai-store-blurb-placeholder-sub">次の更新をお楽しみに。まだ表示はありません。</p>
          </>
        )}
      </Card>
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
                <div className="stock-item-price">¥{yen.format(item.price)}</div>
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

      <ShareModalDynamic onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
