"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import type { MenuStockStatus } from "@/lib/domain/constants";
import type { StoreStatus } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildFreshSupabaseAuthHeaders } from "@/lib/supabase/browser";
import { fetchOsakaHonmachiWeatherSafe } from "@/lib/weather";

type AdminMenuStocks = {
  maguro_don: MenuStockStatus;
  maguro_don_mini: MenuStockStatus;
  tokujo_don: MenuStockStatus;
  tokujo_don_mini: MenuStockStatus;
};

function normalizeMenuStocks(menuStocks: Record<string, MenuStockStatus>): AdminMenuStocks {
  return {
    maguro_don: menuStocks.maguro_don ?? "unset",
    maguro_don_mini: menuStocks.maguro_don_mini ?? "unset",
    tokujo_don: menuStocks.tokujo_don ?? "unset",
    tokujo_don_mini: menuStocks.tokujo_don_mini ?? "unset",
  };
}

export function AdminScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [draft, setDraft] = useState<{
    menuStocks: AdminMenuStocks;
    recommendation: string;
    status: StoreStatus["status"];
    statusNote: string;
    weatherComment: string;
  } | null>(null);
  const [weatherPreview, setWeatherPreview] = useState("天気を取得中...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      const weather = await fetchOsakaHonmachiWeatherSafe();
      if (!cancelled) {
        setWeatherPreview(`${weather.icon} ${Math.round(weather.temperature)}℃ ${weather.label}`);
      }
    }

    void loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <ScreenState description="管理画面を読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "管理画面を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  const form = draft ?? {
    menuStocks: normalizeMenuStocks(snapshot.home.menuItemStatuses),
    recommendation: snapshot.home.storeStatus.recommendation,
    status: snapshot.home.storeStatus.status,
    statusNote: snapshot.home.storeStatus.status_note,
    weatherComment: snapshot.home.storeStatus.weather_comment,
  };

  async function handleSave() {
    setSaving(true);

    const response = await fetch("/api/admin/status", {
      method: "POST",
      headers: await buildFreshSupabaseAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        menuStocks: form.menuStocks,
        recommendation: form.recommendation,
        status: form.status,
        statusNote: form.statusNote,
        weatherComment: form.weatherComment,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);

    if (!response.ok) {
      window.alert(payload?.error ?? "更新に失敗しました。");
      return;
    }

    setDraft(null);
    await refresh();
    window.alert("更新しました。");
  }

  return (
    <>
      <NorenBanner label="店舗管理" />
      <Card>
        <div className="helper-text">現在の天気: {weatherPreview}</div>
      </Card>
      <Card>
        <label className="form-label">
          今日のおすすめ
          <textarea
            className="memo-input admin-textarea"
            maxLength={280}
            onChange={(event) => setDraft({ ...form, recommendation: event.target.value })}
            value={form.recommendation}
          />
        </label>
        <label className="form-label">
          営業状況
          <div className="admin-actions">
            {[
              { value: "unset", label: "未設定" },
              { value: "open", label: "営業中" },
              { value: "busy", label: "混雑中" },
              { value: "closing_soon", label: "まもなく終了" },
              { value: "closed", label: "本日終了" },
            ].map((item) => (
              <button
                className="button-choice"
                data-active={form.status === item.value}
                key={item.value}
                onClick={() => setDraft({ ...form, status: item.value as StoreStatus["status"] })}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </label>
        <label className="form-label">
          補足
          <input
            className="memo-input"
            maxLength={120}
            onChange={(event) => setDraft({ ...form, statusNote: event.target.value })}
            type="text"
            value={form.statusNote}
          />
        </label>
        <div className="form-label">
          本日の入荷状況
          <div className="stack-list">
            {snapshot.menuItems.map((item) => (
              <Card className="part-list-card" key={item.id}>
                <div className="menu-name" style={{ marginBottom: 10 }}>
                  {item.name}
                </div>
                <div className="admin-actions">
                  {(() => {
                    const menuItemId = item.id as keyof AdminMenuStocks;
                    return [
                      { value: "unset", label: "未設定" },
                      { value: "available", label: "あり" },
                      { value: "few", label: "残りわずか" },
                      { value: "soldout", label: "終了" },
                    ].map((choice) => (
                      <button
                        className="button-choice"
                        data-active={form.menuStocks[menuItemId] === choice.value}
                        key={choice.value}
                        onClick={() =>
                          setDraft({
                            ...form,
                            menuStocks: {
                              ...form.menuStocks,
                              [menuItemId]: choice.value,
                            },
                          })
                        }
                        type="button"
                      >
                        {choice.label}
                      </button>
                    ));
                  })()}
                </div>
              </Card>
            ))}
          </div>
        </div>
        <label className="form-label">
          天気コメント
          <input
            className="memo-input"
            maxLength={120}
            onChange={(event) => setDraft({ ...form, weatherComment: event.target.value })}
            type="text"
            value={form.weatherComment}
          />
        </label>
        <button className="button-primary" disabled={saving} onClick={handleSave} type="button">
          {saving ? "保存中..." : "保存する"}
        </button>
      </Card>
    </>
  );
}
