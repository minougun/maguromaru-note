import type { Title, VisitLog } from "@/lib/domain/types";

export function formatDisplayDate(input: string) {
  const date = new Date(`${input}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
}

function getIsoWeekKey(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);

  return `${target.getUTCFullYear()}-${week}`;
}

export function calculateVisitStreakWeeks(visitLogs: VisitLog[]) {
  if (visitLogs.length === 0) {
    return 0;
  }

  const uniqueWeeks = [...new Set(visitLogs.map((log) => getIsoWeekKey(log.visited_at)))];
  const weekDates = uniqueWeeks.map((weekKey) => {
    const [year, week] = weekKey.split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, 0, 4));
    const firstDayNr = (firstDay.getUTCDay() + 6) % 7;
    firstDay.setUTCDate(firstDay.getUTCDate() - firstDayNr + 1 + (week - 1) * 7);
    return firstDay.getTime();
  });

  weekDates.sort((a, b) => b - a);

  let streak = 1;
  for (let index = 1; index < weekDates.length; index += 1) {
    if (weekDates[index - 1] - weekDates[index] === 604800000) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

export function resolveCurrentTitle(titles: Title[], visitCount: number) {
  const unlocked = titles
    .filter((title) => visitCount >= title.required_visits)
    .sort((left, right) => left.sort_order - right.sort_order);

  return unlocked.at(-1) ?? titles[0];
}
