import type { Part, Title, VisitRecord } from "@/lib/domain/types";

export type ShareKind = "record" | "log" | "zukan" | "quiz";
export type ShareChannel = "x" | "line" | "instagram";

export interface ShareBonusTarget {
  targetType: "visit_log" | "quiz_session";
  targetId: string;
  bonusLabel: string;
  alreadyClaimed?: boolean;
}

export interface SharePayload {
  kind: ShareKind;
  title: string;
  text: string;
  bonusTarget?: ShareBonusTarget;
}

function joinPartNames(parts: Part[]) {
  return parts.map((part) => part.name).join("・");
}

function rareTag(parts: Part[]) {
  return parts.some((part) => part.rarity === 3) ? " 🎉希少部位ゲット！" : "";
}

function partSummary(parts: Part[]) {
  return parts.length > 0 ? `${joinPartNames(parts)}の${parts.length}部位` : "部位メモなし";
}

export function buildRecordShare(record: VisitRecord) {
  return {
    kind: "record" as const,
    title: "記録をシェア",
    text:
      `今日の${record.menuItem.name}🐟\n` +
      `${partSummary(record.parts)}！${rareTag(record.parts)}\n\n` +
      "#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ",
    bonusTarget: {
      targetType: "visit_log" as const,
      targetId: record.id,
      bonusLabel: "この記録の来店回数が 1.2 倍で集計されます。",
      alreadyClaimed: record.shareBonusClaimed,
    },
  };
}

export function buildPastLogShare(visitRecord: VisitRecord) {
  const memoLine = visitRecord.memo ? `\n${visitRecord.memo}` : "";
  return {
    kind: "log" as const,
    title: "履歴をシェア",
    text:
      `${visitRecord.visitedAt}の${visitRecord.menuItem.name}🐟\n` +
      `${partSummary(visitRecord.parts)}！${rareTag(visitRecord.parts)}` +
      `${memoLine}\n\n` +
      "#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ",
    bonusTarget: {
      targetType: "visit_log" as const,
      targetId: visitRecord.id,
      bonusLabel: "この記録の来店回数が 1.2 倍で集計されます。",
      alreadyClaimed: visitRecord.shareBonusClaimed,
    },
  };
}

export function buildZukanShare(collectedParts: Part[], totalCount: number) {
  const percent = Math.round((collectedParts.length / Math.max(totalCount, 1)) * 100);
  const names = collectedParts.length > 0 ? joinPartNames(collectedParts) : "まだ記録なし";
  return {
    kind: "zukan" as const,
    title: "図鑑進捗をシェア",
    text:
      `まぐろ図鑑 ${percent}% 達成！🐟\n` +
      `${collectedParts.length}/${totalCount}部位コンプリート\n` +
      `食べた部位: ${names}\n\n` +
      "#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ",
  };
}

export function buildQuizResultShare(input: {
  sessionId: string;
  score: number;
  questionCount: number;
  currentTitle: Title | null;
}) {
  const percent = Math.round((input.score / Math.max(input.questionCount, 1)) * 100);
  const titleLine = input.currentTitle ? `現在の称号: ${input.currentTitle.icon} ${input.currentTitle.name}\n` : "";

  return {
    kind: "quiz" as const,
    title: "クイズ結果をシェア",
    text:
      `まぐろクイズで ${input.score}/${input.questionCount} 問正解！ (${percent}%)\n` +
      `${titleLine}` +
      "\n#まぐろ丸ノート #海鮮丼まぐろ丸 #本町グルメ",
    bonusTarget: {
      targetType: "quiz_session" as const,
      targetId: input.sessionId,
      bonusLabel: "このクイズ結果の正解数が 1.2 倍で集計されます。",
      alreadyClaimed: false,
    },
  };
}

export function createXShareUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function createLineShareUrl(text: string) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}
