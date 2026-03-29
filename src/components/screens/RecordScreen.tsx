"use client";

import Image from "next/image";
import { useState } from "react";

import { useAuthState } from "@/components/providers/AuthProvider";
import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { ShareModalDynamic } from "@/components/share/ShareModalDynamic";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getDefaultPartIdsForMenuItem } from "@/lib/domain/menu-part-defaults";
import type { MenuItemId, PartId, VisitRecord } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { FetchJsonError, fetchJsonWithAuth } from "@/lib/http/fetch-json";
import { withAppBasePath } from "@/lib/public-path";
import { buildRecordShare, type SharePayload } from "@/lib/share/share";
import { formatCount } from "@/lib/utils/format";
import { resizeImageToDataUrl } from "@/lib/utils/image";

function todayString() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function RecordScreen() {
  const auth = useAuthState();
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<MenuItemId | null>(null);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<PartId>>(new Set());
  const [memo, setMemo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  if (loading) {
    return <ScreenState description="記録画面を準備しています。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "記録画面を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  const selectedMenuItem = selectedMenuItemId
    ? snapshot.menuItems.find((item) => item.id === selectedMenuItemId) ?? null
    : null;
  const availablePartIds = new Set(snapshot.parts.map((part) => part.id));

  function togglePart(partId: PartId) {
    const next = new Set(selectedPartIds);
    if (next.has(partId)) {
      next.delete(partId);
    } else {
      next.add(partId);
    }
    setSelectedPartIds(next);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await resizeImageToDataUrl(file);
    setPreviewUrl(dataUrl);
    setPhotoDataUrl(dataUrl);
  }

  function handleMenuSelection(menuItemId: MenuItemId) {
    setSelectedMenuItemId(menuItemId);
    setSelectedPartIds(new Set(getDefaultPartIdsForMenuItem(menuItemId).filter((partId) => availablePartIds.has(partId))));
  }

  async function handleSubmit() {
    if (!selectedMenuItemId) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let payload: { error?: string; record?: VisitRecord };
    try {
      payload = await fetchJsonWithAuth(
        withAppBasePath("/api/visit-logs"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitedAt: todayString(),
            menuItemId: selectedMenuItemId,
            partIds: [...selectedPartIds],
            memo,
            photoDataUrl,
          }),
        },
        { usingSupabase: auth.usingSupabase, accessToken: auth.accessToken },
      );
    } catch (err) {
      setSubmitError(err instanceof FetchJsonError ? err.message : "記録に失敗しました。");
      setSubmitting(false);
      return;
    }

    setSelectedMenuItemId(null);
    setSelectedPartIds(new Set());
    setMemo("");
    setPreviewUrl(null);
    setPhotoDataUrl(null);
    setSubmitting(false);
    await refresh();
    if (payload?.record) {
      setSharePayload(buildRecordShare(payload.record));
    }
  }

  async function handleShareBonus(payload: SharePayload, channel: "x" | "line" | "instagram") {
    if (!payload.bonusTarget) {
      return;
    }

    let result: { error?: string; alreadyClaimed?: boolean; bonusVisitCount?: number };
    try {
      result = await fetchJsonWithAuth(
        withAppBasePath("/api/share-bonuses"),
        {
          method: "POST",
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

    await refresh();
    window.alert(`来店回数ボーナス +${formatCount(result?.bonusVisitCount ?? 0)}回 を反映しました。`);
  }

  return (
    <>
      <NorenBanner label="今日の丼を記録" />
      <ShareBonusCallout variant="visit" />
      <label className={`photo-zone ${previewUrl ? "has-img" : ""}`} htmlFor="don-photo">
        <input accept="image/*" capture="environment" hidden id="don-photo" onChange={handleFileChange} type="file" />
        {previewUrl ? (
          <Image alt="丼のプレビュー" height={220} src={previewUrl} unoptimized width={380} />
        ) : (
          <span className="photo-hint">
            タップでカメラ / ギャラリー
            <br />
            <small>長辺1200px、JPEG品質80%に縮小して送信</small>
          </span>
        )}
      </label>

      <SectionTitle subtitle="Menu" title="食べたメニュー" />
      <div className="menu-choice-grid">
        {snapshot.menuItems.map((item) => {
          const active = selectedMenuItemId === item.id;
          return (
            <button
              className={`menu-choice ${active ? "active" : ""}`}
              key={item.id}
              onClick={() => handleMenuSelection(item.id)}
              type="button"
            >
              <strong>{item.name}</strong>
              <span>{new Intl.NumberFormat("ja-JP").format(item.price)}円</span>
            </button>
          );
        })}
      </div>

      <SectionTitle subtitle="Parts" title="入っていた部位" />
      <Card>
        <p className="helper-text">
          {selectedMenuItem
            ? `${selectedMenuItem.name} の標準部位を自動で選択しています。実際に入っていた内容に合わせて修正してください。`
            : "メニューを選ぶと、標準の部位セットを自動で入力します。"}
        </p>
        <p className="helper-text">トビコなど部位以外の具材は、この部位図鑑の自動選択には含めていません。</p>
      </Card>
      <div className="parts-grid">
        {snapshot.parts.map((part) => {
          const selected = selectedPartIds.has(part.id);
          return (
            <button
              className={`part-cell ${selected ? "selected" : ""}`}
              key={part.id}
              onClick={() => togglePart(part.id)}
              style={{ borderColor: selected ? part.color : undefined }}
              type="button"
            >
              <span className="part-check">✓</span>
              <div className="part-name">{part.name}</div>
              <div className="part-area">{part.area}</div>
              <div className="part-rarity">{"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}</div>
            </button>
          );
        })}
      </div>

      <input
        className="memo-input"
        maxLength={120}
        onChange={(event) => setMemo(event.target.value)}
        placeholder='感想を書く…「脳天とろけた！」'
        type="text"
        value={memo}
      />
      {submitError ? (
        <Card>
          <p className="helper-text">{submitError}</p>
        </Card>
      ) : null}
      <button className="button-primary" disabled={!selectedMenuItemId || submitting} onClick={handleSubmit} type="button">
        {!selectedMenuItemId ? "メニューを選んでください" : submitting ? "保存中..." : "この内容で記録する"}
      </button>
      <ShareModalDynamic onClose={() => setSharePayload(null)} onShareBonus={handleShareBonus} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
