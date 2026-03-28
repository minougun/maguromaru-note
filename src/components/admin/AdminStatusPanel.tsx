"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { MenuStatusEntry, MenuStatusValue } from "@/lib/domain/types";

const statuses: MenuStatusValue[] = ["available", "few", "soldout"];

export function AdminStatusPanel({
  entries,
  onUpdated,
}: {
  entries: MenuStatusEntry[];
  onUpdated: () => void | Promise<void>;
}) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(menuItemId: string, status: MenuStatusValue) {
    setSubmittingId(menuItemId);
    setMessage(null);

    const response = await fetch("/api/menu-status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId, status }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "更新に失敗しました。");
      setSubmittingId(null);
      return;
    }

    await onUpdated();
    setSubmittingId(null);
    setMessage("在庫状況を更新しました。");
  }

  return (
    <Card>
      {entries.map((entry) => (
        <div className="admin-row" key={entry.menuItem.id}>
          <div style={{ flex: 1 }}>
            <div className="menu-name">{entry.menuItem.name}</div>
            <div className="helper-text">現在: <StatusBadge status={entry.status} /></div>
          </div>
          <div className="admin-actions">
            {statuses.map((status) => (
              <button
                className="button-choice"
                data-active={entry.status === status}
                disabled={submittingId === entry.menuItem.id}
                key={status}
                onClick={() => updateStatus(entry.menuItem.id, status)}
                type="button"
              >
                {status === "available" ? "あり" : status === "few" ? "残りわずか" : "終了"}
              </button>
            ))}
          </div>
        </div>
      ))}
      {message ? <p className="helper-text" style={{ marginTop: 10 }}>{message}</p> : null}
    </Card>
  );
}
