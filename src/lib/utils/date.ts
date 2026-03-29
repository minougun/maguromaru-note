export function formatDisplayDate(input: string) {
  const date = new Date(`${input}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
}
