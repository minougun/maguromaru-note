"use client";

import Image from "next/image";
import { useState } from "react";

import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { PartId } from "@/lib/domain/types";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildRecordShare, type SharePayload } from "@/lib/share/share";
import { resizeImageToDataUrl } from "@/lib/utils/image";

function todayString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  });
  return formatter.format(now);
}

export function RecordScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [selectedPartIds, setSelectedPartIds] = useState<Set<PartId>>(new Set());
  const [memo, setMemo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  const selectedParts = snapshot ? snapshot.parts.filter((part) => selectedPartIds.has(part.id)) : [];

  if (loading) {
    return <ScreenState description="部位マスタを読み込んでいます。" title="読み込み中" />;
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
    setPhotoDataUrl(dataUrl);
    setPreviewUrl(dataUrl);
  }

  async function handleSubmit() {
    if (selectedParts.length === 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const response = await fetch("/api/visit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitedAt: todayString(),
        partIds: selectedParts.map((part) => part.id),
        memo,
        photoDataUrl,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSubmitError(payload?.error ?? "記録に失敗しました。");
      setSubmitting(false);
      return;
    }

    const nextSharePayload = buildRecordShare(selectedParts);
    setSelectedPartIds(new Set());
    setMemo("");
    setPhotoDataUrl(null);
    setPreviewUrl(null);
    setSubmitting(false);
    await refresh();
    setSharePayload(nextSharePayload);
  }

  return (
    <>
      <NorenBanner label="今日の丼を記録" />
      <label className={`photo-zone ${previewUrl ? "has-img" : ""}`} htmlFor="don-photo">
        <input accept="image/*" capture="environment" hidden id="don-photo" onChange={handleFileChange} type="file" />
        {previewUrl ? (
          <Image alt="丼のプレビュー" height={220} src={previewUrl} unoptimized width={360} />
        ) : (
          <span className="photo-hint">
            タップでカメラ / ギャラリー
            <br />
            <small>長辺1200px、JPEG品質80%に縮小して送信</small>
          </span>
        )}
      </label>
      <SectionTitle subtitle="Parts in your bowl" title="入っていた部位" />
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
      <button className="button-primary" disabled={selectedParts.length === 0 || submitting} onClick={handleSubmit} type="button">
        {selectedParts.length === 0 ? "部位を選んでください" : `${selectedParts.length}部位を記録する`}
      </button>
      <ShareModal onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
