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
import { APP_INFO } from "@/lib/domain/constants";
import { getDefaultPartIdsForMenuItem } from "@/lib/domain/menu-part-defaults";
import type { MenuItemId, PartId, VisitRecord } from "@/lib/domain/types";
import {
  DEFAULT_PART_TASTING_INPUT,
  PART_FAT_LEVEL_LABELS,
  PART_TEXTURE_LEVEL_LABELS,
  type PartTastingInput,
} from "@/lib/domain/part-tasting";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { mapDisplayColorForPart } from "@/lib/domain/part-brand-colors";
import { FetchJsonError, fetchJsonWithAuth } from "@/lib/http/fetch-json";
import { withAppBasePath } from "@/lib/public-path";
import { buildRecordShare, type SharePayload } from "@/lib/share/share";
import { formatCount } from "@/lib/utils/format";

function todayString() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

const RECORD_VISIT_REFRESH_SCOPES = ["record", "home", "history", "zukan", "mypage", "quiz"] as const;
const RECORD_SHARE_REFRESH_SCOPES = ["history", "mypage", "quiz"] as const;

function createPartTasting(partId: PartId): PartTastingInput {
  return {
    partId,
    ...DEFAULT_PART_TASTING_INPUT,
  };
}

export function RecordScreen() {
  const auth = useAuthState();
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<MenuItemId | null>(null);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<PartId>>(new Set());
  const [partTastings, setPartTastings] = useState<Record<PartId, PartTastingInput>>({} as Record<PartId, PartTastingInput>);
  const [showPartEditor, setShowPartEditor] = useState(false);
  const [showTastingNotes, setShowTastingNotes] = useState(false);
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
  const selectedParts = snapshot.parts.filter((part) => selectedPartIds.has(part.id));

  function togglePart(partId: PartId) {
    const next = new Set(selectedPartIds);
    const nextTastings = { ...partTastings };
    if (next.has(partId)) {
      next.delete(partId);
      delete nextTastings[partId];
    } else {
      next.add(partId);
    }
    setSelectedPartIds(next);
    setPartTastings(nextTastings);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const { resizeImageToDataUrl } = await import("@/lib/utils/image");
    const dataUrl = await resizeImageToDataUrl(file);
    setPreviewUrl(dataUrl);
    setPhotoDataUrl(dataUrl);
  }

  function handleMenuSelection(menuItemId: MenuItemId) {
    const defaultPartIds = getDefaultPartIdsForMenuItem(menuItemId).filter((partId) => availablePartIds.has(partId));
    const nextTastings = Object.fromEntries(
      defaultPartIds
        .map((partId) => {
          const tasting = partTastings[partId];
          return tasting ? [partId, tasting] : null;
        })
        .filter(Boolean)
        .map((entry) => entry as [PartId, PartTastingInput]),
    ) as Record<PartId, PartTastingInput>;

    setSelectedMenuItemId(menuItemId);
    setSelectedPartIds(new Set(defaultPartIds));
    setPartTastings(nextTastings);
    setShowPartEditor(false);
    setShowTastingNotes(false);
  }

  function updatePartTasting(partId: PartId, patch: Partial<Omit<PartTastingInput, "partId">>) {
    setPartTastings((current) => ({
      ...current,
      [partId]: {
        ...(current[partId] ?? createPartTasting(partId)),
        ...patch,
        partId,
      },
    }));
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
            partTastings: [...selectedPartIds].flatMap((partId) => (partTastings[partId] ? [partTastings[partId]!] : [])),
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
    setPartTastings({} as Record<PartId, PartTastingInput>);
    setShowPartEditor(false);
    setShowTastingNotes(false);
    setMemo("");
    setPreviewUrl(null);
    setPhotoDataUrl(null);
    setSubmitting(false);
    await refresh(RECORD_VISIT_REFRESH_SCOPES);
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

    await refresh(RECORD_SHARE_REFRESH_SCOPES);
    window.alert(`来店回数ボーナス +${formatCount(result?.bonusVisitCount ?? 0)}回 を反映しました。`);
  }

  return (
    <>
      <NorenBanner label={APP_INFO.recordTitle} />
      <ShareBonusCallout variant="visit" />
      <label className={`photo-zone ${previewUrl ? "has-img" : ""}`} htmlFor="don-photo">
        <input accept="image/*" capture="environment" hidden id="don-photo" onChange={handleFileChange} type="file" />
        {previewUrl ? (
          <Image alt="メニュー写真のプレビュー" height={220} src={previewUrl} unoptimized width={380} />
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

      <SectionTitle subtitle="Quick record" title="かんたん記録" />
      <Card className="record-assist-card">
        <p className="helper-text">
          {selectedMenuItem
            ? `${selectedMenuItem.name} の標準部位を自動でセットしました。わからなければ、このまま保存でOKです。`
            : "まずメニューを選ぶと、標準の部位セットを自動で入れます。"}
        </p>
        {selectedParts.length > 0 ? (
          <div className="record-assist-chip-row">
            {selectedParts.map((part) => (
              <span className="record-assist-chip" key={part.id}>
                {part.name}
              </span>
            ))}
          </div>
        ) : null}
        <p className="helper-text">薬味や海苔など部位以外の添え物は、自動セットに含めていません。</p>
        {selectedMenuItem ? (
          <div className="record-assist-actions">
            <button className="button-outline record-assist-button" onClick={() => setShowPartEditor((value) => !value)} type="button">
              {showPartEditor ? "部位調整を閉じる" : "部位を自分で調整する"}
            </button>
            <button
              className="button-outline record-assist-button"
              onClick={() => setShowTastingNotes((value) => !value)}
              type="button"
            >
              {showTastingNotes ? "主観メモを閉じる" : "味のメモも残す"}
            </button>
          </div>
        ) : null}
      </Card>

      {showPartEditor ? (
        <>
          <SectionTitle subtitle="Parts" title="入っていた部位を調整" />
          <div className="parts-grid">
            {snapshot.parts.map((part) => {
              const selected = selectedPartIds.has(part.id);
              return (
                <button
                  className={`part-cell ${selected ? "selected" : ""}`}
                  key={part.id}
                  onClick={() => togglePart(part.id)}
                  style={{ borderColor: selected ? mapDisplayColorForPart(part) : undefined }}
                  type="button"
                >
                  <span className="part-check">✓</span>
                  <div className="part-name">{part.name}</div>
                  <div className="part-area">{part.area}</div>
                  <div className="part-rarity">
                    レア度: {"★".repeat(part.rarity) + "☆".repeat(3 - part.rarity)}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {showTastingNotes && selectedParts.length > 0 ? (
        <>
          <SectionTitle subtitle="Tasting notes" title="部位ごとの主観記録" />
          <div className="part-tasting-stack">
            {selectedParts.map((part) => {
              const tasting = partTastings[part.id] ?? createPartTasting(part.id);
              return (
                <Card key={part.id}>
                  <div className="part-tasting-header">
                    <div className="part-name">{part.name}</div>
                    <div className="part-area">{part.area}</div>
                  </div>
                  <div className="part-tasting-group">
                    <div className="part-tasting-label">脂感</div>
                    <div className="part-tasting-options">
                      {Object.entries(PART_FAT_LEVEL_LABELS).map(([value, label]) => (
                        <button
                          className={`part-tasting-pill ${tasting.fatLevel === value ? "active" : ""}`}
                          key={value}
                          onClick={() => updatePartTasting(part.id, { fatLevel: value as PartTastingInput["fatLevel"] })}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="part-tasting-group">
                    <div className="part-tasting-label">食感</div>
                    <div className="part-tasting-options">
                      {Object.entries(PART_TEXTURE_LEVEL_LABELS).map(([value, label]) => (
                        <button
                          className={`part-tasting-pill ${tasting.textureLevel === value ? "active" : ""}`}
                          key={value}
                          onClick={() =>
                            updatePartTasting(part.id, { textureLevel: value as PartTastingInput["textureLevel"] })
                          }
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="part-tasting-group">
                    <div className="part-tasting-label">満足度</div>
                    <div className="part-tasting-options">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          className={`part-tasting-pill ${tasting.satisfaction === value ? "active" : ""}`}
                          key={value}
                          onClick={() => updatePartTasting(part.id, { satisfaction: value as PartTastingInput["satisfaction"] })}
                          type="button"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="part-tasting-checkbox">
                    <input
                      checked={tasting.wantAgain}
                      onChange={(event) => updatePartTasting(part.id, { wantAgain: event.target.checked })}
                      type="checkbox"
                    />
                    また食べたい
                  </label>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

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
