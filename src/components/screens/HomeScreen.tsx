"use client";

import { useEffect, useState } from "react";

import { VisitLogCard } from "@/components/logs/VisitLogCard";
import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { menuStockLabels, type MenuStockStatus } from "@/lib/domain/constants";
import type { VisitRecord } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildPastLogShare, type SharePayload } from "@/lib/share/share";
import { fetchOsakaHonmachiWeatherSafe } from "@/lib/weather";

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

function menuItemStock(status: "open" | "busy" | "closing_soon" | "closed"): MenuStockStatus {
  if (status === "closed") return "soldout";
  return "available";
}

export function HomeScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [weatherText, setWeatherText] = useState("天気を取得中...");

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      const weather = await fetchOsakaHonmachiWeatherSafe();
      if (cancelled) {
        return;
      }
      setWeatherText(`${weather.icon} ${Math.round(weather.temperature)}℃ ${weather.label}`);
    }

    void loadWeather();
    return () => {
      cancelled = true;
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

  const status = storeStatusMeta(snapshot.home.storeStatus.status);
  const updatedAt = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(snapshot.home.storeStatus.updated_at));

  function openShare(log: VisitRecord) {
    setSharePayload(buildPastLogShare(log));
  }

  return (
    <>
      <NorenBanner label="本日の入荷状況" />
      <Card>
        {snapshot.menuItems.map((item) => {
          const stock = menuItemStock(snapshot.home.storeStatus.status);
          const stockMeta = menuStockLabels[stock];
          const isSoldout = stock === "soldout";
          return (
            <div className={`menu-row ${isSoldout ? "soldout-row" : ""}`} key={item.id}>
              <div className="menu-name">{item.name}</div>
              <span className={stockMeta.className}>{stockMeta.text}</span>
            </div>
          );
        })}
        <div className="menu-meta">更新 {updatedAt}</div>
      </Card>

      <div className="weather-bar">
        <span>{weatherText}</span>
        <span>{snapshot.home.storeStatus.weather_comment || "本町で営業中"}</span>
      </div>

      <SectionTitle subtitle="Store status" title="営業状況" />
      <Card>
        <div className="status-row">
          <span className={status.className}>{status.label}</span>
          <span className="helper-text">更新 {updatedAt}</span>
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

      <SectionTitle subtitle="Recent logs" title="最近の記録" />
      {snapshot.home.recentLogs.length > 0 ? (
        <div className="stack-list">
          {snapshot.home.recentLogs.map((log) => (
            <VisitLogCard key={log.id} log={log} onShare={openShare} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="helper-text">まだ記録がありません。今日の丼を記録するとここに並びます。</p>
        </Card>
      )}
      <ShareModal onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
