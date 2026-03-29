"use client";

import { useRef, useState } from "react";

import { createLineShareUrl, createXShareUrl, type ShareChannel, type SharePayload } from "@/lib/share/share";
import { ShareCanvas } from "@/components/share/ShareCanvas";

export function ShareModal({
  payload,
  open,
  onClose,
  onShareBonus,
}: {
  payload: SharePayload | null;
  open: boolean;
  onClose: () => void;
  onShareBonus?: (payload: SharePayload, channel: ShareChannel) => Promise<void>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [sharingChannel, setSharingChannel] = useState<ShareChannel | null>(null);

  if (!open || !payload) {
    return null;
  }

  const currentPayload = payload;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(currentPayload.text);
      window.alert("テキストをコピーしました");
    } catch {
      window.alert("コピーに失敗しました");
    }
  }

  async function handleInstagram() {
    const tags = "#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ";
    try {
      await navigator.clipboard.writeText(tags);
      window.alert("画像を保存して Instagram に投稿してください。\nハッシュタグをコピーしました。");
    } catch {
      window.alert(`画像を保存して Instagram に投稿してください。\n${tags}`);
    }
  }

  function saveImage() {
    const canvas = wrapperRef.current?.querySelector("canvas");
    if (!canvas) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.download = "maguromaru-note-share.png";
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }

  async function handleShare(channel: ShareChannel, action: () => void | Promise<void>) {
    try {
      setSharingChannel(channel);
      if (onShareBonus && currentPayload.bonusTarget) {
        await onShareBonus(currentPayload, channel);
      }
      await action();
    } finally {
      setSharingChannel(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()} ref={wrapperRef}>
        <h3 className="modal-title">{payload.title}</h3>
        <ShareCanvas payload={currentPayload} />
        {currentPayload.bonusTarget ? (
          <p className="helper-text">
            {currentPayload.bonusTarget.bonusLabel} ボーナスは各記録・各クイズ結果につき1回までです。
            {currentPayload.bonusTarget.alreadyClaimed ? " この項目のボーナスは受取済みです。" : ""}
          </p>
        ) : null}
        <div className="share-actions">
          <button
            className="share-button"
            disabled={sharingChannel !== null}
            onClick={() =>
              void handleShare("x", () => {
                window.open(createXShareUrl(currentPayload.text), "_blank", "noopener,noreferrer");
              })
            }
            type="button"
          >
            {sharingChannel === "x" ? "処理中..." : "X"}
          </button>
          <button
            className="share-button"
            disabled={sharingChannel !== null}
            onClick={() =>
              void handleShare("line", () => {
                window.open(createLineShareUrl(currentPayload.text), "_blank", "noopener,noreferrer");
              })
            }
            type="button"
          >
            {sharingChannel === "line" ? "処理中..." : "LINE"}
          </button>
          <button
            className="share-button"
            disabled={sharingChannel !== null}
            onClick={() => void handleShare("instagram", handleInstagram)}
            type="button"
          >
            {sharingChannel === "instagram" ? "処理中..." : "Instagram"}
          </button>
        </div>
        <div className="share-actions share-actions-row2">
          <button className="share-button" onClick={copyText} type="button">
            テキストをコピー
          </button>
          <button className="share-button" onClick={saveImage} type="button">
            画像を保存
          </button>
        </div>
        <button className="button-outline" onClick={onClose} type="button">
          閉じる
        </button>
      </div>
    </div>
  );
}
