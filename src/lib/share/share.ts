import type { MenuStatusEntry, MyPageSummary, Part, VisitRecord } from "@/lib/domain/types";

export type ShareKind = "record" | "log" | "zukan" | "title";

export interface SharePayload {
  kind: ShareKind;
  title: string;
  text: string;
}

function joinPartNames(parts: Part[]) {
  return parts.map((part) => part.name).join("・");
}

function hasRarePart(parts: Part[]) {
  return parts.some((part) => part.rarity === 3);
}

export function buildRecordShare(parts: Part[]) {
  const names = joinPartNames(parts);
  return {
    kind: "record" as const,
    title: "記録をシェア",
    text: `今日のまぐろ丼🐟\n${names}の${parts.length}部位入り！${hasRarePart(parts) ? "🎉希少部位ゲット！" : ""}\n\n#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ`,
  };
}

export function buildPastLogShare(visitRecord: VisitRecord) {
  return {
    kind: "log" as const,
    title: "過去ログをシェア",
    text: `${visitRecord.visitedAt}のまぐろ丼🐟\n${joinPartNames(visitRecord.parts)}の${visitRecord.parts.length}部位！${hasRarePart(visitRecord.parts) ? "🎉希少部位ゲット！" : ""}\n${visitRecord.memo ?? ""}\n\n#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ`,
  };
}

export function buildZukanShare(collectedParts: Part[], totalCount: number) {
  const percent = Math.round((collectedParts.length / Math.max(totalCount, 1)) * 100);
  return {
    kind: "zukan" as const,
    title: "図鑑進捗をシェア",
    text: `まぐろ図鑑 ${percent}% 達成！🐟\n${collectedParts.length}/${totalCount}部位コンプリート\n食べた部位: ${joinPartNames(collectedParts)}\n\n#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ`,
  };
}

export function buildTitleShare(summary: MyPageSummary) {
  return {
    kind: "title" as const,
    title: "称号をシェア",
    text: `称号「${summary.currentTitle.name}」${summary.currentTitle.icon} を獲得！\n来店${summary.visitCount}回・${summary.collectedCount}部位コンプ\n\n#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ`,
  };
}

export function createXShareUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function createLineShareUrl(text: string) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

export function latestUpdatedAt(menuStatus: MenuStatusEntry[]) {
  return menuStatus.reduce((latest, entry) => {
    if (!latest || entry.updatedAt > latest) {
      return entry.updatedAt;
    }
    return latest;
  }, "" as string);
}
