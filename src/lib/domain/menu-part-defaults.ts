import type { MenuItemId, PartId } from "@/lib/domain/types";

const defaultPartIdsByMenuItemId: Record<MenuItemId, PartId[]> = {
  maguro_don: ["akami", "chutoro", "hoho"],
  maguro_don_mini: ["akami", "chutoro", "hoho"],
  tokujo_don: ["noten", "hoho", "otoro", "meura", "akami"],
  tokujo_don_mini: ["noten", "hoho", "otoro", "meura", "akami"],
};

export function getDefaultPartIdsForMenuItem(menuItemId: MenuItemId) {
  return [...defaultPartIdsByMenuItemId[menuItemId]];
}
