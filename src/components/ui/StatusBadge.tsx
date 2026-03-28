import clsx from "clsx";

import type { MenuStatusValue } from "@/lib/domain/types";
import { getStatusBadgeLabel } from "@/lib/domain/menu-status";

export function StatusBadge({ status }: { status: MenuStatusValue }) {
  return <span className={clsx("badge", `badge-${status}`)}>{getStatusBadgeLabel(status)}</span>;
}
