"use client";

import type { PartDetailProfile } from "@/lib/domain/types";

function formatFirstCollectedAt(date: string | null) {
  if (!date) {
    return "まだ未達成です";
  }

  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${year}/${month}/${day}`;
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }
  return `${year.slice(2)}/${month}/${day}`;
}

export function PartDetailProfileBlock({ profile }: { profile: PartDetailProfile | undefined }) {
  if (!profile) {
    return null;
  }

  return (
    <div className="part-profile-block">
      <p className="part-profile-title">部位メモ</p>
      <dl className="part-profile-grid">
        <div className="part-profile-item">
          <dt>希少性</dt>
          <dd>
            <strong>{profile.rarityLabel}</strong>
            <span>{profile.rarityMemo}</span>
          </dd>
        </div>
        <div className="part-profile-item">
          <dt>食感メモ</dt>
          <dd>{profile.textureMemo}</dd>
        </div>
        <div className="part-profile-item">
          <dt>脂感メモ</dt>
          <dd>{profile.fatMemo}</dd>
        </div>
        <div className="part-profile-item">
          <dt>自分の初達成日</dt>
          <dd>{formatFirstCollectedAt(profile.firstCollectedAt)}</dd>
        </div>
        <div className="part-profile-item">
          <dt>あなたの主観記録</dt>
          <dd>
            {profile.subjectiveSummary.tastingCount > 0 ? (
              <>
                <strong>{profile.subjectiveSummary.tastingCount}回ぶんの感想</strong>
                <span>
                  脂感: {profile.subjectiveSummary.dominantFatLevelLabel ?? "未集計"} / 食感:{" "}
                  {profile.subjectiveSummary.dominantTextureLabel ?? "未集計"}
                </span>
                <span>
                  満足度平均: {profile.subjectiveSummary.averageSatisfaction?.toFixed(1) ?? "未集計"} / 5
                  {profile.subjectiveSummary.wantAgainRate != null
                    ? ` / また食べたい ${profile.subjectiveSummary.wantAgainRate}%`
                    : ""}
                </span>
              </>
            ) : (
              "まだ主観記録はありません"
            )}
          </dd>
        </div>
        <div className="part-profile-item">
          <dt>最近の主観記録</dt>
          <dd>
            {profile.recentTastings.length > 0 ? (
              <ul className="part-profile-history-list">
                {profile.recentTastings.map((entry) => (
                  <li className="part-profile-history-item" key={`${entry.visitedAt}-${entry.menuItemName}`}>
                    <div className="part-profile-history-head">
                      <strong>{formatShortDate(entry.visitedAt)}</strong>
                      <span>{entry.menuItemName}</span>
                    </div>
                    <div className="part-profile-history-meta">
                      脂感: {entry.fatLevelLabel ?? "未記録"} / 食感: {entry.textureLevelLabel ?? "未記録"}
                    </div>
                    <div className="part-profile-history-meta">
                      満足度: {entry.satisfaction != null ? `${entry.satisfaction}/5` : "未記録"} / また食べたい:{" "}
                      {entry.wantAgain == null ? "未記録" : entry.wantAgain ? "はい" : "いいえ"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              "主観記録をつけると、最近の好みの変化を見返せます。"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
