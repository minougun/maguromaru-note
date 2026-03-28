import type { Database } from "@/lib/database.types";

export type PartId = Database["public"]["Tables"]["parts"]["Row"]["id"];
export type MenuItemId = Database["public"]["Tables"]["menu_items"]["Row"]["id"];
export type TitleId = Database["public"]["Tables"]["titles"]["Row"]["id"];
export type MenuStatusValue = Database["public"]["Tables"]["menu_status"]["Row"]["status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Part = Database["public"]["Tables"]["parts"]["Row"];
export type VisitLog = Database["public"]["Tables"]["visit_logs"]["Row"];
export type VisitLogPart = Database["public"]["Tables"]["visit_log_parts"]["Row"];
export type Title = Database["public"]["Tables"]["titles"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuStatusRow = Database["public"]["Tables"]["menu_status"]["Row"];

export interface VisitRecord {
  id: string;
  visitedAt: string;
  memo: string | null;
  photoUrl: string | null;
  parts: Part[];
  createdAt: string;
}

export interface MenuStatusEntry {
  menuItem: MenuItem;
  status: MenuStatusValue;
  updatedAt: string;
}

export interface HomePageData {
  menuStatus: MenuStatusEntry[];
  recentLogs: VisitRecord[];
}

export interface ZukanSummary {
  collectedCount: number;
  totalCount: number;
  collectedPartIds: PartId[];
}

export interface MyPageSummary {
  visitCount: number;
  collectedCount: number;
  streakWeeks: number;
  currentTitle: Title;
  titles: Array<
    Title & {
      unlocked: boolean;
      current: boolean;
    }
  >;
}

export interface ViewerContext {
  userId: string;
  role: "user" | "staff";
  isMock: boolean;
}

export interface AppSnapshot {
  parts: Part[];
  titles: Title[];
  menuItems: MenuItem[];
  home: HomePageData;
  zukan: ZukanSummary;
  myPage: MyPageSummary;
}
