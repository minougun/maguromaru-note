import type { MenuStatusValue } from "@/lib/domain/types";

export function getStatusBadgeLabel(status: MenuStatusValue) {
  switch (status) {
    case "available":
      return "◎ あり";
    case "few":
      return "△ 残りわずか";
    case "soldout":
      return "✕ 終了";
  }
}
