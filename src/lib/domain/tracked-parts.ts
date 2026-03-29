import { trackedPartIds } from "@/lib/domain/constants";
import type { Part, PartId } from "@/lib/domain/types";

const trackedPartIdSet = new Set<string>(trackedPartIds);

export function isTrackedPartId(partId: string): partId is PartId {
  return trackedPartIdSet.has(partId);
}

export function filterTrackedParts(parts: Part[]) {
  return parts.filter((part) => trackedPartIdSet.has(part.id));
}
