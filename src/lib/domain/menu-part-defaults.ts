import type { MenuItemId, PartId } from "@/lib/domain/types";

const defaultPartIdsByMenuItemId: Record<MenuItemId, PartId[]> = {
  maguro_don: ["akami"],
  maguro_don_mini: ["chutoro", "akami"],
  tokujo_don: ["noten", "hoho", "otoro", "meura", "akami"],
  tokujo_don_mini: ["akami", "chutoro", "otoro"],
};

export function getDefaultPartIdsForMenuItem(menuItemId: MenuItemId) {
  return [...defaultPartIdsByMenuItemId[menuItemId]];
}
